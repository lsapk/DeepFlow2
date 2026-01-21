import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Switch, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { PlayerProfile, UserProfile, Task } from '../types';
import { Send, Menu, TrendingUp, Clock, BarChart2, PieChart, Activity, Mic, Zap } from 'lucide-react-native';
import { generateActionableCoaching } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

interface GrowthProps {
  player: PlayerProfile;
  user: UserProfile;
  tasks: Task[]; 
  openMenu: () => void;
  openProfile: () => void;
  onAddTask: (title: string, priority: string) => void;
  onAddHabit: (title: string) => void;
  onAddGoal: (title: string) => void;
  onStartFocus: (minutes: number) => void;
  isDarkMode?: boolean;
}

const Growth: React.FC<GrowthProps> = ({ player, user, tasks, openMenu, openProfile, onAddTask, onAddHabit, onAddGoal, onStartFocus, isDarkMode = true }) => {
  const insets = useSafeAreaInsets();
  
  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      card: isDarkMode ? '#171717' : '#FFF',
      text: isDarkMode ? '#FFF' : '#000',
      subText: isDarkMode ? '#CCC' : '#666',
      border: isDarkMode ? '#262626' : '#E5E5EA',
      inputBg: isDarkMode ? '#000' : '#F2F2F7'
  };

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYTICS' | 'AI_COACH'>('OVERVIEW');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: `Bonjour ${user.display_name?.split(' ')[0]}. Active le "Mode Création" pour que je gère tes tâches et focus directement.` }
  ]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Stats State... (Same as before)
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
              const diffTime = Math.abs(today.setHours(0,0,0,0) - date.setHours(0,0,0,0));
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays >= 0 && diffDays < 7) {
                  daysMap[6 - diffDays] += session.duration;
              }
              total += session.duration;
          });

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
          setChatInput("Crée une tâche 'Préparer la réunion' en urgence");
      } else {
          Alert.alert("Info", "Le mode création doit être activé.");
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
      
      if (response.action) {
          const { action, data } = response.action;
          try {
              if (action === 'CREATE_TASK') {
                  onAddTask(data.title, data.priority || 'medium');
                  setMessages(prev => [...prev, { role: 'ai', text: `✅ Action: Tâche "${data.title}" créée.` }]);
              } else if (action === 'CREATE_HABIT') {
                  onAddHabit(data.title);
                  setMessages(prev => [...prev, { role: 'ai', text: `✅ Action: Habitude "${data.title}" ajoutée.` }]);
              } else if (action === 'CREATE_GOAL') {
                  onAddGoal(data.title);
                  setMessages(prev => [...prev, { role: 'ai', text: `✅ Action: Objectif "${data.title}" défini.` }]);
              } else if (action === 'START_FOCUS') {
                  onStartFocus(data.minutes || 25);
              }
          } catch (e) {
              setMessages(prev => [...prev, { role: 'ai', text: "❌ Erreur action." }]);
          }
      } else {
          setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
      }
      setLoadingAi(false);
  };

  // --- RENDERERS ---
  const renderOverview = () => (
      <View style={{ gap: 16 }}>
          <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
                  <Activity size={24} color="#C4B5FD" />
                  <Text style={[styles.kpiValue, {color: colors.text}]}>{taskCompletionRate}%</Text>
                  <Text style={styles.kpiLabel}>Complétion</Text>
              </View>
              <View style={[styles.kpiCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
                  <Clock size={24} color="#4ADE80" />
                  <Text style={[styles.kpiValue, {color: colors.text}]}>{Math.floor(totalFocusTime / 60)}h</Text>
                  <Text style={styles.kpiLabel}>Focus Hebdo</Text>
              </View>
              <View style={[styles.kpiCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
                  <TrendingUp size={24} color="#FACC15" />
                  <Text style={[styles.kpiValue, {color: colors.text}]}>{player.level}</Text>
                  <Text style={styles.kpiLabel}>Niveau</Text>
              </View>
          </View>

          <View style={[styles.insightBox, {backgroundColor: colors.card}]}>
             <Text style={styles.insightTitle}>⚡ Analyse de Performance</Text>
             <Text style={[styles.insightText, {color: colors.subText}]}>
                 {bestDay !== 'N/A' ? `Meilleure journée : ${bestDay}` : "Pas assez de données de focus."}
             </Text>
          </View>
      </View>
  );

  const renderAnalytics = () => {
    const maxVal = Math.max(...weeklyFocusData, 60);
    const dayLabels = [];
    for (let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayLabels.push(d.toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase());
    }

    return (
      <View style={{ gap: 20 }}>
          <View style={[styles.analysisCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
            <View style={styles.cardHeader}>
                <BarChart2 size={20} color="#C4B5FD" />
                <Text style={[styles.cardTitle, {color: colors.text}]}>Temps de Focus (7j)</Text>
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
      </View>
    );
  };

  const renderAiCoach = () => (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
            <View style={[styles.modeSwitchContainer, { borderColor: colors.border }]}>
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
                    <View key={index} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: isDarkMode ? '#262626' : '#E5E5EA' }]]}>
                        <Text style={[msg.role === 'user' ? styles.userText : styles.aiText, msg.role === 'ai' && !isDarkMode && { color: '#000' }]}>{msg.text}</Text>
                    </View>
                ))}
                {loadingAi && <ActivityIndicator size="small" color={colors.text} style={{alignSelf: 'flex-start', margin: 10}} />}
            </ScrollView>
            
            <View style={[
                styles.inputArea, 
                { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) + 70 } // Add massive padding for bottom nav clearance
            ]}>
                <TouchableOpacity style={[styles.voiceBtn, { backgroundColor: isDarkMode ? '#333' : '#E5E5EA' }]} onPress={handleVoiceInput}>
                    <Mic size={20} color={isCreationMode ? "#4ADE80" : (isDarkMode ? "#FFF" : "#000")} />
                </TouchableOpacity>
                <TextInput 
                    style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                    placeholder={isCreationMode ? "Ex: Crée une tâche..." : "Discuter avec le coach..."}
                    placeholderTextColor="#888"
                    value={chatInput}
                    onChangeText={setChatInput}
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                    <Send size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
            <Menu size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Évolution</Text>
        <TouchableOpacity onPress={openProfile}>
            <Image 
                source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                style={styles.avatar} 
            />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabBar, {borderColor: colors.border}]}>
          {(['OVERVIEW', 'ANALYTICS', 'AI_COACH'] as const).map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabItem, activeTab === tab && styles.tabActive]}>
                  <Text style={[styles.tabText, activeTab === tab && {color: colors.text}]}>{tab}</Text>
              </TouchableOpacity>
          ))}
      </View>

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
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
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
      fontSize: 12,
  },
  contentArea: {
      flex: 1,
  },
  scrollContent: {
      padding: 20,
      paddingBottom: 100,
  },
  kpiGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
  },
  kpiCard: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      alignItems: 'center',
  },
  kpiValue: {
      fontSize: 20,
      fontWeight: '700',
      marginVertical: 4,
  },
  kpiLabel: {
      color: '#888',
      fontSize: 11,
      textAlign: 'center',
  },
  insightBox: {
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
      fontSize: 14,
      lineHeight: 20,
  },
  analysisCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
  },
  cardTitle: {
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
  modeSwitchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: 1,
  },
  modeLabel: {
      color: '#888',
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
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
  },
  userText: {
      color: '#FFF',
      fontSize: 15,
  },
  aiText: {
      fontSize: 15,
      lineHeight: 22,
  },
  inputArea: {
      padding: 16,
      borderTopWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  voiceBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
  },
  textInput: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
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