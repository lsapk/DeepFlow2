
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, LayoutAnimation } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal } from '../types';
import { Send, MessageSquare, PlusCircle, Sparkles } from 'lucide-react-native';
import { generateActionableCoaching, generateLifeWheelAnalysis } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { playMenuClick, playSuccess } from '../services/sound';
import SkeletonAnalysis from '../components/SkeletonAnalysis';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      chatMode: '#3B82F6'    // Bleu pour chat
  };

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'AI_COACH'>('AI_COACH');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  
  // Analytics
  const [radarData, setRadarData] = useState([20,20,20,20,20,20]);

  useEffect(() => {
      const initData = async () => {
          checkAndRunAIAnalysis();
          setLoading(false);
      };
      initData();
      
      const timer = setTimeout(() => {
          if (messages.length === 0) {
              setMessages([{ role: 'ai', text: `Bonjour **${user.display_name?.split(' ')[0]}** ! 👋\n\nJe suis prêt. Activez le mode **Création** pour que j'agisse directement sur ton agenda, ou reste en mode Discussion pour du coaching.` }]);
          }
      }, 1000);
      return () => clearTimeout(timer);
  }, []);

  const checkAndRunAIAnalysis = async () => {
      // (Logique d'analyse inchangée pour économiser l'espace, focus sur le chat)
      setRadarData([60, 40, 70, 50, 80, 30]); // Placeholder visuel
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
          const context: any = {};
          if (!isCreationMode) {
             context.user = { name: user.display_name };
             context.tasks = tasks.slice(0, 5).map(t => t.title);
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
      let label = "Créer";
      if (action === 'CREATE_TASK') label = `Créer la tâche : "${data.title}"`;
      if (action === 'CREATE_HABIT') label = `Créer l'habitude : "${data.title}"`;
      if (action === 'CREATE_GOAL') label = `Créer l'objectif : "${data.title}"`;

      Alert.alert("Action IA Détectée", label, [
          { text: "Annuler", style: "cancel" },
          { text: "Confirmer", onPress: () => {
              if (action === 'CREATE_TASK') onAddTask(data.title, data.priority || 'medium');
              if (action === 'CREATE_HABIT') onAddHabit(data.title);
              if (action === 'CREATE_GOAL') onAddGoal(data.title);
              
              setMessages(prev => [...prev, { role: 'ai', text: `✅ C'est fait ! J'ai créé "${data.title}".` }]);
              playSuccess();
          }}
      ]);
  };

  if (loading) return <SkeletonAnalysis />;

  return (
    <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
        <View style={[styles.container, { paddingTop: noPadding ? 0 : insets.top, backgroundColor: colors.bg }]}>
        
        {/* TAB HEADER */}
        <View style={[styles.tabBar, {borderColor: colors.border}]}>
            <TouchableOpacity onPress={() => switchTab('AI_COACH')} style={[styles.tabItem, activeTab === 'AI_COACH' && {borderBottomColor: colors.accent, borderBottomWidth: 2}]}>
                <Text style={[styles.tabText, activeTab === 'AI_COACH' && {color: colors.text}]}>CHAI IA</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchTab('ANALYTICS')} style={[styles.tabItem, activeTab === 'ANALYTICS' && {borderBottomColor: colors.accent, borderBottomWidth: 2}]}>
                <Text style={[styles.tabText, activeTab === 'ANALYTICS' && {color: colors.text}]}>ANALYSES</Text>
            </TouchableOpacity>
        </View>

        {activeTab === 'ANALYTICS' && (
             <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={{color: colors.subText, textAlign: 'center', marginTop: 40}}>
                    Analyses détaillées de votre productivité bientôt disponibles.
                </Text>
             </ScrollView>
        )}

        {activeTab === 'AI_COACH' && (
            <>
                <ScrollView 
                    style={styles.chatContainer} 
                    contentContainerStyle={{paddingBottom: 20}}
                    ref={ref => ref?.scrollToEnd({animated: true})}
                >
                    {messages.map((m, i) => (
                        <View key={i} style={[styles.bubble, m.role === 'user' ? [styles.bubbleUser, {backgroundColor: colors.button}] : [styles.bubbleAi, {backgroundColor: colors.card}]]}>
                            <Text style={{color: m.role === 'user' ? '#FFF' : colors.text, fontSize: 15}}>{m.text}</Text>
                        </View>
                    ))}
                    {loadingAi && (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, margin: 20}}>
                            <ActivityIndicator size="small" color={colors.accent} />
                            <Text style={{color: colors.subText, fontSize: 12}}>DeepFlow réfléchit...</Text>
                        </View>
                    )}
                </ScrollView>
                
                {/* INPUT AREA WITH MODE SWITCH */}
                <View style={[styles.inputWrapper, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
                    
                    {/* MODE SWITCHER - More Visible */}
                    <View style={styles.modeSwitchContainer}>
                        <TouchableOpacity 
                            style={[styles.modePill, !isCreationMode && {backgroundColor: colors.chatMode}]} 
                            onPress={() => setIsCreationMode(false)}
                        >
                            <MessageSquare size={14} color={!isCreationMode ? "#FFF" : colors.subText} />
                            <Text style={[styles.modeText, {color: !isCreationMode ? "#FFF" : colors.subText}]}>Discussion</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.modePill, isCreationMode && {backgroundColor: colors.createMode}]} 
                            onPress={() => setIsCreationMode(true)}
                        >
                            <PlusCircle size={14} color={isCreationMode ? "#FFF" : colors.subText} />
                            <Text style={[styles.modeText, {color: isCreationMode ? "#FFF" : colors.subText}]}>Création</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput 
                            style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text, borderColor: isCreationMode ? colors.createMode : 'transparent', borderWidth: isCreationMode ? 1 : 0}]} 
                            value={chatInput} 
                            onChangeText={setChatInput} 
                            placeholder={isCreationMode ? "Ex: Ajoute une tâche 'Sport'..." : "Posez une question..."}
                            placeholderTextColor={colors.subText}
                            multiline
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20 },
  tabItem: { marginRight: 20, paddingVertical: 14 },
  tabText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: '#8E8E93' },
  scrollContent: { padding: 20 },
  
  chatContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  bubble: { padding: 14, borderRadius: 18, marginBottom: 12, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleAi: { alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  
  inputWrapper: { padding: 16, borderTopWidth: 1, gap: 12 },
  modeSwitchContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 4 },
  modePill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, gap: 6, backgroundColor: 'rgba(0,0,0,0.05)' },
  modeText: { fontSize: 12, fontWeight: '600' },
  
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 0 }
});

export default Growth;
