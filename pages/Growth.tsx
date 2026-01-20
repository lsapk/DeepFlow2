import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Dimensions } from 'react-native';
import { PlayerProfile, UserProfile, Task } from '../types';
import { Send, Menu, Sparkles, TrendingUp, BrainCircuit, Clock, BarChart2, PieChart, Activity } from 'lucide-react-native';
import { generateCoaching } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

interface GrowthProps {
  player: PlayerProfile;
  user: UserProfile;
  tasks: Task[]; 
  openMenu: () => void;
  openProfile: () => void;
}

const Growth: React.FC<GrowthProps> = ({ player, user, tasks, openMenu, openProfile }) => {
  const insets = useSafeAreaInsets();
  
  // Tabs: 'OVERVIEW' | 'ANALYTICS' | 'AI_COACH'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYTICS' | 'AI_COACH'>('OVERVIEW');

  // AI Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: `Bonjour ${user.display_name?.split(' ')[0]}. Je suis prêt à analyser tes performances. Par quoi commençons-nous ?` }
  ]);
  const [loadingAi, setLoadingAi] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Stats State
  const [weeklyFocusData, setWeeklyFocusData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [taskCompletionRate, setTaskCompletionRate] = useState(0);

  useEffect(() => {
      fetchFocusStats();
      calculateTaskStats();
  }, [tasks]);

  const calculateTaskStats = () => {
      const total = tasks.length;
      if (total === 0) {
          setTaskCompletionRate(0);
          return;
      }
      const completed = tasks.filter(t => t.completed).length;
      setTaskCompletionRate(Math.round((completed / total) * 100));
  };

  const fetchFocusStats = async () => {
      const { data: sessions } = await supabase
          .from('focus_sessions')
          .select('duration, completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (sessions) {
          const daysMap = new Array(7).fill(0);
          let total = 0;
          
          sessions.forEach(session => {
              const date = new Date(session.completed_at);
              const today = new Date();
              const diffTime = Math.abs(today.getTime() - date.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1; 
              
              if (diffDays >= 0 && diffDays < 7) {
                  daysMap[6 - diffDays] += session.duration;
              }
              total += session.duration;
          });
          
          setWeeklyFocusData(daysMap);
          setTotalFocusTime(total);
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
          level: player.level,
          xp: player.experience_points,
          pendingTasks: tasks.filter(t => !t.completed).length,
          weeklyFocusMinutes: totalFocusTime
      };

      const response = await generateCoaching(userMsg, context);
      
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
      setLoadingAi(false);
  };

  // --- RENDERERS ---

  const renderOverview = () => (
      <View style={{ gap: 16 }}>
          {/* KPI Cards */}
          <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                  <Activity size={20} color="#C4B5FD" style={{marginBottom: 8}} />
                  <Text style={styles.kpiValue}>{taskCompletionRate}%</Text>
                  <Text style={styles.kpiLabel}>Tâches Complétées</Text>
              </View>
              <View style={styles.kpiCard}>
                  <Clock size={20} color="#4ADE80" style={{marginBottom: 8}} />
                  <Text style={styles.kpiValue}>{Math.floor(totalFocusTime / 60)}h</Text>
                  <Text style={styles.kpiLabel}>Focus Hebdo</Text>
              </View>
          </View>

          <View style={styles.insightBox}>
             <View style={{flexDirection: 'row', gap: 10, marginBottom: 8}}>
                 <Sparkles size={18} color="#FACC15" />
                 <Text style={styles.insightTitle}>Suggestion IA</Text>
             </View>
             <Text style={styles.insightText}>
                 {taskCompletionRate < 50 
                    ? "Votre taux de complétion est faible cette semaine. Essayez de diviser vos tâches en sous-tâches plus petites."
                    : "Excellent rythme ! Vous êtes en bonne voie pour atteindre le niveau supérieur."}
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
          <View style={styles.analysisCard}>
            <View style={styles.cardHeader}>
                <BarChart2 size={20} color="#C4B5FD" />
                <Text style={styles.cardTitle}>Focus (7 derniers jours)</Text>
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

          <View style={styles.analysisCard}>
            <View style={styles.cardHeader}>
                <PieChart size={20} color="#4ADE80" />
                <Text style={styles.cardTitle}>Répartition des Tâches</Text>
            </View>
            <View style={styles.statsList}>
                <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Total</Text>
                    <Text style={styles.statRowValue}>{tasks.length}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>En attente</Text>
                    <Text style={styles.statRowValue}>{tasks.filter(t => !t.completed).length}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Priorité Haute</Text>
                    <Text style={[styles.statRowValue, { color: '#F87171' }]}>{tasks.filter(t => t.priority === 'high' && !t.completed).length}</Text>
                </View>
            </View>
          </View>
      </View>
    );
  };

  const renderAiCoach = () => (
      <View style={{ flex: 1 }}>
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
            <TextInput 
                style={styles.textInput}
                placeholder="Discuter avec le coach..."
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
  kpiRow: {
      flexDirection: 'row',
      gap: 16,
  },
  kpiCard: {
      flex: 1,
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
      alignItems: 'flex-start',
  },
  kpiValue: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFF',
      marginBottom: 2,
  },
  kpiLabel: {
      color: '#888',
      fontSize: 12,
  },
  insightBox: {
      backgroundColor: 'rgba(250, 204, 21, 0.05)',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(250, 204, 21, 0.2)',
  },
  insightTitle: {
      color: '#FACC15',
      fontWeight: '700',
      fontSize: 14,
  },
  insightText: {
      color: '#DDD',
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
  statsList: {
      gap: 12,
  },
  statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#222',
  },
  statRowLabel: {
      color: '#AAA',
      fontSize: 14,
  },
  statRowValue: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 14,
  },

  // Chat
  chatScroll: {
      flex: 1,
      paddingHorizontal: 20,
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
      marginBottom: 65, // Bottom nav space
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