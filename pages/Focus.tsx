import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput, ScrollView, Alert, AppState, AppStateStatus, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Play, Pause, X, Clock, List, Plus, Save, Calendar, Menu, Timer, CheckCircle2 } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { Task, FocusSession } from '../types';
import { addXp, REWARDS } from '../services/gamification';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.70, 280); 
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface FocusProps {
    onExit: () => void;
    tasks?: Task[];
    isDarkMode?: boolean;
    openMenu?: () => void;
}

const Focus: React.FC<FocusProps> = ({ onExit, tasks = [], isDarkMode = true, openMenu }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'CONFIG' | 'RUNNING' | 'HISTORY' | 'MANUAL'>('CONFIG');
  
  // Timer State
  const [isActive, setIsActive] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [customDuration, setCustomDuration] = useState('');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  
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
  const backgroundTimestamp = useRef<number | null>(null);

  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      text: isDarkMode ? '#FFF' : '#000',
      card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      subText: isDarkMode ? '#8E8E93' : '#666',
      accent: '#007AFF',
      inputBg: isDarkMode ? '#1C1C1E' : '#FFFFFF'
  };

  // --- BACKGROUND HANDLING ---
  useEffect(() => {
      let interval: any;

      const handleAppStateChange = (nextAppState: AppStateStatus) => {
          if (appState.current.match(/active/) && nextAppState === 'background') {
              if (isActive) {
                  backgroundTimestamp.current = Date.now();
              }
          }

          if (appState.current.match(/background/) && nextAppState === 'active') {
              if (isActive && backgroundTimestamp.current) {
                  const now = Date.now();
                  const elapsedSeconds = Math.floor((now - backgroundTimestamp.current) / 1000);
                  setTimeLeft(prev => {
                      const newValue = prev - elapsedSeconds;
                      if (newValue <= 0) {
                          completeSession();
                          return 0;
                      }
                      return newValue;
                  });
              }
          }
          appState.current = nextAppState;
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      if (isActive && timeLeft > 0) {
          interval = setInterval(() => {
              setTimeLeft((prev) => {
                  if (prev <= 1) {
                      completeSession();
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      }

      return () => {
          if (interval) clearInterval(interval);
          subscription.remove();
      };
  }, [isActive, timeLeft]);

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
      
      const { data } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(30);
        
      if (data) {
          setHistory(data);
          // Simple client-side sum of loaded data for recent total
          // Ideally use a .sum() aggregate in supabase or rpc
          const total = data.reduce((acc, curr) => acc + (curr.duration || 0), 0);
          setTotalTime(total);
      }
  };

  const selectTask = (task: Task) => {
      setSelectedTaskId(task.id);
      if (!sessionTitle) {
          setSessionTitle(task.title);
      }
  };

  const startSession = () => {
      const d = customDuration ? parseInt(customDuration) : durationMinutes;
      if (isNaN(d) || d <= 0) {
          Alert.alert("Erreur", "Durée invalide");
          return;
      }
      setDurationMinutes(d);
      setTimeLeft(d * 60);
      setIsActive(true);
      changeView('RUNNING');
  };

  const completeSession = async () => {
      setIsActive(false);
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
          // Gérer le format de date manuel simple ou ISO
          let completedAt;
          try {
              completedAt = new Date(manualDate);
              if (isNaN(completedAt.getTime())) throw new Error();
          } catch(e) {
              completedAt = new Date();
          }
          
          const startedAt = new Date(completedAt.getTime() - duration * 60000);

          await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: duration,
              completed_at: completedAt.toISOString(),
              started_at: startedAt.toISOString(),
              title: manualTitle
          });

          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
          if (player) await addXp(user.id, Math.floor(duration / 2), player); 
          
          Alert.alert("Succès", "Session ajoutée.");
          changeView('HISTORY');
      }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (durationMinutes * 60));
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
        <View style={styles.timerContainer}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE_WIDTH} fill="transparent" />
                <Circle
                    cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                    stroke={colors.accent} strokeWidth={STROKE_WIDTH} fill="transparent"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
            </Svg>
            <View style={styles.timerTextContainer}>
                <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
                <Text style={[styles.statusText, { color: colors.subText }]}>{sessionTitle || 'Concentration'}</Text>
            </View>
        </View>

        <View style={styles.controls}>
            <TouchableOpacity onPress={() => { setIsActive(false); changeView('CONFIG'); }} style={styles.controlBtnSecondary}>
                <X size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsActive(!isActive)} style={styles.playBtn}>
                {isActive ? <Pause size={32} color="#000" fill="#000" /> : <Play size={32} color="#000" fill="#000" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
        </View>
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

          <Text style={[styles.label, {color: colors.subText}]}>DATE (YYYY-MM-DD)</Text>
          <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={manualDate}
              onChangeText={setManualDate}
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
                      dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  }
                  
                  return (
                      <View key={session.id} style={[styles.historyItem, { backgroundColor: colors.card }]}>
                          <View style={{flex: 1}}>
                              <Text style={[styles.hTitle, {color: colors.text}]}>{session.title || 'Session'}</Text>
                              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                <Calendar size={12} color={colors.subText} />
                                <Text style={[styles.hDate, {color: colors.subText}]}>{dateStr} à {timeStr}</Text>
                              </View>
                          </View>
                          <View style={[styles.hDurationBadge, {backgroundColor: colors.border}]}>
                              <Text style={[styles.hDuration, {color: colors.text}]}>{session.duration}m</Text>
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
            <TouchableOpacity onPress={openMenu} style={styles.menuBtn}>
                <Menu size={24} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer} pointerEvents="none">
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

        {viewMode === 'CONFIG' && renderConfig()}
        {viewMode === 'RUNNING' && renderRunning()}
        {viewMode === 'MANUAL' && renderManual()}
        {viewMode === 'HISTORY' && renderHistory()}
        
        {/* Floating cross removed */}
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
    marginBottom: 10,
    height: 60,
  },
  menuBtn: {
      padding: 8,
      zIndex: 50,
  },
  headerTitleContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
  },
  headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
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
      paddingBottom: 50,
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
    backgroundColor: '#333',
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