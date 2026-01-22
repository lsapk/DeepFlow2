import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Switch, Alert, KeyboardAvoidingView, Platform, LayoutAnimation } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal } from '../types';
import { Send, Menu, TrendingUp, Clock, BarChart2, Activity, Mic, PieChart, Lock, Unlock, Brain, Info } from 'lucide-react-native';
import { generateActionableCoaching } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import Markdown from 'react-native-markdown-display';

interface GrowthProps {
  player: PlayerProfile;
  user: UserProfile;
  tasks: Task[]; 
  habits?: Habit[];
  goals?: Goal[];
  openMenu: () => void;
  openProfile: () => void;
  onAddTask: (title: string, priority: string) => void;
  onAddHabit: (title: string) => void;
  onAddGoal: (title: string) => void;
  onStartFocus: (minutes: number) => void;
  isDarkMode?: boolean;
}

interface AiPermissions {
    tasks: boolean;
    habits: boolean;
    goals: boolean;
    profile: boolean;
}

const Growth: React.FC<GrowthProps> = ({ player, user, tasks, habits = [], goals = [], openMenu, openProfile, onAddTask, onAddHabit, onAddGoal, onStartFocus, isDarkMode = true }) => {
  const insets = useSafeAreaInsets();
  
  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFF' : '#000',
      subText: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      inputBg: isDarkMode ? '#000' : '#F2F2F7',
      accent: '#C4B5FD',
      button: '#007AFF',
      success: '#4ADE80'
  };

  const markdownStyles = {
    body: { color: colors.text, fontSize: 15 },
    heading1: { color: colors.accent, fontWeight: '700', marginVertical: 10 },
    heading2: { color: colors.text, fontWeight: '600', marginVertical: 8 },
    strong: { color: colors.accent, fontWeight: 'bold' },
    list_item: { marginBottom: 6 },
    bullet_list: { marginBottom: 10 },
  };

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYTICS' | 'AI_COACH'>('OVERVIEW');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: `Bonjour **${user.display_name?.split(' ')[0]}** ! 👋\n\nJe suis prêt à analyser tes données. Configure mes accès ci-dessus et active le **Mode Création** si tu veux que j'agisse pour toi. 🚀` }
  ]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  
  // Permissions AI
  const [aiPermissions, setAiPermissions] = useState<AiPermissions>({
      tasks: true,
      habits: true,
      goals: true,
      profile: true
  });
  const [showPermissions, setShowPermissions] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Stats State
  const [weeklyFocusData, setWeeklyFocusData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [bestDay, setBestDay] = useState('N/A');
  const [taskCompletionRate, setTaskCompletionRate] = useState(0);
  const [taskDistribution, setTaskDistribution] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
      fetchRealFocusStats();
      calculateRealTaskStats();
  }, [tasks]);

  const calculateRealTaskStats = () => {
      const total = tasks.length;
      if (total === 0) {
          setTaskCompletionRate(0);
          setTaskDistribution({ high: 0, medium: 0, low: 0 });
          return;
      }
      const completed = tasks.filter(t => t.completed).length;
      setTaskCompletionRate(Math.round((completed / total) * 100));

      const high = tasks.filter(t => t.priority === 'high').length;
      const medium = tasks.filter(t => t.priority === 'medium').length;
      const low = tasks.filter(t => t.priority === 'low').length;
      setTaskDistribution({ high, medium, low });
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

  const switchTab = (tab: any) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
  };

  const togglePermission = (key: keyof AiPermissions) => {
      setAiPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sendMessage = async () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setLoadingAi(true);
      
      // Construction dynamique du contexte selon les permissions
      const context: any = {};
      if (aiPermissions.profile) {
          context.user = { name: user.display_name, level: player.level };
      }
      if (aiPermissions.tasks) {
          context.tasks = {
              pending: tasks.filter(t => !t.completed).length,
              topUrgent: tasks.filter(t => t.priority === 'high' && !t.completed).map(t => t.title),
              completionRate: taskCompletionRate
          };
      }
      if (aiPermissions.habits) {
          context.habits = habits.map(h => ({ title: h.title, streak: h.streak }));
      }
      if (aiPermissions.goals) {
          context.goals = goals.filter(g => !g.completed).map(g => ({ title: g.title, progress: g.progress }));
      }

      const response = await generateActionableCoaching(userMsg, context, isCreationMode);
      setLoadingAi(false);
      
      if (response.action) {
          confirmAction(response.action);
      } else {
          setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
      }
  };

  const confirmAction = (actionObj: any) => {
      const { action, data } = actionObj;
      let title = "Action Requise";
      let message = "";
      
      if (action === 'CREATE_TASK') {
          message = `Créer la tâche "${data.title}" (Priorité: ${data.priority}) ?`;
      } else if (action === 'CREATE_HABIT') {
          message = `Ajouter l'habitude "${data.title}" ?`;
      } else if (action === 'CREATE_GOAL') {
          message = `Définir l'objectif "${data.title}" ?`;
      } else if (action === 'START_FOCUS') {
          message = `Lancer un focus de ${data.minutes} minutes ?`;
      }

      Alert.alert(
          title,
          message,
          [
              { text: "Annuler", style: "cancel", onPress: () => setMessages(prev => [...prev, { role: 'ai', text: "❌ Action annulée." }]) },
              { 
                  text: "Confirmer", 
                  style: "default",
                  onPress: () => {
                      try {
                          if (action === 'CREATE_TASK') onAddTask(data.title, data.priority || 'medium');
                          else if (action === 'CREATE_HABIT') onAddHabit(data.title);
                          else if (action === 'CREATE_GOAL') onAddGoal(data.title);
                          else if (action === 'START_FOCUS') onStartFocus(data.minutes || 25);
                          setMessages(prev => [...prev, { role: 'ai', text: "✅ C'est fait !" }]);
                      } catch(e) {
                          setMessages(prev => [...prev, { role: 'ai', text: "❌ Erreur lors de l'exécution." }]);
                      }
                  }
              }
          ]
      );
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
          
          <View style={[styles.analysisCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
               <View style={styles.cardHeader}>
                    <PieChart size={20} color="#FACC15" />
                    <Text style={[styles.cardTitle, {color: colors.text}]}>Répartition des Tâches</Text>
               </View>
               <View style={styles.distributionRow}>
                   <View style={styles.distItem}>
                       <View style={[styles.dot, {backgroundColor: '#FF3B30'}]} />
                       <Text style={{color: colors.text}}>Haute: {taskDistribution.high}</Text>
                   </View>
                   <View style={styles.distItem}>
                       <View style={[styles.dot, {backgroundColor: '#FF9500'}]} />
                       <Text style={{color: colors.text}}>Moyenne: {taskDistribution.medium}</Text>
                   </View>
                   <View style={styles.distItem}>
                       <View style={[styles.dot, {backgroundColor: '#34C759'}]} />
                       <Text style={{color: colors.text}}>Basse: {taskDistribution.low}</Text>
                   </View>
               </View>
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
            {/* Header Contrôles IA */}
            <View style={[styles.aiControlsHeader, { borderColor: colors.border }]}>
                 <TouchableOpacity 
                    style={[styles.permToggle, {backgroundColor: showPermissions ? colors.accent : (isDarkMode ? '#333' : '#E5E5EA')}]} 
                    onPress={() => setShowPermissions(!showPermissions)}
                 >
                     <Brain size={16} color={showPermissions ? '#000' : colors.text} />
                     <Text style={[styles.permText, {color: showPermissions ? '#000' : colors.text}]}>Données</Text>
                 </TouchableOpacity>

                 <View style={styles.modeSwitchWrapper}>
                    <Text style={[styles.modeLabelMini, isCreationMode && {color: colors.success}]}>Création</Text>
                    <Switch 
                        value={isCreationMode} 
                        onValueChange={setIsCreationMode}
                        trackColor={{ false: "#333", true: colors.success }}
                        thumbColor="#FFF"
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                 </View>
            </View>

            {/* Panneau Permissions */}
            {showPermissions && (
                <View style={[styles.permissionsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.permTitle, {color: colors.subText}]}>ACCÈS DONNÉES IA</Text>
                    <View style={styles.permRow}>
                        <PermissionChip label="Profil" active={aiPermissions.profile} onPress={() => togglePermission('profile')} colors={colors} />
                        <PermissionChip label="Tâches" active={aiPermissions.tasks} onPress={() => togglePermission('tasks')} colors={colors} />
                        <PermissionChip label="Habitudes" active={aiPermissions.habits} onPress={() => togglePermission('habits')} colors={colors} />
                        <PermissionChip label="Objectifs" active={aiPermissions.goals} onPress={() => togglePermission('goals')} colors={colors} />
                    </View>
                    <View style={styles.infoRow}>
                        <Info size={14} color={colors.subText} />
                        <Text style={[styles.infoText, {color: colors.subText}]}>Décochez pour priver l'IA de ces données.</Text>
                    </View>
                </View>
            )}

            <ScrollView 
                style={styles.chatScroll}
                contentContainerStyle={{ paddingBottom: 20 }}
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg, index) => (
                    <View key={index} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: isDarkMode ? '#262626' : '#E5E5EA' }]]}>
                        {msg.role === 'ai' ? (
                            <Markdown style={markdownStyles as any}>
                                {msg.text}
                            </Markdown>
                        ) : (
                            <Text style={{color: '#FFF', fontSize: 15}}>{msg.text}</Text>
                        )}
                    </View>
                ))}
                {loadingAi && <ActivityIndicator size="small" color={colors.text} style={{alignSelf: 'flex-start', margin: 10}} />}
            </ScrollView>
            
            <View style={[
                styles.inputArea, 
                { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) + 70 }
            ]}>
                <TextInput 
                    style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                    placeholder={isCreationMode ? "Ex: Crée une tâche..." : "Discuter avec le coach..."}
                    placeholderTextColor="#888"
                    value={chatInput}
                    onChangeText={setChatInput}
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity style={[styles.sendBtn, {backgroundColor: colors.button}]} onPress={sendMessage}>
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
            <Menu size={24} color={colors.button} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer} pointerEvents="none">
            <Text style={[styles.headerTitle, {color: colors.text}]}>Évolution</Text>
        </View>

        <TouchableOpacity onPress={openProfile} style={styles.iconBtn}>
            <Image 
                source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                style={styles.avatar} 
            />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabBar, {borderColor: colors.border}]}>
          {(['OVERVIEW', 'ANALYTICS', 'AI_COACH'] as const).map(tab => (
              <TouchableOpacity key={tab} onPress={() => switchTab(tab)} style={[styles.tabItem, activeTab === tab && {borderBottomColor: colors.accent, borderBottomWidth: 2}]}>
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

const PermissionChip = ({ label, active, onPress, colors }: any) => (
    <TouchableOpacity 
        style={[styles.chip, { backgroundColor: active ? colors.text : 'transparent', borderColor: colors.text, borderWidth: 1 }]} 
        onPress={onPress}
    >
        {active ? <Unlock size={12} color={colors.bg} /> : <Lock size={12} color={colors.text} />}
        <Text style={[styles.chipText, { color: active ? colors.bg : colors.text }]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
  },
  headerTitleContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
  },
  headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
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
  tabText: {
      color: '#8E8E93',
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
  distributionRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
  },
  distItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
  },
  
  // AI CONTROLS
  aiControlsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderBottomWidth: 1,
  },
  permToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
  },
  permText: {
      fontSize: 12,
      fontWeight: '600',
  },
  modeSwitchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  modeLabelMini: {
      fontSize: 12,
      fontWeight: '600',
      color: '#888',
  },
  permissionsPanel: {
      padding: 16,
      borderBottomWidth: 1,
  },
  permTitle: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 12,
  },
  permRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
  },
  chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
  },
  chipText: {
      fontSize: 11,
      fontWeight: '600',
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  infoText: {
      fontSize: 11,
      fontStyle: 'italic',
  },

  // CHAT
  chatScroll: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
  },
  messageBubble: {
      padding: 12,
      borderRadius: 16,
      maxWidth: '85%',
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
  inputArea: {
      padding: 16,
      borderTopWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
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
      alignItems: 'center',
      justifyContent: 'center',
  }
});

export default Growth;