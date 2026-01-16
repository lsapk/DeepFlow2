import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { JournalEntry } from '../types';
import { Save, Smile, Meh, Frown, Zap, Coffee, Plus, X, Calendar } from 'lucide-react-native';
import { supabase } from '../services/supabase';

interface JournalProps {
  userId: string;
}

const Journal: React.FC<JournalProps> = ({ userId }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('neutral');

  useEffect(() => {
      fetchEntries();
  }, [userId]);

  const fetchEntries = async () => {
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setEntries(data);
  };

  const handleSave = async () => {
      if (!title.trim() || !content.trim()) return;

      const { error } = await supabase.from('journal_entries').insert({
          user_id: userId,
          title,
          content,
          mood,
          created_at: new Date().toISOString()
      });

      if (!error) {
          fetchEntries();
          setModalVisible(false);
          setTitle('');
          setContent('');
          setMood('neutral');
      } else {
          Alert.alert("Erreur", "Impossible de sauvegarder l'entrée.");
      }
  };

  const getMoodIcon = (m: string, size = 20, active = true) => {
      const color = active ? (m === mood ? '#FFF' : '#666') : '#FFF';
      switch(m) {
          case 'happy': return <Smile size={size} color={active && m === mood ? '#4ADE80' : color} />;
          case 'sad': return <Frown size={size} color={active && m === mood ? '#F87171' : color} />;
          case 'energetic': return <Zap size={size} color={active && m === mood ? '#FACC15' : color} />;
          case 'tired': return <Coffee size={size} color={active && m === mood ? '#A8A29E' : color} />;
          default: return <Meh size={size} color={active && m === mood ? '#9CA3AF' : color} />;
      }
  };

  const getCardMoodIcon = (m: string) => {
      switch(m) {
          case 'happy': return <Smile size={18} color="#4ADE80" />;
          case 'sad': return <Frown size={18} color="#F87171" />;
          case 'energetic': return <Zap size={18} color="#FACC15" />;
          case 'tired': return <Coffee size={18} color="#A8A29E" />;
          default: return <Meh size={18} color="#9CA3AF" />;
      }
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.largeTitle}>Journal</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                <Plus size={24} color="#000" />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {entries.length === 0 && (
                <Text style={styles.emptyText}>Aucune entrée. Écrivez vos pensées.</Text>
            )}
            {entries.map(entry => (
                <View key={entry.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.date}>
                            {new Date(entry.created_at).toLocaleDateString()} • {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                        {getCardMoodIcon(entry.mood)}
                    </View>
                    <Text style={styles.cardTitle}>{entry.title}</Text>
                    <Text style={styles.cardContent} numberOfLines={3}>{entry.content}</Text>
                </View>
            ))}
        </ScrollView>

        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Nouvelle Entrée</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        <Text style={styles.label}>Humeur</Text>
                        <View style={styles.moodRow}>
                            {['happy', 'energetic', 'neutral', 'tired', 'sad'].map(m => (
                                <TouchableOpacity 
                                    key={m} 
                                    onPress={() => setMood(m as any)}
                                    style={[styles.moodBtn, mood === m && styles.moodBtnActive]}
                                >
                                    {getMoodIcon(m, 24)}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Titre</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Titre..." 
                            placeholderTextColor="#666"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>Contenu</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="Écrivez ici..." 
                            placeholderTextColor="#666"
                            value={content}
                            onChangeText={setContent}
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Save size={20} color="black" />
                            <Text style={styles.saveBtnText}>Sauvegarder</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 10,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
  },
  scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
      gap: 16,
  },
  emptyText: {
      color: '#666',
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
  },
  card: {
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
  },
  date: {
      color: '#666',
      fontSize: 12,
      fontWeight: '600',
  },
  cardTitle: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 6,
  },
  cardContent: {
      color: '#CCC',
      fontSize: 14,
      lineHeight: 20,
  },
  
  // Modal
  modalOverlay: {
      flex: 1,
      backgroundColor: '#000',
  },
  modalContent: {
      flex: 1,
      padding: 20,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
  },
  modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFF',
  },
  label: {
      color: '#888',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
      textTransform: 'uppercase',
  },
  moodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      backgroundColor: '#171717',
      padding: 10,
      borderRadius: 12,
  },
  moodBtn: {
      padding: 10,
      borderRadius: 8,
  },
  moodBtnActive: {
      backgroundColor: '#333',
  },
  input: {
      backgroundColor: '#171717',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#FFF',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#262626',
  },
  textArea: {
      minHeight: 150,
  },
  saveBtn: {
      backgroundColor: '#FFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
  },
  saveBtnText: {
      color: 'black',
      fontSize: 16,
      fontWeight: '700',
  }
});

export default Journal;