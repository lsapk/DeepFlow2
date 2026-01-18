import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { PlayerProfile, UserProfile, Task } from '../types';
import { Bot, Gamepad2, Sparkles, Send, Shield } from 'lucide-react-native';
import { generateCoaching } from '../services/ai';

interface GrowthProps {
  player: PlayerProfile;
  user: UserProfile;
  tasks: Task[]; // For AI context
}

const Growth: React.FC<GrowthProps> = ({ player, user, tasks }) => {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: `Bonjour ${user.display_name?.split(' ')[0]} ! Je suis ton Cyber Knight. Prêt à optimiser ta journée ?` }
  ]);
  const [loadingAi, setLoadingAi] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
      if (!chatInput.trim()) return;
      
      const userMsg = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setLoadingAi(true);
      
      // AI Call
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
            <Text style={styles.largeTitle}>QG & IA</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        
        {/* GAMIFICATION STATS */}
        <View style={styles.statsCard}>
            <View style={styles.cardHeader}>
                 <View style={styles.levelBadge}>
                     <Shield size={20} color="#000" fill="#FFF" />
                     <Text style={styles.levelText}>NIVEAU {player.level}</Text>
                 </View>
                 <Text style={styles.creditsText}>{player.credits} Crédits</Text>
            </View>
            
            <View style={styles.avatarRow}>
                {/* Placeholder Avatar - In real app, render based on player.avatar_customization */}
                 <View style={styles.avatarCircle}>
                    <Gamepad2 size={40} color="#C4B5FD" />
                 </View>
                 <View style={{flex: 1}}>
                     <Text style={styles.rankTitle}>Cyber Knight</Text>
                     <Text style={styles.rankSub}>Expérience : {player.experience_points} XP</Text>
                 </View>
            </View>
            
            <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${(player.experience_points % 1000) / 10}%` }]} />
            </View>
            <Text style={styles.xpNext}>Prochain niveau dans {1000 - (player.experience_points % 1000)} XP</Text>
        </View>

        <Text style={styles.sectionLabel}>Assistant Tactique</Text>

        {/* CHAT INTERFACE */}
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
            placeholder="Demandez conseil..."
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
    paddingTop: 10,
  },
  header: {
      paddingHorizontal: 20,
      marginBottom: 10,
      paddingTop: 10,
  },
  largeTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFF',
  },
  scrollContent: {
      paddingBottom: 20,
      paddingHorizontal: 20,
  },
  statsCard: {
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
      marginBottom: 24,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  levelBadge: {
      backgroundColor: '#C4B5FD',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 6,
  },
  levelText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 12,
  },
  creditsText: {
      color: '#FACC15',
      fontWeight: '600',
  },
  avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
  },
  avatarCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#333',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#555',
  },
  rankTitle: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '600',
  },
  rankSub: {
      color: '#888',
      fontSize: 14,
  },
  xpBarBg: {
      height: 8,
      backgroundColor: '#333',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 6,
  },
  xpBarFill: {
      height: '100%',
      backgroundColor: '#C4B5FD',
  },
  xpNext: {
      color: '#666',
      fontSize: 11,
      textAlign: 'right',
  },
  sectionLabel: {
      color: '#666',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 12,
      textTransform: 'uppercase',
  },
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