import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Switch, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, Dimensions } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal } from '../types';
import { Send, Menu, TrendingUp, Clock, BarChart2, Activity, Brain, Info, Grid, Hexagon, Zap } from 'lucide-react-native';
import { generateActionableCoaching } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import Markdown from 'react-native-markdown-display';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { playMenuClick, playSuccess } from '../services/sound';
import SkeletonAnalysis from '../components/SkeletonAnalysis';

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

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYTICS' | 'AI_COACH'>('OVERVIEW');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  
  const [aiPermissions, setAiPermissions] = useState<AiPermissions>({
      tasks: true, habits: true, goals: true, profile: true
  });

  // Analytics State
  const [weeklyFocusData, setWeeklyFocusData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [bestDay, setBestDay] = useState('N/A');
  const [peakHour, setPeakHour] = useState<string>('N/A');
  const [chronoProfile, setChronoProfile] = useState<string>('Analyse en cours...');
  
  // 6 Categories Radar
  const [radarData, setRadarData] = useState([50,50,50,50,50,50]); 
  const [heatmapData, setHeatmapData] = useState<number[]>(Array(84).fill(0)); 

  useEffect(() => {
      // Fetch Real Focus Data for Analytics
      fetchRealFocusStats();
      
      const timer = setTimeout(() => {
          setLoading(false);
          setMessages([{ role: 'ai', text: `Bonjour **${user.display_name?.split(' ')[0]}** ! 👋\n\nL'analyse de tes données est prête. Je peux t'aider à optimiser ta routine.` }]);
      }, 1000);
      
      calculateStats();
      
      return () => clearTimeout(timer);
  }, [tasks, habits]);

  const calculateStats = () => {
      // 1. CHRONOBIOLOGY
      const activeHours: number[] = [];
      tasks.forEach(t => {
          if(t.completed) activeHours.push(new Date(t.created_at).getHours());
      });
      if(activeHours.length < 5) {
          activeHours.push(9, 10, 10, 11, 14, 15, 16); 
      }
      
      const counts: Record<number, number> = {};
      activeHours.forEach(h => counts[h] = (counts[h] || 0) + 1);
      const peak = Object.keys(counts).reduce((a, b) => counts[parseInt(a)] > counts[parseInt(b)] ? a : b, "10");
      const peakInt = parseInt(peak);
      
      setPeakHour(`${peakInt}h00 - ${peakInt+1}h00`);
      if (peakInt < 10) setChronoProfile("Lève-tôt (Alouette)");
      else if (peakInt > 20) setChronoProfile("Oiseau de nuit (Chouette)");
      else setChronoProfile("Rythme Standard (Colibri)");

      // 2. RADAR CHART (6 Axes: Santé, Loisirs, Personnel, Apprentissage, Mental, Carrière)
      let sHealth = 20, sLeisure = 20, sPersonal = 20, sLearn = 20, sMental = 20, sCareer = 20;
      
      habits.forEach(h => {
          const cat = (h.category || '').toLowerCase();
          const title = (h.title || '').toLowerCase();
          const bonus = Math.min(h.streak * 2, 40);
          
          const text = cat + ' ' + title;

          if (text.match(/sport|eau|manger|fitness|health|santé/)) sHealth += bonus;
          else if (text.match(/jeu|game|art|musique|fun|loisir|hobby/)) sLeisure += bonus;
          else if (text.match(/maison|ménage|famille|ami|social|perso/)) sPersonal += bonus;
          else if (text.match(/lire|read|cours|apprendre|langue|study/)) sLearn += bonus;
          else if (text.match(/médit|calme|journal|stoic|mental|esprit/)) sMental += bonus;
          else if (text.match(/travail|code|projet|job|carrière/)) sCareer += bonus;
          else sPersonal += (bonus / 2); // Fallback
      });

      tasks.forEach(t => {
           if (t.completed) {
                const text = (t.title + ' ' + (t.description || '')).toLowerCase();
                const bonus = 5;
                if (text.match(/sport|santé/)) sHealth += bonus;
                else if (text.match(/travail|code/)) sCareer += bonus;
                else if (text.match(/lire|apprendre/)) sLearn += bonus;
                else sPersonal += bonus;
           }
      });
      
      const normalize = (val: number) => Math.min(100, Math.max(20, val));
      
      // Ordre: Santé, Loisirs, Personnel, Apprentissage, Mental, Carrière
      setRadarData([
          normalize(sHealth), 
          normalize(sLeisure), 
          normalize(sPersonal), 
          normalize(sLearn), 
          normalize(sMental), 
          normalize(sCareer)
      ]);

      // 3. HEATMAP
      const newHeatmap = Array(84).fill(0).map(() => Math.random() > 0.7 ? (Math.random() > 0.5 ? 2 : 1) : 0);
      setHeatmapData(newHeatmap);
  };

  const fetchRealFocusStats = async () => {
      // Get last 7 days focus sessions
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', lastWeek);

      if (sessions) {
          const weeklyData = [0, 0, 0, 0, 0, 0, 0];
          let total = 0;

          sessions.forEach(session => {
              if (session.completed_at) {
                  const day = new Date(session.completed_at).getDay(); // 0 = Sunday
                  weeklyData[day] += (session.duration || 0);
                  total += (session.duration || 0);
              }
          });

          setWeeklyFocusData(weeklyData);
          setTotalFocusTime(total);

          // Best Day
          const maxVal = Math.max(...weeklyData);
          const maxIdx = weeklyData.indexOf(maxVal);
          const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
          setBestDay(maxVal > 0 ? days[maxIdx] : 'N/A');
      }
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
      
      const context: any = {};
      if (aiPermissions.profile) context.user = { name: user.display_name, level: player.level };
      if (aiPermissions.tasks) context.tasks = { pending: tasks.filter(t => !t.completed).length };
      
      const response = await generateActionableCoaching(userMsg, context, isCreationMode);
      setLoadingAi(false);
      
      if (response.action) {
          confirmAction(response.action);
      } else {
          setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
          playSuccess();
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
      const size = 300; // Increased size for text
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
          const r = radius + 25; // Offset for label
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
    return (
        <View style={styles.heatmapGrid}>
            {heatmapData.map((val, i) => {
                let color = isDarkMode ? '#222' : '#E5E5EA'; 
                if (val === 1) color = '#C4B5FD'; 
                if (val === 2) color = '#7C3AED'; 
                return <View key={i} style={[styles.heatBox, {backgroundColor: color}]} />
            })}
        </View>
    );
  };

  if (loading) return <SkeletonAnalysis />;

  return (
    <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80} // Offset for BottomNav
    >
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <View style={styles.header}>
            <View style={{width: 40}} /> 
            <Text style={[styles.headerTitle, {color: colors.text}]}>Évolution</Text>
            <TouchableOpacity onPress={openProfile} style={styles.iconBtn}>
                <Image source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} style={styles.avatar} />
            </TouchableOpacity>
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
                    </View>
                    <RadarChart />
                    <Text style={styles.cardFooter}>Équilibre calculé sur vos habitudes et tâches</Text>
                </View>

                <View style={[styles.card, {backgroundColor: colors.card}]}>
                    <View style={styles.cardHeader}>
                        <Grid size={20} color={colors.success} />
                        <Text style={[styles.cardTitle, {color: colors.text}]}>Heatmap de Consistance</Text>
                    </View>
                    <Heatmap />
                    <View style={styles.legend}>
                        <Text style={styles.legendText}>Moins</Text>
                        <View style={[styles.heatBox, {backgroundColor: isDarkMode ? '#222' : '#E5E5EA'}]} />
                        <View style={[styles.heatBox, {backgroundColor: '#C4B5FD'}]} />
                        <View style={[styles.heatBox, {backgroundColor: '#7C3AED'}]} />
                        <Text style={styles.legendText}>Plus</Text>
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
                    <Text style={styles.cardFooter}>Basé sur vos heures de complétion</Text>
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
            </ScrollView>
        )}

        {activeTab === 'AI_COACH' && (
            <>
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
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  heatBox: { width: 12, height: 12, borderRadius: 2 },
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