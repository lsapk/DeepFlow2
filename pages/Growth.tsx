
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, Keyboard } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal } from '../types';
import { Send, MessageSquare, PlusCircle, Sparkles, BrainCircuit } from 'lucide-react-native';
import { generateActionableCoaching } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playMenuClick, playSuccess } from '../services/sound';
import SkeletonAnalysis from '../components/SkeletonAnalysis';
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
      createMode: '#10B981', // Vert pour création
      chatMode: '#3B82F6',    // Bleu pour chat
      userBubble: '#007AFF',
      aiBubble: isDarkMode ? '#2C2C2E' : '#E5E5EA'
  };

  // Styles Markdown dynamiques selon le thème
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
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'AI_COACH'>('AI_COACH');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);

  useEffect(() => {
      // Simulation chargement initial
      setTimeout(() => setLoading(false), 500);
      
      const timer = setTimeout(() => {
          if (messages.length === 0) {
              setMessages([{ role: 'ai', text: `### Salut ${user.display_name?.split(' ')[0]} ! 👋\n\nJe suis **DeepFlow AI**. \n\n🔹 Utilise le mode **Discussion** pour des conseils.\n🔹 Utilise le mode **Création** pour ajouter des tâches ou habitudes.\n\n*Comment puis-je t'aider aujourd'hui ?*` }]);
          }
      }, 800);
      return () => clearTimeout(timer);
  }, []);

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
      
      // Scroll to bottom
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      
      try {
          const context: any = {};
          if (!isCreationMode) {
             context.user = { name: user.display_name, level: player.level };
             context.tasks = tasks.slice(0, 5).map(t => ({ title: t.title, priority: t.priority }));
             context.habits = habits.map(h => ({ title: h.title, streak: h.streak }));
          }

          const response = await generateActionableCoaching(userMsg, context, isCreationMode);
          
          if (response.action) {
              confirmAction(response.action);
          } else {
              setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
              playSuccess();
          }
      } catch (e) {
          setMessages(prev => [...prev, { role: 'ai', text: "🚫 *Erreur de connexion au cerveau.*" }]);
      } finally {
          setLoadingAi(false);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
  };

  const confirmAction = (actionObj: any) => {
      const { action, data } = actionObj;
      let label = "Créer";
      if (action === 'CREATE_TASK') label = `Créer la tâche : "${data.title}"`;
      if (action === 'CREATE_HABIT') label = `Créer l'habitude : "${data.title}"`;
      if (action === 'CREATE_GOAL') label = `Créer l'objectif : "${data.title}"`;

      Alert.alert("Action IA Détectée ⚡", label, [
          { text: "Annuler", style: "cancel" },
          { text: "Confirmer", onPress: () => {
              if (action === 'CREATE_TASK') onAddTask(data.title, data.priority || 'medium');
              if (action === 'CREATE_HABIT') onAddHabit(data.title);
              if (action === 'CREATE_GOAL') onAddGoal(data.title);
              
              setMessages(prev => [...prev, { role: 'ai', text: `✅ C'est fait ! J'ai créé **"${data.title}"**.` }]);
              playSuccess();
          }}
      ]);
  };

  if (loading) return <SkeletonAnalysis />;

  return (
    <KeyboardAvoidingView 
        style={{flex: 1, backgroundColor: colors.bg}} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Ajusté pour éviter que la BottomNav cache l'input
    >
        <View style={[styles.container, { paddingTop: noPadding ? 0 : insets.top }]}>
        
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <BrainCircuit size={28} color={colors.accent} />
                <Text style={[styles.headerTitle, {color: colors.text}]}>Assistant IA</Text>
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => switchTab('AI_COACH')} style={[styles.tabItem, activeTab === 'AI_COACH' && {backgroundColor: colors.card}]}>
                    <Text style={[styles.tabText, {color: activeTab === 'AI_COACH' ? colors.text : colors.subText}]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => switchTab('ANALYTICS')} style={[styles.tabItem, activeTab === 'ANALYTICS' && {backgroundColor: colors.card}]}>
                    <Text style={[styles.tabText, {color: activeTab === 'ANALYTICS' ? colors.text : colors.subText}]}>Data</Text>
                </TouchableOpacity>
            </View>
        </View>

        {activeTab === 'ANALYTICS' && (
             <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={{color: colors.subText, textAlign: 'center', marginTop: 100}}>
                    📊 Analyses détaillées bientôt disponibles.
                </Text>
             </ScrollView>
        )}

        {activeTab === 'AI_COACH' && (
            <>
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
                                <Markdown style={markdownStyles as any}>
                                    {m.text}
                                </Markdown>
                            )}
                        </View>
                    ))}
                    {loadingAi && (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, margin: 20}}>
                            <ActivityIndicator size="small" color={colors.accent} />
                            <Text style={{color: colors.subText, fontSize: 12}}>DeepFlow analyse...</Text>
                        </View>
                    )}
                </ScrollView>
                
                {/* INPUT AREA FIXE */}
                <View style={[styles.inputWrapper, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
                    
                    {/* MODE SWITCHER */}
                    <View style={styles.modeSwitchContainer}>
                        <TouchableOpacity 
                            style={[styles.modePill, !isCreationMode && {backgroundColor: colors.chatMode}]} 
                            onPress={() => setIsCreationMode(false)}
                        >
                            <MessageSquare size={14} color={!isCreationMode ? "#FFF" : "rgba(255,255,255,0.5)"} />
                            <Text style={[styles.modeText, {color: "#FFF"}]}>Discussion</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.modePill, isCreationMode && {backgroundColor: colors.createMode}]} 
                            onPress={() => setIsCreationMode(true)}
                        >
                            <PlusCircle size={14} color={isCreationMode ? "#FFF" : "rgba(255,255,255,0.5)"} />
                            <Text style={[styles.modeText, {color: "#FFF"}]}>Création</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput 
                            style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text, borderColor: isCreationMode ? colors.createMode : 'transparent', borderWidth: isCreationMode ? 1 : 0}]} 
                            value={chatInput} 
                            onChangeText={setChatInput} 
                            placeholder={isCreationMode ? "Ex: Ajoute 'Sport' demain..." : "Posez une question..."}
                            placeholderTextColor={colors.subText}
                            multiline
                            maxHeight={100}
                        />
                        <TouchableOpacity 
                            onPress={sendMessage} 
                            style={[styles.sendBtn, {backgroundColor: isCreationMode ? colors.createMode : colors.button}]}
                            disabled={!chatInput.trim()}
                        >
                            {isCreationMode ? <Sparkles size={20} color="#FFF" /> : <Send size={20} color="#FFF" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </>
        )}

        </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 15, paddingTop: 10, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 },
  tabItem: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  tabText: { fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 20 },
  
  chatContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  bubble: { padding: 14, borderRadius: 18, marginBottom: 12, maxWidth: '88%' },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleAi: { alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  
  inputWrapper: { padding: 16, paddingBottom: 30, borderTopWidth: 1, gap: 12 }, // Padding bottom extra pour la sécurité
  modeSwitchContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 0 },
  modePill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, gap: 6, backgroundColor: '#333' },
  modeText: { fontSize: 12, fontWeight: '700' },
  
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, fontSize: 16 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 0 }
});

export default Growth;
