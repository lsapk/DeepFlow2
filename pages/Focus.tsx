import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput, ScrollView, Alert, AppState, AppStateStatus } from 'react-native';
import { Play, Pause, X, Clock, List, Plus, Save, Calendar } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { Task, FocusSession } from '../types';
import { addXp, REWARDS } from '../services/gamification';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.70, 280); 
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface FocusProps {
    onExit: () => void;
    tasks?: Task[];
    isDarkMode?: boolean;
}

const Focus: React.FC<FocusProps> = ({ onExit, tasks = [], isDarkMode = true }) => {
  const [viewMode, setViewMode] = useState<'CONFIG' | 'RUNNING' | 'HISTORY'>('CONFIG');
  
  const [isActive, setIsActive] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionTitle, setSessionTitle] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [history, setHistory] = useState<FocusSession[]>([]);
  
  // Background Timer State
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);

  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      text: isDarkMode ? '#FFF' : '#000',
      card: isDarkMode ? '#171717' : '#FFF',
      border: isDarkMode ? '#333' : '#DDD',
      subText: isDarkMode ? '#888' : '#666'
  };

  // Timer Effect & Background Handling
  useEffect(() => {
      let interval: any;

      const handleAppStateChange = (nextAppState: AppStateStatus) => {
          if (appState.current.match(/active/) && nextAppState === 'background') {
              // App goes to background: save timestamp
              if (isActive) {
                  backgroundTimestamp.current = Date.now();
              }
          }

          if (appState.current.match(/background/) && nextAppState === 'active') {
              // App comes to foreground: calculate elapsed time
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
      fetchHistory();
  }, []);

  const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('focus_sessions').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(20);
      if (data) setHistory(data);
  };

  const startSession = () => {
      setTimeLeft(durationMinutes * 60);
      setIsActive(true);
      setViewMode('RUNNING');
  };

  const completeSession = async () => {
      setIsActive(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const completionTime = new Date().toISOString(); // UTC format for DB
          
          await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: durationMinutes,
              completed_at: completionTime,
              session_type: 'focus',
              title: sessionTitle || 'Session Focus',
              linked_task_id: linkedTaskId
          });

          let xpAmount = REWARDS.FOCUS_SHORT;
          if (durationMinutes >= 45) xpAmount = REWARDS.FOCUS_DEEP;
          else if (durationMinutes >= 25) xpAmount = REWARDS.FOCUS_POMODORO;

          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single();
          if (player) {
              await addXp(user.id, xpAmount, player);
              Alert.alert("Focus Terminé", `Bravo ! +${xpAmount} XP`);
          }
          fetchHistory();
      }
      setViewMode('CONFIG');
      setSessionTitle('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (durationMinutes * 60));
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
             <TouchableOpacity onPress={onExit} style={styles.exitButton}>
                <X size={24} color="#FFF" />
             </TouchableOpacity>
             <View style={styles.modeTabs}>
                 <TouchableOpacity onPress={() => setViewMode('CONFIG')} style={[styles.tab, viewMode === 'CONFIG' && styles.activeTab]}>
                     <Play size={16} color={viewMode === 'CONFIG' ? '#000' : '#FFF'} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => setViewMode('HISTORY')} style={[styles.tab, viewMode === 'HISTORY' && styles.activeTab]}>
                     <List size={16} color={viewMode === 'HISTORY' ? '#000' : '#FFF'} />
                 </TouchableOpacity>
             </View>
        </View>

        {viewMode === 'CONFIG' && (
            <ScrollView contentContainerStyle={styles.configContainer}>
                <Text style={[styles.title, {color: colors.text}]}>Configurer la Session</Text>
                
                <Text style={styles.label}>TITRE</Text>
                <TextInput 
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                    placeholder="Titre..." 
                    placeholderTextColor={colors.subText}
                    value={sessionTitle}
                    onChangeText={setSessionTitle}
                />

                <Text style={styles.label}>DURÉE : {durationMinutes} min</Text>
                <View style={styles.presetsRow}>
                    {[15, 25, 45, 60].map(m => (
                        <TouchableOpacity 
                            key={m} 
                            onPress={() => setDurationMinutes(m)} 
                            style={[styles.presetBtn, { backgroundColor: colors.card, borderColor: colors.border }, durationMinutes === m && styles.presetBtnActive]}
                        >
                            <Text style={[styles.presetText, durationMinutes === m ? { color: '#000' } : { color: colors.text }]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.startBtn} onPress={startSession}>
                    <Play size={24} color="#000" fill="#000" />
                    <Text style={styles.startBtnText}>Lancer le Focus</Text>
                </TouchableOpacity>
            </ScrollView>
        )}

        {viewMode === 'RUNNING' && (
            <View style={styles.content}>
                <View style={styles.timerContainer}>
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                        <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE_WIDTH} fill="transparent" />
                        <Circle
                            cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                            stroke={isDarkMode ? "#FFF" : "#000"} strokeWidth={STROKE_WIDTH} fill="transparent"
                            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                        />
                    </Svg>
                    <View style={styles.timerTextContainer}>
                        <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
                        <Text style={[styles.statusText, { color: colors.subText }]}>{sessionTitle || 'Focus'}</Text>
                    </View>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={() => { setIsActive(false); setViewMode('CONFIG'); }} style={styles.controlBtnSecondary}>
                        <X size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsActive(!isActive)} style={styles.playBtn}>
                        {isActive ? <Pause size={32} color="black" fill="black" /> : <Play size={32} color="black" fill="black" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                </View>
            </View>
        )}

        {viewMode === 'HISTORY' && (
            <View style={styles.historyContainer}>
                <Text style={[styles.historyTitle, {color: colors.text}]}>Historique</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {history.map(session => {
                        const d = session.completed_at ? new Date(session.completed_at) : new Date();
                        // Format date nicely locally
                        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                            <View key={session.id} style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View>
                                    <Text style={[styles.hTitle, {color: colors.text}]}>{session.title || 'Session'}</Text>
                                    <Text style={[styles.hDate, {color: colors.subText}]}>{dateStr} à {timeStr}</Text>
                                </View>
                                <Text style={[styles.hDuration, {color: colors.text}]}>{session.duration}m</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exitButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
  },
  modeTabs: {
      flexDirection: 'row',
      backgroundColor: '#1C1C1E',
      borderRadius: 20,
      padding: 4,
  },
  tab: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 16,
  },
  activeTab: {
      backgroundColor: '#FFF',
  },
  title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 30,
  },
  configContainer: {
      paddingHorizontal: 24,
      paddingBottom: 50,
  },
  label: {
      fontSize: 12,
      color: '#888',
      fontWeight: '600',
      marginBottom: 10,
      marginTop: 20,
      textTransform: 'uppercase',
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
  },
  presetBtn: {
      width: 60,
      height: 50,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
  },
  presetBtnActive: {
      backgroundColor: '#FFF',
  },
  presetText: {
      fontWeight: '600',
  },
  startBtn: {
      backgroundColor: '#FFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      borderRadius: 16,
      marginTop: 40,
      gap: 12,
  },
  startBtnText: {
      color: '#000',
      fontSize: 18,
      fontWeight: '700',
  },
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
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
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
  historyContainer: {
      flex: 1,
      paddingHorizontal: 20,
  },
  historyTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 20,
  },
  historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
  },
  hTitle: {
      fontSize: 16,
      fontWeight: '600',
  },
  hDate: {
      fontSize: 12,
  },
  hDuration: {
      fontWeight: '700',
  },
});

export default Focus;