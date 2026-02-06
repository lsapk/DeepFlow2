import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { JournalEntry } from '../types';
import { Save, Smile, Meh, Frown, Zap, Coffee, Plus, X, Menu, Calendar } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { addXp, REWARDS } from '../services/gamification';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface JournalProps {
  userId: string;
  openMenu?: () => void;
  isDarkMode?: boolean;
  noPadding?: boolean;
}

const Journal: React.FC<JournalProps> = ({ userId, openMenu, isDarkMode = true, noPadding = false }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('neutral');
  const [tagsInput, setTagsInput] = useState('');
  const [dateInput, setDateInput] = useState(''); // YYYY-MM-DDTHH:mm

  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFF' : '#000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#007AFF',
      orange: '#FF9500',
  };

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

  const openModal = () => {
      const now = new Date();
      // Format local simplified for input placeholder
      const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      
      // Auto Title like "20 janvier 2026"
      const autoTitle = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      
      setTitle(autoTitle);
      setDateInput(localIso);
      setModalVisible(true);
  };

  const handleSave = async () => {
      if (!title.trim() || !content.trim()) return;

      const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(t => t);
      
      let finalDate = new Date().toISOString();
      if (dateInput) {
          try {
              finalDate = new Date(dateInput).toISOString();
          } catch (e) {
              console.warn("Invalid date, using now");
          }
      }

      // 1. CREATE OPTIMISTIC ENTRY
      const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
      const newEntry: JournalEntry = {
          id: tempId,
          user_id: userId,
          title,
          content,
          mood,
          tags: tagsArray,
          created_at: finalDate
      };

      // 2. UPDATE UI IMMEDIATELY
      const previousEntries = [...entries];
      setEntries([newEntry, ...entries]);
      setModalVisible(false);
      
      // Reset Form
      setTitle('');
      setContent('');
      setMood('neutral');
      setTagsInput('');

      // 3. SEND TO SUPABASE
      const { data, error } = await supabase.from('journal_entries').insert({
          user_id: userId,
          title,
          content,
          mood,
          tags: tagsArray,
          created_at: finalDate
      }).select().single();

      if (error) {
          // 4. REVERT ON ERROR
          setEntries(previousEntries);
          Alert.alert("Erreur", "Impossible de sauvegarder l'entrée. Vérifiez votre connexion.");
      } else {
          // 5. UPDATE ID WITH REAL ID (AND ADD XP)
          setEntries(prev => prev.map(e => e.id === tempId ? data : e));
          
          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
          if (player) {
              await addXp(userId, REWARDS.JOURNAL, player);
          }
      }
  };

  const getMoodIcon = (m: string, size = 20, active = true) => {
      const color = active ? (m === mood ? '#FFF' : colors.textSub) : colors.textSub;
      // Active state bg is handled by container, this is icon color
      switch(m) {
          case 'happy': return <Smile size={size} color={active && m === mood ? '#000' : '#4ADE80'} />;
          case 'sad': return <Frown size={size} color={active && m === mood ? '#000' : '#F87171'} />;
          case 'energetic': return <Zap size={size} color={active && m === mood ? '#000' : '#FACC15'} />;
          case 'tired': return <Coffee size={size} color={active && m === mood ? '#000' : '#A8A29E'} />;
          default: return <Meh size={size} color={active && m === mood ? '#000' : '#9CA3AF'} />;
      }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: noPadding ? 0 : insets.top }]}>
        <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
                <Text style={[styles.largeTitle, { color: colors.text }]}>Journal</Text>
            </View>
            <TouchableOpacity onPress={openModal} style={styles.addButton}>
                <Plus size={24} color={colors.accent} />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {entries.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSub }]}>Aucune entrée. Écrivez vos pensées.</Text>
            )}
            {entries.map(entry => {
                const dateObj = new Date(entry.created_at);
                return (
                    <View key={entry.id} style={[styles.card, { backgroundColor: colors.cardBg }]}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.dayNum}>{dateObj.getDate()}</Text>
                                <Text style={styles.monthStr}>{dateObj.toLocaleDateString('fr-FR', {month: 'short'}).toUpperCase()}</Text>
                            </View>
                            <View style={styles.moodBadge}>
                                {getMoodIcon(entry.mood, 20, false)}
                            </View>
                        </View>
                        <View style={styles.cardBody}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{entry.title}</Text>
                            <Text style={[styles.timeStr, { color: colors.textSub }]}>
                                {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                            <Text style={[styles.cardContent, { color: colors.textSub }]} numberOfLines={3}>{entry.content}</Text>
                        </View>
                    </View>
                );
            })}
        </ScrollView>

        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
            <View style={[styles.modalOverlay, { backgroundColor: colors.bg }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle Entrée</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                             <Text style={{color: colors.accent, fontSize: 17, fontWeight: '600'}}>Annuler</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>HUMEUR</Text>
                        <View style={[styles.moodRow, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]}>
                            {['happy', 'energetic', 'neutral', 'tired', 'sad'].map(m => (
                                <TouchableOpacity 
                                    key={m} 
                                    onPress={() => setMood(m as any)}
                                    style={[styles.moodBtn, mood === m && { backgroundColor: colors.text }]}
                                >
                                    {getMoodIcon(m, 24, true)}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>TITRE</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text }]} 
                            placeholder="Titre..." 
                            placeholderTextColor={colors.textSub}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>DATE & HEURE (YYYY-MM-DDTHH:MM)</Text>
                        <View style={[styles.inputWithIcon, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]}>
                             <Calendar size={18} color={colors.textSub} style={{marginRight: 10}} />
                             <TextInput 
                                style={{ flex: 1, fontSize: 17, color: colors.text, height: 50 }} 
                                value={dateInput} 
                                onChangeText={setDateInput}
                            />
                        </View>
                        
                        <Text style={styles.label}>TAGS</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text }]} 
                            placeholder="ex: travail, idée..." 
                            placeholderTextColor={colors.textSub}
                            value={tagsInput}
                            onChangeText={setTagsInput}
                        />

                        <Text style={styles.label}>CONTENU</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text }]} 
                            placeholder="Écrivez ici..." 
                            placeholderTextColor={colors.textSub}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>Enregistrer</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 10, 
    marginBottom: 10,
    height: 50,
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50, // BUTTONS ON TOP
  },
  headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
  },
  largeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'left',
  },
  addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50, // BUTTONS ON TOP
  },
  scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
      gap: 16,
  },
  emptyText: {
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
  },
  card: {
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      gap: 16,
  },
  cardHeader: {
      alignItems: 'center',
      justifyContent: 'space-between',
      width: 50,
      borderRightWidth: 1,
      borderRightColor: '#333',
      paddingRight: 16,
  },
  dayNum: {
      fontSize: 24,
      fontWeight: '700',
      color: '#8E8E93',
  },
  monthStr: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8E8E93',
  },
  moodBadge: {
      marginTop: 10,
  },
  cardBody: {
      flex: 1,
  },
  cardTitle: {
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 2,
  },
  timeStr: {
      fontSize: 12,
      marginBottom: 8,
  },
  cardContent: {
      fontSize: 15,
      lineHeight: 20,
  },
  
  // Modal
  modalOverlay: {
      flex: 1,
  },
  modalContent: {
      flex: 1,
      padding: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      marginTop: 60,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '700',
  },
  label: {
      color: '#8E8E93',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'uppercase',
  },
  moodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      padding: 8,
      borderRadius: 12,
  },
  moodBtn: {
      padding: 10,
      borderRadius: 10,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
  },
  input: {
      borderRadius: 12,
      padding: 14,
      fontSize: 17,
      marginBottom: 24,
  },
  inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 24,
  },
  textArea: {
      minHeight: 150,
  },
  saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginBottom: 40,
  },
  saveBtnText: {
      color: '#FFF',
      fontSize: 17,
      fontWeight: '700',
  }
});

export default Journal;