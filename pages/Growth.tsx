import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Switch, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, Dimensions } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal } from '../types';
import { Send, Menu, TrendingUp, Clock, BarChart2, Activity, Brain, Info, Grid, Hexagon, Zap, Sparkles } from 'lucide-react-native';
import { generateActionableCoaching, generateLifeWheelAnalysis } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import Markdown from 'react-native-markdown-display';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { playMenuClick, playSuccess } from '../services/sound';
import SkeletonAnalysis from '../components/SkeletonAnalysis';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYTICS' | 'AI_COACH'>('OVERVIEW');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  
  // Analytics State
  const [weeklyFocusData, setWeeklyFocusData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [peakHour, setPeakHour] = useState<string>('En attente de données');
  const [chronoProfile, setChronoProfile] = useState<string>('N/A');
  
  // 6 Categories Radar
  const [radarData, setRadarData] = useState([20,20,20,20,20,20]); // Base value visible
  const [isAiWheel, setIsAiWheel] = useState(false);
  const [heatmapData, setHeatmapData] = useState<number[]>(Array(90).fill(0)); 

  useEffect(() => {
      const initData = async () => {
          // 1. Fallback immédiat (Algorithme local) pour afficher quelque chose tout de suite
          calculateLifeWheelFallback();

          // 2. Chargement des stats locales (rapide)
          try {
              await Promise.all([
                calculateGlobalChronobiology(),
                fetchHeatmapData()
              ]);
          } catch (e) {
              console.warn("Erreur chargement stats", e);
          }
          
          setLoading(false); // L'écran s'affiche ici

          // 3. Lancer l'analyse IA en arrière-plan
          checkAndRunAIAnalysis();
      };
      
      initData();
      
      const timer = setTimeout(() => {
          if (messages.length === 0) {
              setMessages([{ role: 'ai', text: `Bonjour **${user.display_name?.split(' ')[0]}** ! 👋\n\nJ'ai accès à vos données pour vous coacher. Que voulez-vous savoir ?` }]);
          }
      }, 1000);
      
      return () => clearTimeout(timer);
  }, [tasks, habits, goals]);

  // --- AI ANALYSIS LOGIC ---
  const checkAndRunAIAnalysis = async () => {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `life_wheel_${user.id}`;

      try {
          // A. Vérifier le cache d'abord
          const lastAnalysisStr = await AsyncStorage.getItem(storageKey);
          if (lastAnalysisStr) {
              const lastAnalysis = JSON.parse(lastAnalysisStr);
              if (lastAnalysis.date === today && lastAnalysis.data) {
                  setRadarData(lastAnalysis.data);
                  setIsAiWheel(true);
                  return; // On a déjà l'analyse IA du jour
              }
          }

          // B. Si pas de cache, on appelle l'IA avec le contexte
          // On récupère un échantillon de journal pour aider l'IA
          const { data: journal } = await supabase.from('journal_entries').select('content, mood').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3);
          
          const fullContext = {
              tasks: tasks.slice(0, 15).map(t => ({ title: t.title, completed: t.completed, priority: t.priority })),
              habits: habits.map(h => ({ title: h.title, streak: h.streak, category: h.category })),
              goals: goals.map(g => ({ title: g.title, progress: g.progress })),
              journal_sample: journal
          };

          const aiResult = await generateLifeWheelAnalysis(fullContext);
          
          if (aiResult) {
              setRadarData(aiResult);
              setIsAiWheel(true);
              // Mise en cache
              await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, data: aiResult }));
          }

      } catch (e) {
          console.log("AI Analysis Background Error", e);
          // On reste sur le fallback (déjà affiché)
      }
  };

  const calculateLifeWheelFallback = () => {
      const CATEGORIES: Record<string, string[]> = {
          health: ['sport', 'run', 'gym', 'manger', 'eau', 'sleep', 'santé', 'medit', 'yoga', 'marche', 'fitness'],
          leisure: ['jeu', 'game', 'play', 'art', 'music', 'fun', 'film', 'série', 'lire', 'hobby', 'loisir', 'vacances'],
          personal: ['famille', 'ami', 'maison', 'clean', 'menage', 'appel', 'social', 'courses', 'chat', 'chien'],
          learning: ['apprendre', 'learn', 'cours', 'study', 'etude', 'livre', 'langue', 'skill', 'tuto'],
          mental: ['journal', 'reflec', 'penser', 'stoic', 'calme', 'focus', 'log', 'plan'],
          career: ['work', 'travail', 'boulot', 'code', 'dev', 'email', 'réunion', 'meet', 'projet', 'client']
      };

      const scores = { health: 0, leisure: 0, personal: 0, learning: 0, mental: 0, career: 0 };

      const classify = (text: string, points: number) => {
          const lower = text.toLowerCase();
          let found = false;
          for (const [cat, keywords] of Object.entries(CATEGORIES)) {
              if (keywords.some((k: string) => lower.includes(k))) {
                  scores[cat as keyof typeof scores] += points;
                  found = true;
                  break;
              }
          }
          if (!found) scores.personal += (points * 0.5); 
      };

      habits.forEach(h => {
          if (h.streak > 0) classify(h.title + ' ' + (h.category || ''), Math.min(50, 10 + h.streak));
      });
      tasks.filter(t => t.completed).forEach(t => classify(t.title, 10));
      goals.forEach(g => {
          if (g.completed) classify(g.title, 50);
          else if ((g.progress || 0) > 0) classify(g.title, 20);
      });

      const data = [
          scores.health, scores.leisure, scores.personal, 
          scores.learning, scores.mental, scores.career
      ].map(val => Math.min(100, Math.max(10, val)));

      setRadarData(data);
      setIsAiWheel(false);
  };

  const calculateGlobalChronobiology = async () => {
      const today = new Date();
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [focusRes, journalRes, reflectRes] = await Promise.all([
          supabase.from('focus_sessions').select('started_at, duration, completed_at').eq('user_id', user.id).gte('completed_at', lastMonth),
          supabase.from('journal_entries').select('created_at').eq('user_id', user.id).gte('created_at', lastMonth),
          supabase.from('daily_reflections').select('created_at').eq('user_id', user.id).gte('created_at', lastMonth)
      ]);

      const hourCounts: Record<number, number> = {};
      const weekly = [0,0,0,0,0,0,0];
      let totalTime = 0;

      const addHour = (isoDate: string, weight: number = 1) => {
          const d = new Date(isoDate);
          const h = d.getHours();
          hourCounts[h] = (hourCounts[h] || 0) + weight;
      };

      focusRes.data?.forEach(s => {
          if (s.started_at) addHour(s.started_at, 3);
          if (s.completed_at) {
              weekly[new Date(s.completed_at).getDay()] += (s.duration || 0);
              totalTime += (s.duration || 0);
          }
      });

      tasks.forEach(t => { if (t.created_at) addHour(t.created_at, 1); });
      habits.forEach(h => { if (h.last_completed_at) addHour(h.last_completed_at, 2); });
      journalRes.data?.forEach(j => addHour(j.created_at, 1));
      reflectRes.data?.forEach(r => addHour(r.created_at, 1));

      let maxCount = 0;
      let bestHour = -1;
      for (const [h, count] of Object.entries(hourCounts)) {
          if (count > maxCount) {
              maxCount = count;
              bestHour = parseInt(h);
          }
      }

      setWeeklyFocusData(weekly);
      setTotalFocusTime(totalTime);

      if (bestHour !== -1) {
          setPeakHour(`${bestHour}h00 - ${bestHour + 1}h00`);
          if (bestHour < 6) setChronoProfile("Insomniaque");
          else if (bestHour < 10) setChronoProfile("Lève-tôt (Alouette)");
          else if (bestHour < 14) setChronoProfile("Matin tardif");
          else if (bestHour < 18) setChronoProfile("Après-midi");
          else if (bestHour < 22) setChronoProfile("Soirée");
          else setChronoProfile("Oiseau de Nuit");
      }
  };

  const fetchHeatmapData = async () => {
      const activityMap: Record<string, number> = {};
      const today = new Date();
      for(let i=0; i<90; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          activityMap[key] = 0;
      }

      const { data: habitLogs } = await supabase.from('habit_completions').select('completed_date').eq('user_id', user.id);
      habitLogs?.forEach(log => {
          if (activityMap[log.completed_date] !== undefined) activityMap[log.completed_date] += 1;
      });

      const { data: focusLogs } = await supabase.from('focus_sessions').select('completed_at').eq('user_id', user.id);
      focusLogs?.forEach(log => {
          const k = log.completed_at.split('T')[0];
          if (activityMap[k] !== undefined) activityMap[k] += 2;
      });

      const result = Object.entries(activityMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([_, val]) => Math.min(4, val));

      setHeatmapData(result);
  };

  const switchTab = (tab: any) => {
      playMenuClick();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
  };

  const sendMessage = async () => {
      if (!chatInput.trim()) return;
      playMenuClick();
      const userMsg = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setLoadingAi(true);
      
      try {
          // 1. Fetch User Settings for permissions
          const { data: settings } = await supabase.from('user_settings').select('unlocked_features').eq('id', user.id).single();
          const permissions = settings?.unlocked_features?.ai_permissions || { tasks: true, habits: true, goals: true, journal: false, focus: true, profile: true };

          // 2. Build Context based on permissions
          const context: any = {};
          
          if (permissions.profile) context.user = { name: user.display_name, level: player.level };
          if (permissions.tasks) context.tasks = { pending: tasks.filter(t => !t.completed).map(t => t.title), completed_count: tasks.filter(t => t.completed).length };
          if (permissions.goals) context.goals = goals.map(g => ({ title: g.title, progress: g.progress }));
          if (permissions.habits) context.habits = habits.map(h => ({ title: h.title, streak: h.streak }));
          
          // Fetch extra data if permitted
          if (permissions.journal) {
              const { data: journal } = await supabase.from('journal_entries').select('title, content, mood').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
              const { data: reflection } = await supabase.from('daily_reflections').select('question, answer').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
              context.journal = journal;
              context.reflections = reflection;
          }

          if (permissions.focus) {
              const { data: focus } = await supabase.from('focus_sessions').select('duration, title').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(5);
              context.focus_history = focus;
          }

          const response = await generateActionableCoaching(userMsg, context, isCreationMode);
          
          if (response.action) {
              confirmAction(response.action);
          } else {
              setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
              playSuccess();
          }
      } catch (e) {
          setMessages(prev => [...prev, { role: 'ai', text: "Erreur de connexion au cerveau." }]);
      } finally {
          setLoadingAi(false);
      }
  };

  const confirmAction = (actionObj: any) => {
      const { action, data } = actionObj;
      Alert.alert("Action Requise", `Exécuter : ${action} ?`, [
          { text: "Non", style: "cancel" },
          { text: "Oui", onPress: () => {
              if (action === 'CREATE_TASK') onAddTask(data.title, 'medium');
              setMessages(prev => [...prev, { role: 'ai', text: "✅ C'est fait !" }]);
              playSuccess();
          }}
      ]);
  };

  // --- VISUALIZATIONS ---
  const RadarChart = () => {
      const size = 300; 
      const center = size / 2;
      const radius = 90; 
      const labels = ["Santé", "Loisirs", "Perso", "Appr.", "Mental", "Carrière"];
      
      const getPoints = (data: number[]) => {
          return data.map((val, i) => {
              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
              const r = (val / 100) * radius;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
      };
      
      const getLabelCoords = (i: number) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const r = radius + 25; 
          return {
              x: center + r * Math.cos(angle),
              y: center + r * Math.sin(angle)
          };
      };

      const gridLevels = [100, 75, 50, 25];

      return (
          <View style={{alignItems: 'center', marginVertical: 10}}>
              <Svg height={size} width={size}>
                  {/* Grid Lines */}
                  {gridLevels.map((pct, i) => (
                      <Polygon 
                        key={i} 
                        points={getPoints([pct, pct, pct, pct, pct, pct])} 
                        stroke={isDarkMode ? "#333" : "#E5E5EA"} 
                        strokeWidth="1" 
                        fill="none" 
                      />
                  ))}
                  
                  {/* Axes */}
                  {[0,1,2,3,4,5].map(i => {
                      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                      return (
                          <Line
                             key={i}
                             x1={center} y1={center}
                             x2={center + radius * Math.cos(angle)}
                             y2={center + radius * Math.sin(angle)}
                             stroke={isDarkMode ? "#333" : "#E5E5EA"}
                          />
                      );
                  })}
                  
                  {/* Data Shape */}
                  <Polygon 
                    points={getPoints(radarData)} 
                    fill={colors.accent} 
                    fillOpacity="0.3" 
                    stroke={colors.accent} 
                    strokeWidth="2" 
                  />
                  
                  {/* Labels */}
                  {labels.map((label, i) => {
                      const {x, y} = getLabelCoords(i);
                      return (
                          <SvgText
                              key={i}
                              x={x}
                              y={y}
                              fill={colors.text}
                              fontSize="12"
                              fontWeight="bold"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                          >
                              {label}
                          </SvgText>
                      );
                  })}
              </Svg>
          </View>
      )
  };

  const Heatmap = () => {
    const getColor = (val: number) => {
        if (val === 0) return isDarkMode ? '#222' : '#E5E5EA';
        if (val === 1) return '#E9D5FF';
        if (val === 2) return '#C4B5FD'; 
        if (val === 3) return '#8B5CF6'; 
        return '#7C3AED'; 
    };

    return (
        <View style={styles.heatmapGrid}>
            {heatmapData.map((val, i) => (
                <View key={i} style={[styles.heatBox, {backgroundColor: getColor(val)}]} />
            ))}
        </View>
    );
  };

  if (loading) return <SkeletonAnalysis />;

  return (
    <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80} 
    >
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <View style={styles.header}>
            <View style={{width: 40}} /> 
            <Text style={[styles.headerTitle, {color: colors.text}]}>Évolution</Text>
            <View style={{width: 40}} /> 
        </View>

        <View style={[styles.tabBar, {borderColor: colors.border}]}>
            {(['OVERVIEW', 'ANALYTICS', 'AI_COACH'] as const).map(tab => (
                <TouchableOpacity key={tab} onPress={() => switchTab(tab)} style={[styles.tabItem, activeTab === tab && {borderBottomColor: colors.accent, borderBottomWidth: 2}]}>
                    <Text style={[styles.tabText, activeTab === tab && {color: colors.text}]}>{tab === 'AI_COACH' ? 'COACH IA' : tab}</Text>
                </TouchableOpacity>
            ))}
        </View>

        {activeTab === 'OVERVIEW' && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={[styles.card, {backgroundColor: colors.card}]}>
                    <View style={styles.cardHeader}>
                        <Hexagon size={20} color={colors.accent} />
                        <Text style={[styles.cardTitle, {color: colors.text}]}>Roue de la Vie</Text>
                        {isAiWheel && <Sparkles size={16} color={colors.accent} style={{marginLeft: 'auto'}} />}
                    </View>
                    <RadarChart />
                    <Text style={styles.cardFooter}>
                        {isAiWheel ? "Analysé par IA (Habitudes, Journal, Tâches)" : "Calculé via mots-clés (Tâches & Habitudes)"}
                    </Text>
                </View>

                <View style={[styles.card, {backgroundColor: colors.card}]}>
                    <View style={styles.cardHeader}>
                        <Grid size={20} color={colors.success} />
                        <Text style={[styles.cardTitle, {color: colors.text}]}>Heatmap (90 Jours)</Text>
                    </View>
                    <Heatmap />
                    <View style={styles.legend}>
                        <Text style={styles.legendText}>Rien</Text>
                        <View style={[styles.heatBox, {backgroundColor: isDarkMode ? '#222' : '#E5E5EA'}]} />
                        <View style={[styles.heatBox, {backgroundColor: '#C4B5FD'}]} />
                        <View style={[styles.heatBox, {backgroundColor: '#7C3AED'}]} />
                        <Text style={styles.legendText}>Intense</Text>
                    </View>
                </View>

                <View style={[styles.card, {backgroundColor: colors.card}]}>
                    <View style={styles.cardHeader}>
                        <Clock size={20} color="#FACC15" />
                        <Text style={[styles.cardTitle, {color: colors.text}]}>Chronobiologie</Text>
                    </View>
                    <View style={styles.chronoContainer}>
                        <View>
                            <Text style={styles.label}>PROFIL</Text>
                            <Text style={[styles.value, {color: colors.text}]}>{chronoProfile}</Text>
                        </View>
                        <View>
                            <Text style={styles.label}>PIC D'ÉNERGIE</Text>
                            <Text style={[styles.value, {color: colors.text}]}>{peakHour}</Text>
                        </View>
                    </View>
                    <Text style={styles.cardFooter}>Analysé sur l'ensemble de votre activité (Tâches, Journal, Focus, Habitudes)</Text>
                </View>
            </ScrollView>
        )}

        {activeTab === 'ANALYTICS' && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.card, {backgroundColor: colors.card}]}>
                    <View style={styles.cardHeader}>
                        <BarChart2 size={20} color="#C4B5FD" />
                        <Text style={[styles.cardTitle, {color: colors.text}]}>Focus Hebdomadaire</Text>
                    </View>
                    <View style={styles.barChart}>
                        {weeklyFocusData.map((val, i) => (
                            <View key={i} style={styles.barColumn}>
                                <View style={[styles.barFill, {height: Math.min(100, (val / 120) * 100), backgroundColor: i===(new Date().getDay()) ? colors.accent : (isDarkMode ? '#333' : '#CCC')}]} />
                                <Text style={styles.barLabel}>{['D','L','M','M','J','V','S'][i]}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={[styles.cardFooter, {marginTop: 20}]}>Total cette semaine: {Math.floor(totalFocusTime/60)}h {totalFocusTime % 60}m</Text>
                </View>

                <View style={[styles.card, {backgroundColor: colors.card}]}>
                    <View style={styles.cardHeader}>
                        <Activity size={20} color={colors.success} />
                        <Text style={[styles.cardTitle, {color: colors.text}]}>KPIs Gloabux</Text>
                    </View>
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiItem}>
                            <Text style={[styles.kpiValue, {color: colors.text}]}>{tasks.filter(t => t.completed).length}</Text>
                            <Text style={styles.kpiLabel}>Tâches Finies</Text>
                        </View>
                        <View style={styles.kpiItem}>
                            <Text style={[styles.kpiValue, {color: colors.text}]}>{habits.filter(h => h.streak > 3).length}</Text>
                            <Text style={styles.kpiLabel}>Habitudes Solides</Text>
                        </View>
                        <View style={styles.kpiItem}>
                            <Text style={[styles.kpiValue, {color: colors.text}]}>{goals.filter(g => g.completed).length}</Text>
                            <Text style={styles.kpiLabel}>Objectifs Atteints</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        )}

        {activeTab === 'AI_COACH' && (
            <>
                <View style={[styles.aiSettings, {backgroundColor: colors.card}]}>
                    <Text style={[styles.aiSettingsTitle, {color: colors.subText}]}>
                        Pour modifier les données auxquelles l'IA a accès, rendez-vous dans Profil > Intelligence Artificielle.
                    </Text>
                </View>

                <ScrollView 
                    style={styles.chatContainer} 
                    contentContainerStyle={{paddingBottom: 20}}
                >
                    {messages.map((m, i) => (
                        <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : [styles.bubbleAi, {backgroundColor: isDarkMode ? '#262626' : '#E5E5EA'}]]}>
                            {m.role === 'ai' ? <Markdown style={{body: {color: colors.text}} as any}>{m.text}</Markdown> : <Text style={{color: '#FFF'}}>{m.text}</Text>}
                        </View>
                    ))}
                    {loadingAi && <ActivityIndicator style={{margin: 20, alignSelf: 'flex-start'}} />}
                </ScrollView>
                <View style={[styles.inputContainer, {backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: 100}]}>
                    <TextInput 
                        style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text}]} 
                        value={chatInput} 
                        onChangeText={setChatInput} 
                        placeholder="Posez une question..." 
                        placeholderTextColor="#888"
                    />
                    <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, {backgroundColor: colors.button}]}>
                        <Send size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </>
        )}

        </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#333' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  card: { borderRadius: 16, padding: 16, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardFooter: { fontSize: 11, textAlign: 'center', color: '#888', marginTop: 10, fontStyle: 'italic' },
  
  // Heatmap
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center' },
  heatBox: { width: 9, height: 9, borderRadius: 2 },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 10 },
  legendText: { fontSize: 10, color: '#888' },

  // Chrono
  chronoContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  label: { fontSize: 10, color: '#888', fontWeight: '700', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '700' },

  // Bar Chart
  barChart: { flexDirection: 'row', justifyContent: 'space-between', height: 150, alignItems: 'flex-end', paddingHorizontal: 10 },
  barColumn: { alignItems: 'center', gap: 6 },
  barFill: { width: 8, borderRadius: 4 },
  barLabel: { fontSize: 10, color: '#888' },
  
  // KPIs
  kpiGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  kpiItem: { alignItems: 'center', flex: 1 },
  kpiValue: { fontSize: 24, fontWeight: '700' },
  kpiLabel: { fontSize: 10, color: '#888', marginTop: 4 },

  // AI Settings
  aiSettings: {
      padding: 16,
      marginHorizontal: 20,
      borderRadius: 12,
      marginBottom: 10,
  },
  aiSettingsTitle: {
      fontSize: 11,
      fontStyle: 'italic',
      textAlign: 'center',
  },

  // Chat
  chatContainer: { flex: 1, paddingHorizontal: 20 },
  bubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '85%' },
  bubbleUser: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  bubbleAi: { alignSelf: 'flex-start' },
  inputContainer: { padding: 16, borderTopWidth: 1, flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }
});

export default Growth;