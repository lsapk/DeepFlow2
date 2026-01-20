import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { PlayerProfile, UserProfile, Task } from '../types';
import { Send, Menu, Sparkles, TrendingUp, BrainCircuit } from 'lucide-react-native';
import { generateCoaching } from '../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GrowthProps {
  player: PlayerProfile;
  user: UserProfile;
  tasks: Task[]; 
  openMenu: () => void;
  openProfile: () => void;
}

const Growth: React.FC<GrowthProps> = ({ player, user, tasks, openMenu, openProfile }) => {
  const insets = useSafeAreaInsets();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: `Analyse terminée. Je détecte une productivité stable. Comment puis-je t'aider à passer au niveau supérieur ?` }
  ]);
  const [loadingAi, setLoadingAi] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
          pendingTasks: tasks.filter(t => !t.completed).length
      };

      const response = await generateCoaching(userMsg, context);
      
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
      setLoadingAi(false);
  };

  const tasksDone = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length || 1;
  const completionRate = Math.round((tasksDone / totalTasks) * 100);

  // Fake chart data bars
  const chartData = [40, 60, 30, 80, 50, 70, completionRate];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* UNIFORM HEADER */}
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

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        
        {/* SECTION 1: GRAPHIQUE PERTINENT */}
        <View style={styles.analysisCard}>
            <View style={styles.cardHeader}>
                <TrendingUp size={20} color="#C4B5FD" />
                <Text style={styles.cardTitle}>Productivité Hebdo</Text>
            </View>
            
            <View style={styles.chartContainer}>
                {chartData.map((val, idx) => (
                    <View key={idx} style={styles.barWrapper}>
                        <View style={[styles.bar, { height: `${val}%`, backgroundColor: idx === 6 ? '#C4B5FD' : '#333' }]} />
                        <Text style={styles.dayLabel}>{['L','M','M','J','V','S','D'][idx]}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.chartFooter}>Votre performance est supérieure de 12% à la semaine dernière.</Text>
        </View>

        {/* SECTION 2: ANALYSE APPROFONDIE (Resumé IA) */}
        <View style={styles.insightBox}>
             <View style={{flexDirection: 'row', gap: 10, marginBottom: 8}}>
                 <BrainCircuit size={18} color="#4ADE80" />
                 <Text style={styles.insightTitle}>Analyse Tactique</Text>
             </View>
             <Text style={styles.insightText}>
                 Vous avez complété {tasksDone} tâches critiques. 
                 L'analyse suggère de se concentrer sur les habitudes matinales pour maximiser le gain d'XP.
             </Text>
        </View>

        <Text style={styles.sectionLabel}>Liaison Neurale (Chat IA)</Text>

        {/* SECTION 3: CHAT */}
        <View style={styles.chatContainer}>
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
        </View>

      </ScrollView>

      {/* INPUT AREA */}
      <View style={styles.inputArea}>
          <TextInput 
            style={styles.textInput}
            placeholder="Interroger l'IA..."
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
    marginBottom: 10,
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
  scrollContent: {
      paddingBottom: 20,
      paddingHorizontal: 20,
  },
  
  // Chart Section
  analysisCard: {
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
      marginBottom: 16,
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
      marginBottom: 16,
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
  chartFooter: {
      color: '#888',
      fontSize: 12,
      fontStyle: 'italic',
  },

  // Insight Section
  insightBox: {
      backgroundColor: 'rgba(74, 222, 128, 0.05)',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(74, 222, 128, 0.2)',
      marginBottom: 24,
  },
  insightTitle: {
      color: '#4ADE80',
      fontWeight: '700',
      fontSize: 14,
  },
  insightText: {
      color: '#DDD',
      fontSize: 14,
      lineHeight: 20,
  },

  sectionLabel: {
      color: '#666',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 12,
      textTransform: 'uppercase',
  },
  
  // Chat
  chatContainer: {
      flex: 1,
      gap: 12,
  },
  messageBubble: {
      padding: 12,
      borderRadius: 16,
      maxWidth: '80%',
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
      marginBottom: 80, // Space for BottomNav
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