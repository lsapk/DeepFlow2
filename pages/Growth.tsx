
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions, LayoutAnimation } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal } from '../types';
import { Send, MessageSquare, PlusCircle, Sparkles, BrainCircuit, Activity, Zap, RefreshCw, BarChart2, PieChart, Clock, Target, CloudOff } from 'lucide-react-native';
import { generateActionableCoaching, generateLifeWheelAnalysis } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playMenuClick, playSuccess } from '../services/sound';
import SkeletonAnalysis from '../components/SkeletonAnalysis';
import Markdown from 'react-native-markdown-display';
import Svg, { Polygon, Line, Circle, Text as SvgText, Rect, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

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
  noPadding?: boolean;
}

const Growth: React.FC<GrowthProps> = ({ player, user, tasks, habits = [], goals = [], onAddTask, onAddHabit, onAddGoal, isDarkMode = true, noPadding = false }) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFF' : '#000',
      subText: isDarkMode ? '#8E8E93' : '#666',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      inputBg: isDarkMode ? '#171717' : '#F2F2F7',
      accent: '#C4B5FD',
      primary: '#007AFF',
      success: '#34C759',
      orange: '#FF9500',
      userBubble: '#007AFF',
      aiBubble: isDarkMode ? '#2C2C2E' : '#E5E5EA'
  };

  const markdownStyles = {
      body: { color: colors.text, fontSize: 15, lineHeight: 22 },
      heading1: { color: colors.accent, fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
      heading2: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
      strong: { color: colors.accent, fontWeight: 'bold' },
      list_item_bullet: { color: colors.text, fontSize: 15 },
      paragraph: { marginBottom: 10 },
      code_inline: { backgroundColor: isDarkMode ? '#333' : '#ddd', borderRadius: 4, paddingHorizontal: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  };

  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'DATA' | 'COACH'>('DATA');
  const [dataSubTab, setDataSubTab] = useState<'GLOBAL' | 'BALANCE' | 'FOCUS'>('GLOBAL');
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  
  // Real Analysis Data
  const [lifeWheelData, setLifeWheelData] = useState<number[]>([20, 20, 20, 20, 20, 20]);
  const [focusHistory, setFocusHistory] = useState<any[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<any[]>([]);
  const [isAnalyzingWheel, setIsAnalyzingWheel] = useState(false);

  // --- FETCH DEEP REAL DATA ---
  useEffect(() => {
      const fetchDeepData = async () => {
          setLoading(true);
          try {
              // 1. Fetch Focus Sessions (Last 30 days)
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              const { data: focusData } = await supabase
                  .from('focus_sessions')
                  .select('*')
                  .eq('user_id', user.id)
                  .gte('created_at', thirtyDaysAgo.toISOString())
                  .order('created_at', { ascending: false });
              
              if (focusData) setFocusHistory(focusData);

              // 2. Fetch Habit Completions (Last 30 days) for heatmap
              const { data: habitComp } = await supabase
                  .from('habit_completions')
                  .select('*')
                  .eq('user_id', user.id)
                  .gte('completed_date', thirtyDaysAgo.toISOString().split('T')[0]);
              
              if (habitComp) setHabitCompletions(habitComp);

          } catch (e) {
              console.log("Error fetching deep data", e);
          } finally {
              setLoading(false);
          }
      };

      fetchDeepData();
      
      if (messages.length === 0) {
          setMessages([{ role: 'ai', text: `### Bonjour ${user.display_name?.split(' ')[0]} ! 👋\n\nJe suis **DeepFlow AI**. Je peux analyser tes données réelles ou t'aider à t'organiser.\n\n* Pose-moi une question sur ta chronobiologie.\n* Demande-moi d'ajouter un objectif.` }]);
      }
  }, []);

  // --- COMPUTED STATS (REAL) ---
  const stats = useMemo(() => {
      const totalTasks = tasks.length || 1;
      const completedTasks = tasks.filter(t => t.completed);
      const taskRate = Math.round((completedTasks.length / totalTasks) * 100);
      
      const activeHabits = habits.filter(h => !h.is_archived);
      const avgStreak = activeHabits.length > 0 
          ? Math.round(activeHabits.reduce((acc, h) => acc + h.streak, 0) / activeHabits.length) 
          : 0;

      // Score global calculated from REAL performance
      const productivityScore = Math.min(100, Math.round((taskRate * 0.4) + (Math.min(avgStreak, 30) * 1.5) + (player.level * 1.5)));

      // 1. Real Activity Chart (Focus minutes + Tasks completed)
      const weeklyActivity = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
      
      // Add Focus Minutes
      focusHistory.forEach(session => {
          const d = new Date(session.created_at);
          const day = d.getDay(); // 0 is Sunday
          const adjustedDay = day === 0 ? 6 : day - 1; 
          weeklyActivity[adjustedDay] += (session.duration || 0);
      });
      // Add Tasks Bonus (arbitrary 15 min per task)
      completedTasks.forEach(task => {
          const d = new Date(task.created_at); // Fallback to created if completed_at missing
          const day = d.getDay();
          const adjustedDay = day === 0 ? 6 : day - 1;
          weeklyActivity[adjustedDay] += 15;
      });
      
      const maxActivity = Math.max(...weeklyActivity, 1);
      const normalizedWeekly = weeklyActivity.map(v => (v / maxActivity) * 100);

      // 2. Real Consistency Heatmap (Last 30 days)
      const consistencyMap: Record<string, number> = {};
      const addToMap = (dateStr: string) => {
          if (!dateStr) return;
          const k = dateStr.split('T')[0];
          consistencyMap[k] = (consistencyMap[k] || 0) + 1;
      };

      focusHistory.forEach(s => addToMap(s.created_at));
      habitCompletions.forEach(h => addToMap(h.completed_date));
      // Assume completed tasks were done recently (simplified as DB might not have completed_at on old schema)
      // If task has explicit date we use it
      completedTasks.forEach(t => addToMap(t.created_at));

      return { productivityScore, taskRate, avgStreak, weeklyActivity: normalizedWeekly, completedTasksCount: completedTasks.length, consistencyMap };
  }, [tasks, habits, player.level, focusHistory, habitCompletions]);

  const refreshWheelAnalysis = async () => {
      setIsAnalyzingWheel(true);
      playMenuClick();
      
      // Build Full Context
      const deepContext = {
          tasks: tasks.slice(0, 30),
          habits,
          goals,
          recentFocus: focusHistory.slice(0, 20),
          journalCount: 5 // Placeholder count if journal unavailable in props
      };

      const scores = await generateLifeWheelAnalysis(deepContext);
      if (scores) {
          setLifeWheelData(scores);
          playSuccess();
      } else {
          Alert.alert("Hors Connexion", "L'IA nécessite internet pour analyser vos données.");
      }
      setIsAnalyzingWheel(false);
  };

  const sendMessage = async () => {
      if (!chatInput.trim()) return;
      playMenuClick();
      const userMsg = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setLoadingAi(true);
      
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      
      try {
          const context: any = { user: { name: user.display_name }, tasks: tasks.slice(0,5), habits, focusStats: stats };
          const response = await generateActionableCoaching(userMsg, context, isCreationMode);
          
          if (response.action) {
              confirmAction(response.action);
          } else {
              setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
              playSuccess();
          }
      } catch (e) {
          setMessages(prev => [...prev, { role: 'ai', text: "🚫 *Erreur connexion.*" }]);
      } finally {
          setLoadingAi(false);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
  };

  const confirmAction = (actionObj: any) => {
      const { action, data } = actionObj;
      let label = `Créer : ${data.title}`;
      Alert.alert("Action IA", label, [
          { text: "Annuler", style: "cancel" },
          { text: "Confirmer", onPress: () => {
              if (action === 'CREATE_TASK') onAddTask(data.title, data.priority || 'medium');
              if (action === 'CREATE_HABIT') onAddHabit(data.title);
              if (action === 'CREATE_GOAL') onAddGoal(data.title);
              setMessages(prev => [...prev, { role: 'ai', text: `✅ Créé : **"${data.title}"**.` }]);
              playSuccess();
          }}
      ]);
  };

  // --- CUSTOM CHARTS ---

  const renderProductivityRing = () => {
      const size = 160;
      const strokeWidth = 12;
      const radius = (size - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      const progress = stats.productivityScore / 100;
      const strokeDashoffset = circumference - progress * circumference;

      return (
          <View style={{alignItems: 'center', justifyContent: 'center', height: 180}}>
              <Svg width={size} height={size}>
                  <Circle cx={size/2} cy={size/2} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="transparent" />
                  <Circle 
                      cx={size/2} cy={size/2} r={radius} 
                      stroke={colors.accent} 
                      strokeWidth={strokeWidth} 
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      rotation="-90"
                      origin={`${size/2}, ${size/2}`}
                  />
              </Svg>
              <View style={{position: 'absolute', alignItems: 'center'}}>
                  <Text style={{color: colors.text, fontSize: 36, fontWeight: '800'}}>{stats.productivityScore}</Text>
                  <Text style={{color: colors.subText, fontSize: 12, fontWeight: '600', textTransform: 'uppercase'}}>Score</Text>
              </View>
          </View>
      );
  };

  const renderBarChart = () => {
      const h = 100;
      const w = width - 80;
      const barW = (w / 7) - 8;
      const max = 100;

      return (
          <View style={{height: h, width: w, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between'}}>
              {stats.weeklyActivity.map((val, i) => (
                  <View key={i} style={{alignItems: 'center', gap: 6}}>
                      <View style={{
                          width: barW, 
                          height: (val / max) * h || 4, // Min height visual
                          backgroundColor: i === 6 ? colors.primary : (isDarkMode ? '#333' : '#E5E5EA'),
                          borderRadius: 6
                      }} />
                      <Text style={{color: colors.subText, fontSize: 10, fontWeight: '600'}}>{['L','M','M','J','V','S','D'][i]}</Text>
                  </View>
              ))}
          </View>
      );
  };

  const renderSpiderChart = () => {
      const size = width - 100;
      const center = size / 2;
      const radius = size / 2;
      const categories = ["Santé", "Loisirs", "Perso", "Apprent.", "Mental", "Carrière"];
      
      const points = lifeWheelData.map((val, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const r = (val / 100) * radius;
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(" ");

      return (
          <View style={{alignItems: 'center', marginVertical: 10}}>
              <Svg height={size} width={size}>
                  {[0.25, 0.5, 0.75, 1].map((scale, k) => (
                      <Polygon key={k}
                          points={categories.map((_, i) => {
                              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                              const r = radius * scale;
                              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                          }).join(" ")}
                          stroke={colors.border} strokeWidth="1" fill="none"
                      />
                  ))}
                  {categories.map((cat, i) => {
                      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                      return (
                          <Line key={i}
                              x1={center} y1={center}
                              x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)}
                              stroke={colors.border} strokeWidth="1"
                          />
                      )
                  })}
                  <Polygon points={points} fill="rgba(196, 181, 253, 0.3)" stroke={colors.accent} strokeWidth="2" />
                  {categories.map((cat, i) => {
                      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                      const x = center + (radius + 15) * Math.cos(angle);
                      const y = center + (radius + 15) * Math.sin(angle);
                      return (
                          <SvgText key={i} x={x} y={y} fill={colors.subText} fontSize="10" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{cat}</SvgText>
                      )
                  })}
              </Svg>
          </View>
      );
  };

  const renderChronobiology = () => {
      // Calculate REAL chronobiology based on focus history time
      const buckets = [0, 0, 0, 0]; // 6h, 12h, 18h, 22h simplified
      focusHistory.forEach(s => {
          const hour = new Date(s.created_at).getHours();
          if (hour >= 6 && hour < 12) buckets[0]++;
          else if (hour >= 12 && hour < 18) buckets[1]++;
          else if (hour >= 18 && hour < 22) buckets[2]++;
          else buckets[3]++;
      });
      const maxBucket = Math.max(...buckets, 1);
      
      const w = width - 80;
      const h = 100;
      
      // Create path based on buckets
      const step = w / 3;
      // Using Bezier approximation for smoother curve or straight lines
      const p0 = {x: 0, y: h - (buckets[0]/maxBucket)*h};
      const p1 = {x: step, y: h - (buckets[1]/maxBucket)*h};
      const p2 = {x: step*2, y: h - (buckets[2]/maxBucket)*h};
      const p3 = {x: w, y: h - (buckets[3]/maxBucket)*h};

      const path = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;

      return (
          <View style={{marginTop: 10}}>
              <Svg width={w} height={h}>
                  <Defs>
                      <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={colors.success} stopOpacity="0.4" />
                          <Stop offset="1" stopColor={colors.success} stopOpacity="0" />
                      </SvgGradient>
                  </Defs>
                  <Path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#grad)" />
                  <Path d={path} stroke={colors.success} strokeWidth="3" fill="none" />
              </Svg>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 6}}>
                  <Text style={{color: colors.subText, fontSize: 10}}>Matin</Text>
                  <Text style={{color: colors.subText, fontSize: 10}}>Midi</Text>
                  <Text style={{color: colors.subText, fontSize: 10}}>Soir</Text>
                  <Text style={{color: colors.subText, fontSize: 10}}>Nuit</Text>
              </View>
          </View>
      );
  };

  const renderConsistency = () => {
      // 30 days grid
      const grid = Array.from({length: 30}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          const key = d.toISOString().split('T')[0];
          const count = stats.consistencyMap[key] || 0;
          return { date: d, count };
      });

      return (
          <View style={styles.heatmapGrid}>
              {grid.map((day, i) => {
                  const intensity = Math.min(1, day.count / 5); // 5 actions = max intensity
                  return (
                      <View 
                          key={i} 
                          style={[
                              styles.heatmapCell, 
                              { 
                                  backgroundColor: intensity > 0 ? colors.orange : (isDarkMode ? '#333' : '#E5E5EA'), 
                                  opacity: intensity > 0 ? 0.3 + (intensity * 0.7) : 1 
                              }
                          ]} 
                      />
                  );
              })}
          </View>
      );
  };

  if (loading) return <SkeletonAnalysis />;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: noPadding ? 0 : insets.top }]}>
        
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <BrainCircuit size={28} color={colors.accent} />
                <Text style={[styles.headerTitle, {color: colors.text}]}>Analyses</Text>
            </View>
            <View style={styles.mainTabs}>
                <TouchableOpacity onPress={() => { playMenuClick(); setMainTab('DATA'); }} style={[styles.mainTabItem, mainTab === 'DATA' && {backgroundColor: colors.card}]}>
                    <BarChart2 size={16} color={mainTab === 'DATA' ? colors.text : colors.subText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { playMenuClick(); setMainTab('COACH'); }} style={[styles.mainTabItem, mainTab === 'COACH' && {backgroundColor: colors.card}]}>
                    <MessageSquare size={16} color={mainTab === 'COACH' ? colors.text : colors.subText} />
                </TouchableOpacity>
            </View>
        </View>

        {mainTab === 'DATA' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* SUB-TABS */}
                <View style={styles.subTabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                        {['GLOBAL', 'BALANCE', 'FOCUS'].map((tab: any) => (
                            <TouchableOpacity 
                                key={tab} 
                                onPress={() => { playMenuClick(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setDataSubTab(tab); }}
                                style={[styles.subTab, dataSubTab === tab && {backgroundColor: colors.accent}, {borderColor: colors.border}]}
                            >
                                <Text style={[styles.subTabText, {color: dataSubTab === tab ? '#000' : colors.subText}]}>
                                    {tab === 'GLOBAL' ? 'Aperçu' : tab === 'BALANCE' ? 'Équilibre' : 'Énergie'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {dataSubTab === 'GLOBAL' && (
                    <>
                        <View style={[styles.card, {backgroundColor: colors.card}]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardTitle, {color: colors.text}]}>Performance Globale</Text>
                                <Activity size={18} color={colors.accent} />
                            </View>
                            {renderProductivityRing()}
                            <View style={styles.kpiRow}>
                                <View style={styles.kpiItem}>
                                    <Text style={[styles.kpiValue, {color: colors.primary}]}>{stats.completedTasksCount}</Text>
                                    <Text style={[styles.kpiLabel, {color: colors.subText}]}>Tâches</Text>
                                </View>
                                <View style={[styles.kpiSeparator, {backgroundColor: colors.border}]} />
                                <View style={styles.kpiItem}>
                                    <Text style={[styles.kpiValue, {color: colors.orange}]}>{stats.avgStreak}</Text>
                                    <Text style={[styles.kpiLabel, {color: colors.subText}]}>Streak Moy.</Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.card, {backgroundColor: colors.card}]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardTitle, {color: colors.text}]}>Activité Focus (Semaine)</Text>
                                <BarChart2 size={18} color={colors.subText} />
                            </View>
                            <View style={{marginTop: 10}}>
                                {renderBarChart()}
                            </View>
                        </View>
                    </>
                )}

                {dataSubTab === 'BALANCE' && (
                    <View style={[styles.card, {backgroundColor: colors.card}]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, {color: colors.text}]}>Roue de la Vie</Text>
                            <TouchableOpacity onPress={refreshWheelAnalysis} disabled={isAnalyzingWheel}>
                                {isAnalyzingWheel ? <ActivityIndicator size="small" color={colors.accent} /> : <RefreshCw size={18} color={colors.subText} />}
                            </TouchableOpacity>
                        </View>
                        {renderSpiderChart()}
                        <Text style={[styles.analysisText, {color: colors.subText}]}>
                            Cette analyse est générée par IA en lisant vos tâches, habitudes, et focus. Rafraîchissez pour recalculer.
                        </Text>
                    </View>
                )}

                {dataSubTab === 'FOCUS' && (
                    <>
                        <View style={[styles.card, {backgroundColor: colors.card}]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardTitle, {color: colors.text}]}>Chronobiologie</Text>
                                <Clock size={18} color={colors.success} />
                            </View>
                            {renderChronobiology()}
                            <Text style={[styles.analysisText, {color: colors.subText, marginTop: 15}]}>
                                Basé sur vos horaires réels de sessions Focus.
                            </Text>
                        </View>

                        <View style={[styles.card, {backgroundColor: colors.card}]}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardTitle, {color: colors.text}]}>Consistance (30 jours)</Text>
                                <Target size={18} color={colors.orange} />
                            </View>
                            {renderConsistency()}
                        </View>
                    </>
                )}

                <View style={{height: 100}} />
            </ScrollView>
        ) : (
            <KeyboardAvoidingView 
                style={{flex: 1}} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
            >
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.chatContainer} 
                    contentContainerStyle={{paddingBottom: 20}}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.map((m, i) => (
                        <View key={i} style={[
                            styles.bubble, 
                            m.role === 'user' 
                                ? [styles.bubbleUser, {backgroundColor: colors.userBubble}] 
                                : [styles.bubbleAi, {backgroundColor: colors.aiBubble}]
                        ]}>
                            {m.role === 'user' ? (
                                <Text style={{color: '#FFF', fontSize: 16}}>{m.text}</Text>
                            ) : (
                                <Markdown style={markdownStyles as any}>{m.text}</Markdown>
                            )}
                        </View>
                    ))}
                    {loadingAi && (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, margin: 20}}>
                            <ActivityIndicator size="small" color={colors.accent} />
                            <Text style={{color: colors.subText, fontSize: 12}}>Analyse...</Text>
                        </View>
                    )}
                </ScrollView>
                
                <View style={[styles.inputWrapper, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
                    <View style={styles.modeSwitchContainer}>
                        <TouchableOpacity style={[styles.modePill, !isCreationMode && {backgroundColor: colors.primary}]} onPress={() => setIsCreationMode(false)}>
                            <MessageSquare size={12} color={!isCreationMode ? "#FFF" : "rgba(255,255,255,0.5)"} />
                            <Text style={[styles.modeText, {color: "#FFF"}]}>Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modePill, isCreationMode && {backgroundColor: colors.success}]} onPress={() => setIsCreationMode(true)}>
                            <PlusCircle size={12} color={isCreationMode ? "#FFF" : "rgba(255,255,255,0.5)"} />
                            <Text style={[styles.modeText, {color: "#FFF"}]}>Création</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput 
                            style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text}]} 
                            value={chatInput} 
                            onChangeText={setChatInput} 
                            placeholder={isCreationMode ? "Ex: Créer tâche..." : "Posez une question..."}
                            placeholderTextColor={colors.subText}
                            multiline
                        />
                        <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, {backgroundColor: isCreationMode ? colors.success : colors.primary}]}>
                            {isCreationMode ? <Sparkles size={20} color="#FFF" /> : <Send size={20} color="#FFF" />}
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{height: 90, backgroundColor: colors.bg}} /> 
            </KeyboardAvoidingView>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 15, paddingTop: 10, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  mainTabs: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 },
  mainTabItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  
  subTabsContainer: { marginBottom: 20 },
  subTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  subTabText: { fontSize: 13, fontWeight: '700' },

  scrollContent: { padding: 20, paddingBottom: 100 },
  
  card: { padding: 20, borderRadius: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  
  kpiRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  kpiItem: { alignItems: 'center' },
  kpiValue: { fontSize: 24, fontWeight: '800' },
  kpiLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  kpiSeparator: { width: 1, height: 30 },

  analysisText: { fontSize: 13, lineHeight: 20, marginTop: 20, fontStyle: 'italic' },

  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  heatmapCell: { width: (width - 80 - (6*5)) / 6, height: 24, borderRadius: 4 },

  // Chat Styles
  chatContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  bubble: { padding: 14, borderRadius: 18, marginBottom: 12, maxWidth: '88%' },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleAi: { alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  
  inputWrapper: { padding: 16, borderTopWidth: 1, gap: 12 }, 
  modeSwitchContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  modePill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, gap: 6, backgroundColor: '#333' },
  modeText: { fontSize: 11, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, fontSize: 16 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }
});

export default Growth;
