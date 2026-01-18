import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Modal, TextInput, ScrollView } from 'react-native';
import { Play, Pause, RotateCcw, X, Clock, CheckCircle, List, Plus, Save } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { Task, FocusSession } from '../types';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.70, 280); 
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface FocusProps {
    onExit: () => void;
    tasks?: Task[]; // To link sessions
}

const Focus: React.FC<FocusProps> = ({ onExit, tasks = [] }) => {
  // Modes: 'CONFIG' | 'RUNNING' | 'HISTORY'
  const [viewMode, setViewMode] = useState<'CONFIG' | 'RUNNING' | 'HISTORY'>('CONFIG');
  
  // Timer State
  const [isActive, setIsActive] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionTitle, setSessionTitle] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [manualModalVisible, setManualModalVisible] = useState(false);

  // Manual Form
  const [manualTitle, setManualTitle] = useState('');
  const [manualDuration, setManualDuration] = useState('25');

  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
        completeSession();
    }
    return () => clearInterval(interval);
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
          await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: durationMinutes,
              completed_at: new Date().toISOString(),
              session_type: 'focus',
              title: sessionTitle || 'Session Focus',
              linked_task_id: linkedTaskId
          });
          // Optionally mark linked task as done? We'll keep it manual for now.
          fetchHistory();
      }
      setViewMode('CONFIG'); 
      setSessionTitle(''); 
      setLinkedTaskId(null);
  };

  const addManualSession = async () => {
      const dur = parseInt(manualDuration) || 25;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: dur,
              completed_at: new Date().toISOString(),
              session_type: 'focus',
              title: manualTitle || 'Session Manuelle'
          });
          fetchHistory();
          setManualModalVisible(false);
          setManualTitle('');
      }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (durationMinutes * 60));
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.container}>
        <View style={styles.header}>
             <TouchableOpacity onPress={onExit} style={styles.exitButton}>
                <X size={24} color="white" />
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
            <View style={styles.configContainer}>
                <Text style={styles.title}>Configurer la Session</Text>
                
                <Text style={styles.label}>TITRE (Optionnel)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Ex: Lecture Deep Work" 
                    placeholderTextColor="#666" 
                    value={sessionTitle}
                    onChangeText={setSessionTitle}
                />

                <Text style={styles.label}>DURÉE : {durationMinutes} min</Text>
                <View style={styles.presetsRow}>
                    {[15, 25, 45, 60].map(m => (
                        <TouchableOpacity key={m} onPress={() => setDurationMinutes(m)} style={[styles.presetBtn, durationMinutes === m && styles.presetBtnActive]}>
                            <Text style={[styles.presetText, durationMinutes === m && { color: '#000' }]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>LIER TÂCHE (Optionnel)</Text>
                <ScrollView style={styles.taskPicker} horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={[styles.taskChip, !linkedTaskId && styles.taskChipActive]} 
                        onPress={() => setLinkedTaskId(null)}
                    >
                        <Text style={[styles.taskChipText, !linkedTaskId && {color: '#000'}]}>Aucune</Text>
                    </TouchableOpacity>
                    {tasks.filter(t => !t.completed).map(t => (
                        <TouchableOpacity 
                            key={t.id} 
                            style={[styles.taskChip, linkedTaskId === t.id && styles.taskChipActive]} 
                            onPress={() => setLinkedTaskId(t.id)}
                        >
                            <Text style={[styles.taskChipText, linkedTaskId === t.id && {color: '#000'}]}>{t.title}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity style={styles.startBtn} onPress={startSession}>
                    <Play size={24} color="#000" fill="#000" />
                    <Text style={styles.startBtnText}>Lancer le Focus</Text>
                </TouchableOpacity>
            </View>
        )}

        {viewMode === 'RUNNING' && (
            <View style={styles.content}>
                <View style={styles.timerContainer}>
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                        <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke="#1C1C1E" strokeWidth={STROKE_WIDTH} fill="transparent" />
                        <Circle
                            cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                            stroke="#FFF" strokeWidth={STROKE_WIDTH} fill="transparent"
                            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                        />
                    </Svg>
                    <View style={styles.timerTextContainer}>
                        <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
                        <Text style={styles.statusText}>{sessionTitle || 'Focus'}</Text>
                    </View>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={() => { setIsActive(false); setViewMode('CONFIG'); }} style={styles.controlBtnSecondary}>
                        <X size={24} color="#8E8E93" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsActive(!isActive)} style={styles.playBtn}>
                        {isActive ? <Pause size={32} color="black" fill="black" /> : <Play size={32} color="black" fill="black" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                </View>
            </View>
        )}

        {viewMode === 'HISTORY' && (
            <View style={styles.historyContainer}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>Historique Récent</Text>
                    <TouchableOpacity style={styles.addManualBtn} onPress={() => setManualModalVisible(true)}>
                        <Plus size={20} color="#000" />
                    </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {history.map(session => (
                        <View key={session.id} style={styles.historyItem}>
                            <View>
                                <Text style={styles.hTitle}>{session.title || 'Session Focus'}</Text>
                                <Text style={styles.hDate}>{new Date(session.completed_at).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.hBadge}>
                                <Clock size={12} color="#000" />
                                <Text style={styles.hDuration}>{session.duration}m</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        )}

        {/* MANUAL ENTRY MODAL */}
        <Modal visible={manualModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Ajout Manuel</Text>
                        <TouchableOpacity onPress={() => setManualModalVisible(false)}><X size={24} color="#FFF" /></TouchableOpacity>
                    </View>
                    <Text style={styles.label}>TITRE</Text>
                    <TextInput style={styles.input} value={manualTitle} onChangeText={setManualTitle} placeholder="Titre..." placeholderTextColor="#666" />
                    <Text style={styles.label}>DURÉE (min)</Text>
                    <TextInput style={styles.input} value={manualDuration} onChangeText={setManualDuration} keyboardType="numeric" placeholder="25" placeholderTextColor="#666" />
                    <TouchableOpacity style={styles.saveBtn} onPress={addManualSession}>
                        <Save size={20} color="#000" />
                        <Text style={styles.saveBtnText}>Enregistrer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
      color: '#FFF',
      marginBottom: 30,
  },
  configContainer: {
      paddingHorizontal: 24,
      flex: 1,
  },
  label: {
      fontSize: 12,
      color: '#666',
      fontWeight: '600',
      marginBottom: 10,
      marginTop: 20,
  },
  input: {
      backgroundColor: '#171717',
      borderRadius: 12,
      padding: 16,
      color: '#FFF',
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#333',
  },
  presetsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  presetBtn: {
      width: 60,
      height: 50,
      borderRadius: 10,
      backgroundColor: '#171717',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#333',
  },
  presetBtnActive: {
      backgroundColor: '#FFF',
  },
  presetText: {
      color: '#FFF',
      fontWeight: '600',
  },
  taskPicker: {
      flexDirection: 'row',
      maxHeight: 50,
  },
  taskChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#171717',
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: '#333',
  },
  taskChipActive: {
      backgroundColor: '#FFF',
  },
  taskChipText: {
      color: '#CCC',
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
  
  // Timer Running Styles
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  timerContainer: {
    position: 'relative',
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
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 8,
    color: '#888',
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
    backgroundColor: '#1C1C1E',
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

  // History Styles
  historyContainer: {
      flex: 1,
      paddingHorizontal: 20,
  },
  historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  historyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
  },
  addManualBtn: {
      backgroundColor: '#FFF',
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
  },
  historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#171717',
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#262626',
  },
  hTitle: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
  },
  hDate: {
      color: '#666',
      fontSize: 12,
  },
  hBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
  },
  hDuration: {
      color: '#000',
      fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
      backgroundColor: '#171717',
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: '#333',
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
  },
  saveBtn: {
      backgroundColor: '#FFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      marginTop: 20,
      gap: 10,
  },
  saveBtnText: {
      fontWeight: '700',
  }
});

export default Focus;