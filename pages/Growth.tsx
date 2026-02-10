
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions, Keyboard } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal } from '../types';
import { Send, MessageSquare, PlusCircle, Sparkles, BrainCircuit, PieChart, Activity, Calendar, Zap, RefreshCw } from 'lucide-react-native';
import { generateActionableCoaching, generateLifeWheelAnalysis } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playMenuClick, playSuccess } from '../services/sound';
import SkeletonAnalysis from '../components/SkeletonAnalysis';
import Markdown from 'react-native-markdown-display';
import Svg, { Polygon, Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

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
      subText: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      inputBg: isDarkMode ? '#171717' : '#FFFFFF',
      accent: '#C4B5FD',
      button: '#007AFF',
      createMode: '#10B981',
      chatMode: '#3B82F6',
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
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'AI_COACH'>('ANALYTICS');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  
  // Analysis Data
  const [lifeWheelData, setLifeWheelData] = useState<number[]>([60, 50, 70, 40, 80, 55]); // Health, Leisure, Personal, Learning, Mental, Career
  const [productivityScore, setProductivityScore] = useState(78);

  useEffect(() => {
      setTimeout(() => setLoading(false), 800);
      
      // Auto-load chat welcome
      const timer = setTimeout(() => {
          if (messages.length === 0) {
              setMessages([{ role: 'ai', text: `### Bonjour ${user.display_name?.split(' ')[0]} ! 👋\n\nJe suis **DeepFlow AI**. \n\n* Pose-moi une question sur ta productivité.\n* Demande-moi d'ajouter une tâche.\n\n*Comment puis-je t'aider ?*` }]);
          }
      }, 1000);
      return () => clearTimeout(timer);
  }, []);

  const refreshAnalysis = async () => {
      setLoading(true);
      const scores = await generateLifeWheelAnalysis({ tasks, habits, goals });
      if (scores) setLifeWheelData(scores);
      // Simuler calcul score
      const done = tasks.filter(t => t.completed).length;
      const total = tasks.length || 1;
      setProductivityScore(Math.round((done/total)*100));
      setLoading(false);
  };

  const switchTab = (tab: any) => {
      playMenuClick();
      setActiveTab(tab);
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
          const context: any = { user: { name: user.display_name }, tasks: tasks.slice(0,5), habits };
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

  // --- RENDER ANALYTICS ---
  const renderAnalytics = () => {
      const size = width - 80;
      const center = size / 2;
      const radius = size / 2;
      const categories = ["Santé", "Loisirs", "Perso", "Apprent.", "Mental", "Carrière"];
      
      // Calculate Polygon points
      const points = lifeWheelData.map((val, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const r = (val / 100) * radius;
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(" ");

      return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* HEADER SCORE */}
              <View style={[styles.scoreCard, { backgroundColor: colors.card }]}>
                  <View>
                      <Text style={[styles.scoreLabel, {color: colors.subText}]}>SCORE DE PRODUCTIVITÉ</Text>
                      <Text style={[styles.scoreValue, {color: colors.text}]}>{productivityScore}/100</Text>
                  </View>
                  <Activity size={32} color={colors.accent} />
              </View>

              {/* LIFE WHEEL */}
              <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                  <View style={styles.chartHeader}>
                      <Text style={[styles.chartTitle, {color: colors.text}]}>Roue de la Vie</Text>
                      <TouchableOpacity onPress={refreshAnalysis}>
                          <RefreshCw size={16} color={colors.subText} />
                      </TouchableOpacity>
                  </View>
                  <View style={{alignItems: 'center', marginVertical: 20}}>
                      <Svg height={size} width={size}>
                          {/* Spider Web Background */}
                          {[0.2, 0.4, 0.6, 0.8, 1].map((scale, k) => (
                              <Polygon
                                  key={k}
                                  points={categories.map((_, i) => {
                                      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                                      const r = radius * scale;
                                      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                                  }).join(" ")}
                                  stroke={colors.border}
                                  strokeWidth="1"
                                  fill="none"
                              />
                          ))}
                          {/* Axes */}
                          {categories.map((cat, i) => {
                              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                              return (
                                  <React.Fragment key={i}>
                                      <Line
                                          x1={center} y1={center}
                                          x2={center + radius * Math.cos(angle)}
                                          y2={center + radius * Math.sin(angle)}
                                          stroke={colors.border}
                                          strokeWidth="1"
                                      />
                                      {/* Labels */}
                                      <SvgText
                                          x={center + (radius + 20) * Math.cos(angle)}
                                          y={center + (radius + 20) * Math.sin(angle)}
                                          fill={colors.subText}
                                          fontSize="10"
                                          fontWeight="bold"
                                          textAnchor="middle"
                                          alignmentBaseline="middle"
                                      >
                                          {cat}
                                      </SvgText>
                                  </React.Fragment>
                              )
                          })}
                          {/* Data Polygon */}
                          <Polygon
                              points={points}
                              fill="rgba(196, 181, 253, 0.5)"
                              stroke={colors.accent}
                              strokeWidth="2"
                          />
                      </Svg>
                  </View>
              </View>

              {/* HEATMAP (Simplified) */}
              <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.chartTitle, {color: colors.text}]}>Consistance (30 jours)</Text>
                  <View style={styles.heatmapGrid}>
                      {Array.from({length: 30}).map((_, i) => {
                          const active = Math.random() > 0.4;
                          return (
                              <View 
                                  key={i} 
                                  style={[
                                      styles.heatmapCell, 
                                      { backgroundColor: active ? colors.accent : (isDarkMode ? '#333' : '#E5E5EA'), opacity: active ? Math.random() * 0.5 + 0.5 : 1 }
                                  ]} 
                              />
                          )
                      })}
                  </View>
              </View>

              {/* CHRONOBIOLOGY */}
              <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.chartTitle, {color: colors.text}]}>Chronobiologie</Text>
                  <View style={styles.chronoContainer}>
                      <Svg height="100" width="100%">
                          <Line x1="0" y1="50" x2="100%" y2="50" stroke={colors.border} strokeDasharray="4" />
                          {/* Sine wave approx */}
                          <Polygon 
                              points={`0,80 50,20 100,50 150,80 200,30 250,50 300,90`}
                              fill="none"
                              stroke={colors.createMode}
                              strokeWidth="3"
                          />
                      </Svg>
                      <View style={styles.chronoLabels}>
                          <Text style={{color: colors.subText, fontSize: 10}}>6h</Text>
                          <Text style={{color: colors.subText, fontSize: 10}}>12h</Text>
                          <Text style={{color: colors.subText, fontSize: 10}}>18h</Text>
                          <Text style={{color: colors.subText, fontSize: 10}}>22h</Text>
                      </View>
                  </View>
                  <Text style={{color: colors.subText, fontSize: 12, marginTop: 8}}>Pic d'énergie prévu vers 10h30.</Text>
              </View>
              
              <View style={{height: 100}} />
          </ScrollView>
      )
  };

  if (loading) return <SkeletonAnalysis />;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: noPadding ? 0 : insets.top }]}>
        
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <BrainCircuit size={28} color={colors.accent} />
                <Text style={[styles.headerTitle, {color: colors.text}]}>Assistant IA</Text>
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => switchTab('ANALYTICS')} style={[styles.tabItem, activeTab === 'ANALYTICS' && {backgroundColor: colors.card}]}>
                    <Text style={[styles.tabText, {color: activeTab === 'ANALYTICS' ? colors.text : colors.subText}]}>Analyse</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => switchTab('AI_COACH')} style={[styles.tabItem, activeTab === 'AI_COACH' && {backgroundColor: colors.card}]}>
                    <Text style={[styles.tabText, {color: activeTab === 'AI_COACH' ? colors.text : colors.subText}]}>Chat</Text>
                </TouchableOpacity>
            </View>
        </View>

        {activeTab === 'ANALYTICS' ? renderAnalytics() : (
            <KeyboardAvoidingView 
                style={{flex: 1}} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Offset pour ne pas cacher derrière le clavier
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
                
                {/* INPUT ZONE FIXED ABOVE BOTTOM NAV */}
                <View style={[styles.inputWrapper, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
                    <View style={styles.modeSwitchContainer}>
                        <TouchableOpacity style={[styles.modePill, !isCreationMode && {backgroundColor: colors.chatMode}]} onPress={() => setIsCreationMode(false)}>
                            <MessageSquare size={14} color={!isCreationMode ? "#FFF" : "rgba(255,255,255,0.5)"} />
                            <Text style={[styles.modeText, {color: "#FFF"}]}>Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modePill, isCreationMode && {backgroundColor: colors.createMode}]} onPress={() => setIsCreationMode(true)}>
                            <PlusCircle size={14} color={isCreationMode ? "#FFF" : "rgba(255,255,255,0.5)"} />
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
                        <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, {backgroundColor: isCreationMode ? colors.createMode : colors.button}]}>
                            {isCreationMode ? <Sparkles size={20} color="#FFF" /> : <Send size={20} color="#FFF" />}
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Spacer to lift input above BottomNav */}
                <View style={{height: 90, backgroundColor: colors.bg}} /> 
            </KeyboardAvoidingView>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 15, paddingTop: 10, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 },
  tabItem: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  tabText: { fontSize: 12, fontWeight: '700' },
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  scoreCard: { padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  scoreLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  scoreValue: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  
  chartCard: { padding: 20, borderRadius: 20, marginBottom: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chartTitle: { fontSize: 16, fontWeight: '700' },
  
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  heatmapCell: { width: (width - 80 - (6*5)) / 6, height: 24, borderRadius: 4 },
  
  chronoContainer: { marginTop: 10 },
  chronoLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },

  chatContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  bubble: { padding: 14, borderRadius: 18, marginBottom: 12, maxWidth: '88%' },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleAi: { alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  
  inputWrapper: { padding: 16, borderTopWidth: 1, gap: 12 }, 
  modeSwitchContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  modePill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, gap: 6, backgroundColor: '#333' },
  modeText: { fontSize: 12, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, fontSize: 16 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }
});

export default Growth;
