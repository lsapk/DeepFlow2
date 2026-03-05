import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput, ScrollView, Alert, AppState, AppStateStatus, Platform, LayoutAnimation } from 'react-native';
import { Play, Pause, X, Clock, List, Plus, Save, Calendar, Menu, Timer, CheckCircle2, MoreHorizontal, History } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { Task, FocusSession, PenguinProfile } from '../types';
import { addXp, REWARDS } from '../services/gamification';
import { awardFood, getPenguinProfile } from '../services/penguin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playSuccess } from '../services/sound';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { addToQueue } from '../services/offline';
import PenguinAvatar from '../components/PenguinAvatar';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.75, 300); 
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
  useKeepAwake();

  const [viewMode, setViewMode] = useState<'CONFIG' | 'RUNNING' | 'HISTORY' | 'MANUAL'>('CONFIG');
  const [penguin, setPenguin] = useState<PenguinProfile | null>(null);
  
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
                  withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
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
      Notifications.requestPermissionsAsync();
      loadPenguin();
  }, []);

  const loadPenguin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const prof = await getPenguinProfile(user.id);
        setPenguin(prof);
    }
  };

  const checkActiveSession = async () => {
      try {
          const savedSession = await AsyncStorage.getItem('active_focus_session');
          if (savedSession) {
              const session = JSON.parse(savedSession);
              const now = Date.now();
              const remaining = Math.floor((session.endTime - now) / 1000);

              if (remaining > 0) {
                  setSessionTitle(session.title);
                  setSelectedTaskId(session.taskId);
                  setDurationMinutes(session.duration);
                  setEndTimeTimestamp(session.endTime);
                  setTimeLeft(remaining);
                  setIsActive(true);
                  setViewMode('RUNNING');
              } else {
                  handleOfflineCompletion(session);
              }
          }
      } catch (e) {
          console.error("Failed to restore session", e);
      }
  };

  const handleOfflineCompletion = async (session: any) => {
      await AsyncStorage.removeItem('active_focus_session');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const completedAt = new Date(session.endTime).toISOString();
          const startedAt = new Date(session.startTime).toISOString();
          
          const sessionPayload = {
              user_id: user.id,
              duration: session.duration,
              completed_at: completedAt,
              started_at: startedAt,
              title: session.title || 'Session Focus',
          };

          try {
              await supabase.from('focus_sessions').insert(sessionPayload);
              let xpAmount = REWARDS.FOCUS_SHORT;
              if (session.duration >= 45) xpAmount = REWARDS.FOCUS_DEEP;
              else if (session.duration >= 25) xpAmount = REWARDS.FOCUS_POMODORO;

              const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
              if (player) {
                  await addXp(user.id, xpAmount, player);
              }

              if (session.duration >= 60) {
                await awardFood(user.id, 'salmon', 1, 'Deep Work Focus (Background)');
              } else {
                await awardFood(user.id, 'shrimp', 1, 'Focus Session (Background)');
              }
          } catch (e) {
              addToQueue({ type: 'INSERT', table: 'focus_sessions', payload: sessionPayload });
          }
      }

      Alert.alert(
          "Focus Terminé", 
          "Votre session s'est terminée pendant votre absence. Bravo !",
          [{ text: "OK", onPress: () => changeView('HISTORY') }]
      );
      
      fetchHistory();
  };

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
      try {
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
      } catch (e) {
          console.log("Offline history fetch failed");
      }
  };

  const selectTask = (task: Task) => {
      setSelectedTaskId(task.id);
      if (!sessionTitle) {
          setSessionTitle(task.title);
      }
  };

  const scheduleNotifications = async (seconds: number) => {
      await Notifications.scheduleNotificationAsync({
          content: {
              title: "Session Terminée ! 🎉",
              body: "Bravo ! Il est temps de faire une pause.",
              sound: true,
              vibrate: [0, 250, 250, 250],
          },
          trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds,
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
      
      const sessionData = {
          title: sessionTitle,
          taskId: selectedTaskId,
          duration: d,
          endTime: endTimestamp,
          startTime: now
      };
      await AsyncStorage.setItem('active_focus_session', JSON.stringify(sessionData));
      await cancelNotifications();
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
      await cancelNotifications();
      playSuccess();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const now = new Date();
          const startedAt = new Date(now.getTime() - durationMinutes * 60000).toISOString();
          
          const sessionPayload = {
              user_id: user.id,
              duration: durationMinutes,
              completed_at: now.toISOString(),
              started_at: startedAt,
              title: sessionTitle || 'Session Focus',
          };

          try {
              await supabase.from('focus_sessions').insert(sessionPayload);
              let xpAmount = REWARDS.FOCUS_SHORT;
              if (durationMinutes >= 45) xpAmount = REWARDS.FOCUS_DEEP;
              else if (durationMinutes >= 25) xpAmount = REWARDS.FOCUS_POMODORO;

              const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
              if (player) {
                  await addXp(user.id, xpAmount, player);
                  Alert.alert("Focus Terminé", `Bravo ! +${xpAmount} XP`);
              }

              if (durationMinutes >= 60) {
                await awardFood(user.id, 'salmon', 1, 'Deep Work Focus');
              } else {
                await awardFood(user.id, 'shrimp', 1, 'Focus Session');
              }
          } catch (e) {
              addToQueue({ type: 'INSERT', table: 'focus_sessions', payload: sessionPayload });
              Alert.alert("Terminé (Hors Ligne)", "Session sauvegardée localement.");
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

          const sessionPayload = {
              user_id: user.id,
              duration: duration,
              completed_at: completedAt.toISOString(),
              started_at: startedAt.toISOString(),
              title: manualTitle
          };

          try {
              const { error } = await supabase.from('focus_sessions').insert(sessionPayload);
              if (error) throw error;

              const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
              if (player) await addXp(user.id, Math.floor(duration / 2), player); 
              Alert.alert("Succès", "Session ajoutée.");
          } catch (e) {
              addToQueue({ type: 'INSERT', table: 'focus_sessions', payload: sessionPayload });
              Alert.alert("Hors Ligne", "Session ajoutée à la file d'attente.");
          }
          
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
        
        {/* TIMER PREVIEW */}
        <View style={styles.timerPreview}>
            <Text style={[styles.previewTime, {color: colors.text}]}>
                {customDuration ? customDuration.padStart(2,'0') : durationMinutes.toString().padStart(2,'0')}:00
            </Text>
            <Text style={{color: colors.subText, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2}}>Prêt à commencer</Text>
        </View>

        {/* DURATION PILLS */}
        <View style={styles.section}>
            <Text style={[styles.label, {color: colors.subText}]}>DURÉE (MIN)</Text>
            <View style={styles.presetsRow}>
                {[15, 25, 45, 60].map(m => (
                    <TouchableOpacity 
                        key={m} 
                        onPress={() => { setDurationMinutes(m); setCustomDuration(''); }} 
                        style={[
                            styles.presetBtn, 
                            { backgroundColor: colors.card, borderColor: colors.border }, 
                            durationMinutes === m && !customDuration && { backgroundColor: colors.text, borderColor: colors.text }
                        ]}
                    >
                        <Text style={[
                            styles.presetText, 
                            { color: durationMinutes === m && !customDuration ? (isDarkMode ? '#000' : '#FFF') : colors.text }
                        ]}>
                            {m}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {/* TASK INPUT */}
        <View style={styles.section}>
            <Text style={[styles.label, {color: colors.subText}]}>OBJECTIF</Text>
            <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} 
                placeholder="Sur quoi travaillez-vous ?" 
                placeholderTextColor={colors.subText}
                value={sessionTitle}
                onChangeText={setSessionTitle}
            />
            {tasks.filter(t => !t.completed).length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskSelector}>
                    {tasks.filter(t => !t.completed).slice(0,5).map(task => (
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
            )}
        </View>

        {/* MAIN PLAY BUTTON */}
        <View style={styles.footerActions}>
            <TouchableOpacity style={styles.playButton} onPress={startSession}>
                <Play size={32} color="#FFF" fill="#FFF" style={{marginLeft: 4}} />
            </TouchableOpacity>
        </View>
    </ScrollView>
  );

  const renderRunning = () => (
    <View style={styles.content}>
        <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />
        
        <Animated.View style={[styles.timerContainer, animatedCircleStyle]}>
            <AnimatedSvg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke={"#1E293B"} strokeWidth={STROKE_WIDTH} fill="transparent" />
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
                {penguin && penguin.stage !== 'egg' && (
                    <View style={{ marginBottom: 10 }}>
                        <PenguinAvatar stage={penguin.stage} size={60} scene='fitness' />
                    </View>
                )}
                <Text style={[styles.timeText, { color: '#FFF' }]}>{formatTime(timeLeft)}</Text>
                <Text style={[styles.statusText, { color: '#94A3B8' }]}>{sessionTitle || 'Concentration'}</Text>
            </View>
        </Animated.View>

        <TouchableOpacity onPress={stopSession} style={styles.stopButton}>
            <X size={28} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={{color: '#64748B', marginTop: 40, fontSize: 12, opacity: 0.7, letterSpacing: 1}}>RESTEZ CONCENTRÉ</Text>
    </View>
  );

  const renderManual = () => (
      <ScrollView contentContainerStyle={styles.configScroll}>
          <Text style={[styles.title, {color: colors.text}]}>Ajout Manuel</Text>
          
          <Text style={[styles.label, {color: colors.subText}]}>QUOI ?</Text>
          <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={manualTitle}
              onChangeText={setManualTitle}
              placeholder="Ex: Lecture livre"
              placeholderTextColor={colors.subText}
          />

          <Text style={[styles.label, {color: colors.subText}]}>COMBIEN DE TEMPS (MIN) ?</Text>
          <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={manualDuration}
              onChangeText={setManualDuration}
              keyboardType="numeric"
          />

          <TouchableOpacity style={[styles.saveBtn, {backgroundColor: colors.accent}]} onPress={saveManualSession}>
              <Text style={styles.startBtnText}>Enregistrer la session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => changeView('CONFIG')} style={styles.backLink}>
            <Text style={{color: colors.subText}}>Annuler</Text>
          </TouchableOpacity>
      </ScrollView>
  );

  const renderHistory = () => (
      <View style={styles.historyContainer}>
          <View style={styles.historyHeaderRow}>
              <Text style={[styles.historyTitle, {color: colors.text}]}>Dernières Sessions</Text>
              <Text style={{color: colors.accent, fontWeight: '700'}}>{Math.floor(totalTime/60)}h {Math.floor(totalTime%60)}m</Text>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              {history.length === 0 && <Text style={{color: colors.subText, textAlign: 'center', marginTop: 40}}>Aucune session récente.</Text>}
              {history.map((session, index) => (
                  <View key={index} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.historyIcon, {backgroundColor: colors.card}]}>
                          <CheckCircle2 size={16} color={colors.accent} />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={[styles.hTitle, {color: colors.text}]}>{session.title || 'Focus'}</Text>
                          <Text style={[styles.hDate, {color: colors.subText}]}>
                              {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : '-'}
                          </Text>
                      </View>
                      <Text style={[styles.hDuration, {color: colors.text}]}>{session.duration} min</Text>
                  </View>
              ))}
          </ScrollView>
          <TouchableOpacity onPress={() => changeView('CONFIG')} style={styles.closeHistoryBtn}>
              <X size={24} color={colors.text} />
          </TouchableOpacity>
      </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        
        {/* Custom Header with Buttons moved here */}
        {viewMode !== 'RUNNING' && (
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.closeBtn}>
                    <X size={24} color={colors.subText} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, {color: colors.text}]}>
                    {viewMode === 'HISTORY' ? 'HISTORIQUE' : 'FOCUS MODE'}
                </Text>
                
                {/* Right Header Actions: Manual Add & History */}
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => changeView('MANUAL')} style={styles.iconBtn}>
                        <Plus size={24} color={colors.subText} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => changeView(viewMode === 'HISTORY' ? 'CONFIG' : 'HISTORY')} style={styles.iconBtn}>
                        {viewMode === 'HISTORY' ? <Timer size={24} color={colors.subText} /> : <History size={24} color={colors.subText} />}
                    </TouchableOpacity>
                </View>
            </View>
        )}

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
    paddingVertical: 10,
    marginBottom: 10,
  },
  headerTitle: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2,
  },
  headerActions: {
      flexDirection: 'row',
      gap: 15,
  },
  closeBtn: {
      padding: 4,
  },
  iconBtn: {
      padding: 4,
  },
  configScroll: {
      paddingHorizontal: 20,
      paddingBottom: 140,
  },
  timerPreview: {
      alignItems: 'center',
      marginVertical: 40,
  },
  previewTime: {
      fontSize: 80,
      fontWeight: '200',
      fontVariant: ['tabular-nums'],
      marginBottom: 10,
      includeFontPadding: false,
  },
  section: {
      marginBottom: 30,
  },
  label: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 12,
      letterSpacing: 1,
  },
  input: {
      borderRadius: 16,
      padding: 18,
      fontSize: 18,
      borderWidth: 1,
  },
  presetsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
  },
  presetBtn: {
      flex: 1,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
  },
  presetText: {
      fontWeight: '700',
      fontSize: 16,
  },
  taskSelector: {
      marginTop: 12,
      flexDirection: 'row',
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
  footerActions: {
      alignItems: 'center',
      marginTop: 20,
  },
  playButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: "#007AFF",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 10,
      marginBottom: 30,
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
    position: 'absolute',
  },
  timeText: {
    fontSize: 72,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
    opacity: 0.8,
  },
  stopButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255, 59, 48, 0.2)', // Semi-transparent red
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#FF3B30',
  },

  // Manual Mode
  title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 30,
  },
  saveBtn: {
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
  },
  startBtnText: {
      color: '#FFF',
      fontSize: 17,
      fontWeight: '700',
  },
  backLink: {
      alignItems: 'center',
      marginTop: 20,
      padding: 10,
  },

  // History Mode
  historyContainer: {
      flex: 1,
      paddingHorizontal: 20,
  },
  historyHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 10,
  },
  historyTitle: {
      fontSize: 20,
      fontWeight: '700',
  },
  historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
  },
  historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
  },
  hTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
  },
  hDate: {
      fontSize: 12,
  },
  hDuration: {
      fontWeight: '700',
      fontSize: 16,
  },
  closeHistoryBtn: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(128,128,128,0.2)',
  },
});

export default Focus;
