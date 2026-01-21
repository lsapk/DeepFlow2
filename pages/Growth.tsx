import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Switch, Alert } from 'react-native';
import { PlayerProfile, UserProfile, Task } from '../types';
import { Send, Menu, TrendingUp, Clock, BarChart2, PieChart, Activity, Mic, Zap, CheckCircle2 } from 'lucide-react-native';
import { generateActionableCoaching } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

interface GrowthProps {
  player: PlayerProfile;
  user: UserProfile;
  tasks: Task[]; 
  openMenu: () => void;
  openProfile: () => void;
  // Fonctions de callback pour les actions IA
  onAddTask: (title: string, priority: string) => void;
  onAddHabit: (title: string) => void;
  onAddGoal: (title: string) => void;
  onStartFocus: (minutes: number) => void;
}

const Growth: React.FC<GrowthProps> = ({ player, user, tasks, openMenu, openProfile, onAddTask, onAddHabit, onAddGoal, onStartFocus }) => {
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYTICS' | 'AI_COACH'>('OVERVIEW');

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: `Bonjour ${user.display_name?.split(' ')[0]}. Active le "Mode Création" pour que je gère tes tâches et focus directement.` }
  ]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // REAL Stats State
  const [weeklyFocusData, setWeeklyFocusData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [bestDay, setBestDay] = useState('N/A');
  const [taskCompletionRate, setTaskCompletionRate] = useState(0);
  const [tasksByPriority, setTasksByPriority] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
      fetchRealFocusStats();
      calculateRealTaskStats();
  }, [tasks]);

  const calculateRealTaskStats = () => {
      const total = tasks.length;
      if (total === 0) {
          setTaskCompletionRate(0);
          setTasksByPriority({ high: 0, medium: 0, low: 0 });
          return;
      }
      const completed = tasks.filter(t => t.completed).length;
      setTaskCompletionRate(Math.round((completed / total) * 100));

      setTasksByPriority({
          high: tasks.filter(t => t.priority === 'high' && !t.completed).length,
          medium: tasks.filter(t => t.priority === 'medium' && !t.completed).length,
          low: tasks.filter(t => t.priority === 'low' && !t.completed).length,
      });
  };

  const fetchRealFocusStats = async () => {
      // Fetch sessions for the last 7 days from Supabase
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessions } = await supabase
          .from('focus_sessions')
          .select('duration, completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', sevenDaysAgo.toISOString());

      if (sessions && sessions.length > 0) {
          const daysMap = new Array(7).fill(0);
          let total = 0;
          let maxDuration = 0;
          let bestDayIndex = 0;
          
          sessions.forEach(session => {
              const date = new Date(session.completed_at);
              const today = new Date();
              // Calculate difference in days from today (0 = today, 1 = yesterday...)
              const diffTime = Math.abs(today.setHours(0,0,0,0) - date.setHours(0,0,0,0));
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays >= 0 && diffDays < 7) {
                  // Map to array index (6 is today, 0 is 7 days ago) or reverse
                  // Let's visualize: Index 6 = Today, Index 5 = Yesterday...
                  daysMap[6 - diffDays] += session.duration;
              }
              total += session.duration;
          });

          // Find best day
          daysMap.forEach((val, idx) => {
              if (val > maxDuration) {
                  maxDuration = val;
                  bestDayIndex = idx;
              }
          });
          
          if (maxDuration > 0) {
              const d = new Date();
              d.setDate(d.getDate() - (6 - bestDayIndex));
              setBestDay(d.toLocaleDateString('fr-FR', { weekday: 'long' }));
          }

          setWeeklyFocusData(daysMap);
          setTotalFocusTime(total);
      } else {
          setTotalFocusTime(0);
          setBestDay('N/A');
          setWeeklyFocusData([0,0,0,0,0,0,0]);
      }
  };

  const handleVoiceInput = () => {
      if (isCreationMode) {
          // Simulation vocale : injecte du texte qui sera traité comme une commande
          setChatInput("Crée une tâche 'Préparer la réunion' en urgence");
      } else {
          Alert.alert("Info", "Le mode création doit être activé pour les commandes vocales.");
      }
  };

  const sendMessage = async () => {
      if (!chatInput.trim()) return;
      
      const userMsg = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setLoadingAi(true);
      
      const context = {
          name: user.display_name,
          pendingTasks: tasks.filter(t => !t.completed).length,
          completionRate: taskCompletionRate
      };

      const response = await generateActionableCoaching(userMsg, context, isCreationMode);
      
      // Execute Action if present
      if (response.action) {
          const { action, data } = response.action;
          
          try {
              if (action === 'CREATE_TASK') {
                  onAddTask(data.title, data.priority || 'medium');
                  setMessages(prev => [...prev, { role: 'ai', text: `✅ Action effectuée : Tâche "${data.title}" créée.` }]);
              } else if (action === 'CREATE_HABIT') {
                  onAddHabit(data.title);
                  setMessages(prev => [...prev, { role: 'ai', text: `✅ Action effectuée : Habitude "${data.title}" ajoutée.` }]);
              } else if (action === 'CREATE_GOAL') {
                  onAddGoal(data.title);
                  setMessages(prev => [...prev, { role: 'ai', text: `✅ Action effectuée : Objectif "${data.title}" défini.` }]);
              } else if (action === 'START_FOCUS') {
                  onStartFocus(data.minutes || 25);
                  // Message automatique handled par le changement de vue
              }
          } catch (e) {
              setMessages(prev => [...prev, { role: 'ai', text: "❌ J'ai compris l'action mais une erreur est survenue." }]);
          }
      } else {
          setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
      }

      setLoadingAi(false);
  };

  // --- RENDERERS ---

  const renderOverview = () => (
      <View style={{ gap: 16 }}>
          {/* Main KPI */}
          <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                  <Activity size={24} color="#C4B5FD" />
                  <Text style={styles.kpiValue}>{taskCompletionRate}%</Text>
                  <Text style={styles.kpiLabel}>Tâches Complétées</Text>
              </View>
              <View style={styles.kpiCard}>
                  <Clock size={24} color="#4ADE80" />
                  <Text style={styles.kpiValue}>{Math.floor(totalFocusTime / 60)}h</Text>
                  <Text style={styles.kpiLabel}>Focus Hebdo</Text>
              </View>
              <View style={styles.kpiCard}>
                  <TrendingUp size={24} color="#FACC15" />
                  <Text style={styles.kpiValue}>{player.level}</Text>
                  <Text style={styles.kpiLabel}>Niveau Actuel</Text>
              </View>
          </View>

          <View style={styles.insightBox}>
             <Text style={styles.insightTitle}>⚡ Analyse de Performance</Text>
             {bestDay !== 'N/A' ? (
                 <Text style={styles.insightText}>
                     Votre journée la plus productive est le <Text style={{fontWeight:'bold', color: '#FFF'}}>{bestDay}</Text>.
                     Utilisez ce jour pour vos tâches les plus complexes.
                 </Text>
             ) : (
                 <Text style={styles.insightText}>
                     Pas encore assez de données de focus pour analyser votre meilleure journée. Lancez une session !
                 </Text>
             )}
          </View>
      </View>
  );

  const renderAnalytics = () => {
    const maxVal = Math.max(...weeklyFocusData, 60); // Min scale 60m
    const dayLabels = [];
    for (let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayLabels.push(d.toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase());
    }

    return (
      <View style={{ gap: 20 }}>
          {/* Focus Chart (Real Data) */}
          <View style={styles.analysisCard}>
            <View style={styles.cardHeader}>
                <BarChart2 size={20} color="#C4B5FD" />
                <Text style={styles.cardTitle}>Temps de Focus (7 derniers jours)</Text>
            </View>
            <View style={styles.chartContainer}>
                {weeklyFocusData.map((val, idx) => {
                    const heightPct = (val / maxVal) * 100;
                    return (
                        <View key={idx} style={styles.barWrapper}>
                            <View style={[
                                styles.bar, 
                                { height: `${Math.max(heightPct, 5)}%`, backgroundColor: idx === 6 ? '#C4B5FD' : '#333' }
                            ]} />
                            <Text style={styles.dayLabel}>{dayLabels[idx]}</Text>
                        </View>
                    )
                })}
            </View>
          </View>

          {/* Priority Breakdown (Real Data) */}
          <View style={styles.analysisCard}>
            <View style={styles.cardHeader}>
                <PieChart size={20} color="#F87171" />
                <Text style={styles.cardTitle}>Charge de Travail par Priorité</Text>
            </View>
            <View style={styles.priorityBars}>
                <View style={styles.pBarRow}>
                    <Text style={[styles.pLabel, {color: '#EF4444'}]}>High</Text>
                    <View style={styles.pTrack}><View style={[styles.pFill, {width: `${Math.min(100, tasksByPriority.high * 10)}%`, backgroundColor: '#EF4444'}]} /></View>
                    <Text style={styles.pValue}>{tasksByPriority.high}</Text>
                </View>
                <View style={styles.pBarRow}>
                    <Text style={[styles.pLabel, {color: '#F59E0B'}]}>Medium</Text>
                    <View style={styles.pTrack}><View style={[styles.pFill, {width: `${Math.min(100, tasksByPriority.medium * 10)}%`, backgroundColor: '#F59E0B'}]} /></View>
                    <Text style={styles.pValue}>{tasksByPriority.medium}</Text>
                </View>
                <View style={styles.pBarRow}>
                    <Text style={[styles.pLabel, {color: '#3B82F6'}]}>Low</Text>
                    <View style={styles.pTrack}><View style={[styles.pFill, {width: `${Math.min(100, tasksByPriority.low * 10)}%`, backgroundColor: '#3B82F6'}]} /></View>
                    <Text style={styles.pValue}>{tasksByPriority.low}</Text>
                </View>
            </View>
          </View>
      </View>
    );
  };

  const renderAiCoach = () => (
      <View style={{ flex: 1 }}>
        <View style={styles.modeSwitchContainer}>
            <View>
                <Text style={[styles.modeLabel, isCreationMode && {color: '#4ADE80'}]}>Mode Création</Text>
                <Text style={styles.modeSub}>L'IA peut créer des tâches/focus</Text>
            </View>
            <Switch 
                value={isCreationMode} 
                onValueChange={setIsCreationMode}
                trackColor={{ false: "#333", true: "#4ADE80" }}
                thumbColor="#FFF"
            />
        </View>

        <ScrollView 
            style={styles.chatScroll}
            contentContainerStyle={{ paddingBottom: 20 }}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
            {messages.map((msg, index) => (
                <View key={index} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                    <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>{msg.text}</Text>
                </View>
            ))}
            {loadingAi && (
                <View style={[styles.messageBubble, styles.aiBubble, { width: 50 }]}>
                    <ActivityIndicator size="small" color="#FFF" />
                </View>
            )}
        </ScrollView>
        
        <View style={styles.inputArea}>
            <TouchableOpacity style={styles.voiceBtn} onPress={handleVoiceInput}>
                <Mic size={20} color={isCreationMode ? "#4ADE80" : "#FFF"} />
            </TouchableOpacity>
            <TextInput 
                style={styles.textInput}
                placeholder={isCreationMode ? "Ex: Crée une tâche..." : "Discuter avec le coach..."}
                placeholderTextColor="#666"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                <Send size={20} color="#FFF" />
            </TouchableOpacity>
        </View>
      </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
            <Menu size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Évolution</Text>
        <TouchableOpacity onPress={openProfile}>
            <Image 
                source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                style={styles.avatar} 
            />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabBar}>
          <TouchableOpacity onPress={() => setActiveTab('OVERVIEW')} style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.tabTextActive]}>Vue d'ensemble</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('ANALYTICS')} style={[styles.tabItem, activeTab === 'ANALYTICS' && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === 'ANALYTICS' && styles.tabTextActive]}>Analyses</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('AI_COACH')} style={[styles.tabItem, activeTab === 'AI_COACH' && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === 'AI_COACH' && styles.tabTextActive]}>Coach IA</Text>
          </TouchableOpacity>
      </View>

      {/* CONTENT AREA */}
      <View style={styles.contentArea}>
          {activeTab === 'OVERVIEW' && (
              <ScrollView contentContainerStyle={styles.scrollContent}>{renderOverview()}</ScrollView>
          )}
          {activeTab === 'ANALYTICS' && (
              <ScrollView contentContainerStyle={styles.scrollContent}>{renderAnalytics()}</ScrollView>
          )}
          {activeTab === 'AI_COACH' && renderAiCoach()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, 
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFF',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#171717',
  },
  tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#222',
      marginBottom: 10,
  },
  tabItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
  },
  tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: '#C4B5FD',
  },
  tabText: {
      color: '#666',
      fontWeight: '600',
      fontSize: 13,
  },
  tabTextActive: {
      color: '#FFF',
  },
  contentArea: {
      flex: 1,
  },
  scrollContent: {
      padding: 20,
      paddingBottom: 100,
  },
  
  // Overview
  kpiGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
  },
  kpiCard: {
      flex: 1,
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
      alignItems: 'center',
  },
  kpiValue: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
      marginVertical: 4,
  },
  kpiLabel: {
      color: '#888',
      fontSize: 11,
      textAlign: 'center',
  },
  insightBox: {
      backgroundColor: '#171717',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#FACC15',
  },
  insightTitle: {
      color: '#FACC15',
      fontWeight: '700',
      fontSize: 14,
      marginBottom: 4,
  },
  insightText: {
      color: '#CCC',
      fontSize: 14,
      lineHeight: 20,
  },

  // Analytics
  analysisCard: {
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
  },
  cardTitle: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 16,
  },
  chartContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 120,
      alignItems: 'flex-end',
  },
  barWrapper: {
      alignItems: 'center',
      flex: 1,
  },
  bar: {
      width: 8,
      borderRadius: 4,
      marginBottom: 6,
  },
  dayLabel: {
      color: '#666',
      fontSize: 10,
  },
  priorityBars: {
      gap: 12,
  },
  pBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  pLabel: {
      width: 50,
      fontSize: 12,
      fontWeight: '600',
  },
  pTrack: {
      flex: 1,
      height: 8,
      backgroundColor: '#333',
      borderRadius: 4,
      overflow: 'hidden',
  },
  pFill: {
      height: '100%',
  },
  pValue: {
      color: '#FFF',
      fontSize: 12,
      width: 20,
      textAlign: 'right',
  },

  // Chat
  modeSwitchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#222',
  },
  modeLabel: {
      color: '#DDD',
      fontSize: 14,
      fontWeight: '600',
  },
  modeSub: {
      color: '#666',
      fontSize: 12,
  },
  chatScroll: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
  },
  messageBubble: {
      padding: 12,
      borderRadius: 16,
      maxWidth: '80%',
      marginBottom: 12,
  },
  userBubble: {
      backgroundColor: '#007AFF',
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
  },
  aiBubble: {
      backgroundColor: '#262626',
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
  },
  userText: {
      color: '#FFF',
      fontSize: 15,
  },
  aiText: {
      color: '#EEE',
      fontSize: 15,
      lineHeight: 22,
  },
  inputArea: {
      padding: 16,
      backgroundColor: '#171717',
      borderTopWidth: 1,
      borderTopColor: '#333',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 65, 
  },
  voiceBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#333',
      alignItems: 'center',
      justifyContent: 'center',
  },
  textInput: {
      flex: 1,
      backgroundColor: '#000',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      color: '#FFF',
      fontSize: 16,
  },
  sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
  }
});

export default Growth;