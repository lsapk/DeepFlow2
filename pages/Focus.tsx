
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput, ScrollView, Alert, AppState, AppStateStatus, Platform, LayoutAnimation } from 'react-native';
import { Play, Pause, X, Clock, List, Plus, Save, Calendar, Menu, Timer, CheckCircle2 } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { Task, FocusSession } from '../types';
import { addXp, REWARDS } from '../services/gamification';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.70, 280); 
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

interface FocusProps {
    onExit: () => void;
    tasks?: Task[];
    isDarkMode?: boolean;
    openMenu?: () => void;
}

const Focus: React.FC<FocusProps> = ({ onExit, tasks = [], isDarkMode = true, openMenu }) => {
  const insets = useSafeAreaInsets();
  useKeepAwake(); // Prevents screen from sleeping

  const [viewMode, setViewMode] = useState<'CONFIG' | 'RUNNING' | 'HISTORY' | 'MANUAL'>('CONFIG');
  
  // Timer State
  const [isActive, setIsActive] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [customDuration, setCustomDuration] = useState('');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [endTimeTimestamp, setEndTimeTimestamp] = useState<number | null>(null);
  
  // Session Details
  const [sessionTitle, setSessionTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Manual Entry State
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 16));
  const [manualDuration, setManualDuration] = useState('30');
  const [manualTitle, setManualTitle] = useState('');

  // History & Stats
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  // Background Timer State
  const appState = useRef(AppState.currentState);

  // Animation Values
  const pulse = useSharedValue(1);

  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      text: isDarkMode ? '#FFF' : '#000',
      card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      subText: isDarkMode ? '#8E8E93' : '#666',
      accent: '#007AFF',
      inputBg: isDarkMode ? '#1C1C1E' : '#FFFFFF'
  };

  // --- ANIMATION EFFECTS ---
  useEffect(() => {
      if (isActive) {
          pulse.value = withRepeat(
              withSequence(
                  withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                  withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
              ),
              -1,
              true
          );
      } else {
          pulse.value = withTiming(1, { duration: 500 });
      }
  }, [isActive]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pulse.value }]
  }));

  // --- RESTORE SESSION ON MOUNT ---
  useEffect(() => {
      checkActiveSession();
      // Demander la permission pour les notifs
      Notifications.requestPermissionsAsync();
  }, []);

  const checkActiveSession = async () => {
      try {
          const savedSession = await AsyncStorage.getItem('active_focus_session');
          if (savedSession) {
              const session = JSON.parse(savedSession);
              const now = Date.now();
              const remaining = Math.floor((session.endTime - now) / 1000);

              if (remaining > 0) {
                  // Session is still active
                  setSessionTitle(session.title);
                  setSelectedTaskId(session.taskId);
                  setDurationMinutes(session.duration);
                  setEndTimeTimestamp(session.endTime);
                  setTimeLeft(remaining);
                  setIsActive(true);
                  setViewMode('RUNNING');
              } else {
                  // Session finished while app was closed/backgrounded
                  // We treat this as a completed session
                  handleOfflineCompletion(session);
              }
          }
      } catch (e) {
          console.error("Failed to restore session", e);
      }
  };

  const handleOfflineCompletion = async (session: any) => {
      await AsyncStorage.removeItem('active_focus_session');
      
      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const completedAt = new Date(session.endTime).toISOString();
          const startedAt = new Date(session.startTime).toISOString();
          
          await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: session.duration,
              completed_at: completedAt,
              started_at: startedAt,
              title: session.title || 'Session Focus',
          });

          // Award XP
          let xpAmount = REWARDS.FOCUS_SHORT;
          if (session.duration >= 45) xpAmount = REWARDS.FOCUS_DEEP;
          else if (session.duration >= 25) xpAmount = REWARDS.FOCUS_POMODORO;

          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
          if (player) {
              await addXp(user.id, xpAmount, player);
          }
      }

      Alert.alert(
          "Focus Terminé", 
          "Votre session s'est terminée pendant votre absence. Bravo !",
          [{ text: "OK", onPress: () => changeView('HISTORY') }]
      );
      
      fetchHistory();
  };

  // --- BACKGROUND & TIMER HANDLING ---
  useEffect(() => {
      let interval: any;

      if (isActive && endTimeTimestamp) {
          interval = setInterval(() => {
              const now = Date.now();
              const secondsRemaining = Math.floor((endTimeTimestamp - now) / 1000);

              if (secondsRemaining <= 0) {
                  setTimeLeft(0);
                  clearInterval(interval);
                  completeSession();
              } else {
                  setTimeLeft(secondsRemaining);
              }
          }, 1000);
      }

      return () => {
          if (interval) clearInterval(interval);
      };
  }, [isActive, endTimeTimestamp]);

  useEffect(() => {
      if (viewMode === 'HISTORY') {
          fetchHistory();
      }
  }, [viewMode]);

  const changeView = (mode: 'CONFIG' | 'RUNNING' | 'HISTORY' | 'MANUAL') => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setViewMode(mode);
  }

  const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50);
        
      if (data) {
          const sortedData = data.sort((a, b) => {
              if (!a.completed_at && !b.completed_at) return 0;
              if (!a.completed_at) return 1;
              if (!b.completed_at) return -1;
              return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
          });

          setHistory(sortedData);
          const total = sortedData.reduce((acc, curr) => acc + (curr.duration || 0), 0);
          setTotalTime(total);
      }
  };

  const selectTask = (task: Task) => {
      setSelectedTaskId(task.id);
      if (!sessionTitle) {
          setSessionTitle(task.title);
      }
  };

  const playSuccessSound = async () => {
      try {
          const { sound } = await Audio.Sound.createAsync(
             { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' } 
          );
          await sound.playAsync();
      } catch (error) {
          console.log("Audio play error", error);
      }
  };

  const scheduleNotifications = async (seconds: number) => {
      // 1. Notif de démarrage
      const endDate = new Date(Date.now() + seconds * 1000);
      const endHours = endDate.getHours().toString().padStart(2, '0');
      const endMinutes = endDate.getMinutes().toString().padStart(2, '0');

      await Notifications.scheduleNotificationAsync({
          content: {
              title: "Focus en cours 🧠",
              body: `Session lancée. Fin prévue à ${endHours}:${endMinutes}.`,
              sound: false,
          },
          trigger: null, // Immédiat
      });

      // 2. Notif de fin
      await Notifications.scheduleNotificationAsync({
          content: {
              title: "Session Terminée ! 🎉",
              body: "Bravo ! Il est temps de faire une pause.",
              sound: true, // Son de notif par défaut
              vibrate: [0, 250, 250, 250],
          },
          trigger: {
              seconds: seconds,
          },
      });
  };

  const cancelNotifications = async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const startSession = async () => {
      const d = customDuration ? parseInt(customDuration) : durationMinutes;
      if (isNaN(d) || d <= 0) {
          Alert.alert("Erreur", "Durée invalide");
          return;
      }
      
      const now = Date.now();
      const endTimestamp = now + (d * 60 * 1000);
      
      // Persistence
      const sessionData = {
          title: sessionTitle,
          taskId: selectedTaskId,
          duration: d,
          endTime: endTimestamp,
          startTime: now
      };
      await AsyncStorage.setItem('active_focus_session', JSON.stringify(sessionData));

      // Notifications
      await scheduleNotifications(d * 60);

      setDurationMinutes(d);
      setEndTimeTimestamp(endTimestamp);
      setTimeLeft(d * 60);
      setIsActive(true);
      changeView('RUNNING');
  };

  const stopSession = async () => {
      setIsActive(false);
      setEndTimeTimestamp(null);
      await AsyncStorage.removeItem('active_focus_session');
      await cancelNotifications();
      changeView('CONFIG');
  };

  const completeSession = async () => {
      setIsActive(false);
      setEndTimeTimestamp(null);
      await AsyncStorage.removeItem('active_focus_session');
      
      // Audio et Haptique
      playSuccessSound();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const now = new Date();
          const startedAt = new Date(now.getTime() - durationMinutes * 60000).toISOString();
          
          await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: durationMinutes,
              completed_at: now.toISOString(),
              started_at: startedAt,
              title: sessionTitle || 'Session Focus',
          });

          let xpAmount = REWARDS.FOCUS_SHORT;
          if (durationMinutes >= 45) xpAmount = REWARDS.FOCUS_DEEP;
          else if (durationMinutes >= 25) xpAmount = REWARDS.FOCUS_POMODORO;

          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
          if (player) {
              await addXp(user.id, xpAmount, player);
              Alert.alert("Focus Terminé", `Bravo ! +${xpAmount} XP`);
          }
      }
      changeView('HISTORY');
      setSessionTitle('');
      setSelectedTaskId(null);
  };

  const saveManualSession = async () => {
      if (!manualTitle || !manualDuration) {
          Alert.alert("Erreur", "Remplissez le titre et la durée.");
          return;
      }
      
      const duration = parseInt(manualDuration);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && !isNaN(duration)) {
          let completedAt;
          try {
              completedAt = new Date(manualDate);
              if (isNaN(completedAt.getTime())) {
                  completedAt = new Date(); 
              }
          } catch(e) {
              completedAt = new Date();
          }
          
          const startedAt = new Date(completedAt.getTime() - duration * 60000);

          const { error } = await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: duration,
              completed_at: completedAt.toISOString(),
              started_at: startedAt.toISOString(),
              title: manualTitle
          });

          if (error) {
              Alert.alert("Erreur", "Impossible de sauvegarder : " + error.message);
              return;
          }

          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
          if (player) await addXp(user.id, Math.floor(duration / 2), player); 
          
          Alert.alert("Succès", "Session ajoutée.");
          changeView('HISTORY');
      }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = durationMinutes > 0 ? 1 - (timeLeft / (durationMinutes * 60)) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // --- RENDERERS ---

  const renderConfig = () => (
    <ScrollView contentContainerStyle={styles.configScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
            <Text style={[styles.label, {color: colors.subText}]}>QU'ALLEZ-VOUS ACCOMPLIR ?</Text>
            <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} 
                placeholder="Ex: Lecture approfondie, Code..." 
                placeholderTextColor={colors.subText}
                value={sessionTitle}
                onChangeText={setSessionTitle}
            />
        </View>

        <View style={styles.section}>
             <Text style={[styles.label, {color: colors.subText}]}>LIER À UNE TÂCHE (OPTIONNEL)</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskSelector}>
                 {tasks.filter(t => !t.completed).length === 0 && <Text style={{color: colors.subText}}>Aucune tâche disponible.</Text>}
                 {tasks.filter(t => !t.completed).map(task => (
                     <TouchableOpacity 
                        key={task.id} 
                        style={[
                            styles.taskChip, 
                            { backgroundColor: selectedTaskId === task.id ? colors.accent : colors.card, borderColor: colors.border }
                        ]}
                        onPress={() => selectTask(task)}
                     >
                         <Text style={[styles.taskChipText, { color: selectedTaskId === task.id ? '#FFF' : colors.text }]}>
                             {task.title.length > 20 ? task.title.substring(0,20)+'...' : task.title}
                         </Text>
                     </TouchableOpacity>
                 ))}
             </ScrollView>
        </View>

        <View style={styles.section}>
            <Text style={[styles.label, {color: colors.subText}]}>DURÉE (MINUTES)</Text>
            <View style={styles.presetsRow}>
                {[15, 25, 45, 60].map(m => (
                    <TouchableOpacity 
                        key={m} 
                        onPress={() => { setDurationMinutes(m); setCustomDuration(''); }} 
                        style={[
                            styles.presetBtn, 
                            { backgroundColor: colors.card, borderColor: colors.border }, 
                            durationMinutes === m && !customDuration && { backgroundColor: colors.accent, borderColor: colors.accent }
                        ]}
                    >
                        <Text style={[styles.presetText, { color: durationMinutes === m && !customDuration ? '#FFF' : colors.text }]}>{m}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput 
                style={[styles.input, { marginTop: 10, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder="Durée personnalisée (ex: 90)"
                placeholderTextColor={colors.subText}
                keyboardType="numeric"
                value={customDuration}
                onChangeText={(t) => { setCustomDuration(t); if(parseInt(t)) setDurationMinutes(parseInt(t)); }}
            />
        </View>

        <TouchableOpacity style={[styles.startBtn, {backgroundColor: colors.accent}]} onPress={startSession}>
            <Play size={24} color="#FFF" fill="#FFF" />
            <Text style={styles.startBtnText}>Démarrer le Focus</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => changeView('MANUAL')} style={styles.manualLink}>
            <Text style={{color: colors.subText, textDecorationLine: 'underline'}}>Ajouter une session passée manuellement</Text>
        </TouchableOpacity>
    </ScrollView>
  );

  const renderRunning = () => (
    <View style={styles.content}>
        <Animated.View style={[styles.timerContainer, animatedCircleStyle]}>
            <AnimatedSvg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE_WIDTH} fill="transparent" />
                <Circle
                    cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                    stroke={colors.accent} strokeWidth={STROKE_WIDTH} fill="transparent"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
            </AnimatedSvg>
            <View style={styles.timerTextContainer}>
                <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
                <Text style={[styles.statusText, { color: colors.subText }]}>{sessionTitle || 'Concentration'}</Text>
                {endTimeTimestamp && (
                    <Text style={{color: colors.subText, fontSize: 12, marginTop: 4}}>
                        Fin: {new Date(endTimeTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                )}
            </View>
        </Animated.View>

        <View style={styles.controls}>
            <TouchableOpacity onPress={stopSession} style={styles.controlBtnSecondary}>
                <X size={24} color="#FFF" />
            </TouchableOpacity>
            {/* Pause button removed because persisting paused state adds complexity, kept simple for MVP */}
            <View style={{width: 20}} />
        </View>
        <Text style={{color: colors.subText, marginTop: 20, fontSize: 12}}>L'app peut être mise en arrière-plan.</Text>
    </View>
  );

  const renderManual = () => (
      <ScrollView contentContainerStyle={styles.configScroll}>
          <Text style={[styles.title, {color: colors.text}]}>Ajout Manuel</Text>
          
          <Text style={[styles.label, {color: colors.subText}]}>TITRE</Text>
          <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={manualTitle}
              onChangeText={setManualTitle}
              placeholder="Ex: Lecture livre"
              placeholderTextColor={colors.subText}
          />

          <Text style={[styles.label, {color: colors.subText}]}>DURÉE (MIN)</Text>
          <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={manualDuration}
              onChangeText={setManualDuration}
              keyboardType="numeric"
          />

          <Text style={[styles.label, {color: colors.subText}]}>DATE (YYYY-MM-DDTHH:MM:SS)</Text>
          <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={manualDate}
              onChangeText={setManualDate}
              placeholder="Ex: 2024-03-20T14:00:00"
              placeholderTextColor={colors.subText}
          />

          <TouchableOpacity style={[styles.startBtn, {backgroundColor: colors.accent}]} onPress={saveManualSession}>
              <Save size={20} color="#FFF" />
              <Text style={styles.startBtnText}>Enregistrer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => changeView('CONFIG')} style={styles.manualLink}>
            <Text style={{color: colors.accent}}>Retour</Text>
          </TouchableOpacity>
      </ScrollView>
  );

  const renderHistory = () => (
      <View style={styles.historyContainer}>
          <View style={[styles.statsCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
              <View style={{alignItems: 'center'}}>
                  <Text style={[styles.statValue, {color: colors.text}]}>{history.length}</Text>
                  <Text style={[styles.statLabel, {color: colors.subText}]}>Sessions</Text>
              </View>
              <View style={[styles.divider, {backgroundColor: colors.border}]} />
              <View style={{alignItems: 'center'}}>
                  <Text style={[styles.statValue, {color: colors.text}]}>{Math.floor(totalTime)}m</Text>
                  <Text style={[styles.statLabel, {color: colors.subText}]}>Total Focus</Text>
              </View>
          </View>

          <Text style={[styles.historyTitle, {color: colors.text}]}>Historique Récent</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              {history.length === 0 && <Text style={{color: colors.subText, textAlign: 'center', marginTop: 20}}>Aucune session récente.</Text>}
              {history.map(session => {
                  let dateStr = 'Date inconnue';
                  let timeStr = '';
                  
                  if (session.completed_at) {
                      const d = new Date(session.completed_at);
                      // Affichage complet de la date et heure réelle
                      dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
                      timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  }
                  
                  return (
                      <View key={session.id} style={[styles.historyItem, { backgroundColor: colors.card }]}>
                          <View style={{flex: 1}}>
                              <Text style={[styles.hTitle, {color: colors.text}]}>{session.title || 'Session Focus'}</Text>
                              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                <Calendar size={12} color={colors.subText} />
                                <Text style={[styles.hDate, {color: colors.subText}]}>{dateStr} à {timeStr}</Text>
                              </View>
                          </View>
                          <View style={[styles.hDurationBadge, {backgroundColor: colors.border}]}>
                              <Text style={[styles.hDuration, {color: colors.text}]}>{session.duration} min</Text>
                          </View>
                      </View>
                  );
              })}
          </ScrollView>
      </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, {color: colors.text}]}>Mode Focus</Text>
            </View>

             <View style={[styles.modeTabs, {backgroundColor: isDarkMode ? '#1C1C1E' : '#E5E5EA'}]}>
                 <TouchableOpacity onPress={() => changeView('CONFIG')} style={[styles.tab, (viewMode === 'CONFIG' || viewMode === 'MANUAL') && {backgroundColor: colors.card}]}>
                     <Timer size={16} color={(viewMode === 'CONFIG' || viewMode === 'MANUAL') ? colors.text : colors.subText} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => changeView('HISTORY')} style={[styles.tab, viewMode === 'HISTORY' && {backgroundColor: colors.card}]}>
                     <List size={16} color={viewMode === 'HISTORY' ? colors.text : colors.subText} />
                 </TouchableOpacity>
             </View>
        </View>

        <TouchableOpacity onPress={onExit} style={styles.backButton}>
            <Text style={{color: colors.subText, fontSize: 14}}>Fermer</Text>
        </TouchableOpacity>

        {viewMode === 'CONFIG' && renderConfig()}
        {viewMode === 'RUNNING' && renderRunning()}
        {viewMode === 'MANUAL' && renderManual()}
        {viewMode === 'HISTORY' && renderHistory()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 0,
    height: 60,
  },
  backButton: {
      position: 'absolute',
      top: 20, 
      left: 20,
      zIndex: 10
  },
  headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 40, // Offset back button
  },
  headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'left',
  },
  modeTabs: {
      flexDirection: 'row',
      borderRadius: 12,
      padding: 4,
      zIndex: 50,
  },
  tab: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
  },
  title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 30,
  },
  configScroll: {
      paddingHorizontal: 20,
      paddingBottom: 150,
  },
  section: {
      marginBottom: 24,
  },
  label: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
      letterSpacing: 0.5,
  },
  input: {
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
  },
  presetsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
  },
  presetBtn: {
      flex: 1,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
  },
  presetText: {
      fontWeight: '600',
      fontSize: 16,
  },
  taskSelector: {
      flexDirection: 'row',
      paddingVertical: 4,
  },
  taskChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 10,
  },
  taskChipText: {
      fontWeight: '600',
      fontSize: 13,
  },
  startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      borderRadius: 16,
      marginTop: 20,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
  },
  startBtnText: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '700',
  },
  manualLink: {
      alignItems: 'center',
      marginTop: 20,
      padding: 10,
  },
  
  // Running Mode
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  svg: {
    position: 'absolute',
  },
  timerTextContainer: {
    alignItems: 'center',
    position: 'absolute', // Make text absolute to stay centered regardless of scale
  },
  timeText: {
    fontSize: 60,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  controlBtnSecondary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // History Mode
  historyContainer: {
      flex: 1,
      paddingHorizontal: 20,
  },
  statsCard: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 20,
  },
  divider: {
      width: 1,
      height: 40,
  },
  statValue: {
      fontSize: 20,
      fontWeight: '700',
  },
  statLabel: {
      fontSize: 12,
  },
  historyTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 16,
  },
  historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      marginBottom: 10,
  },
  hTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
  },
  hDate: {
      fontSize: 12,
  },
  hDurationBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
  },
  hDuration: {
      fontWeight: '700',
      fontSize: 14,
  },
});

export default Focus;
