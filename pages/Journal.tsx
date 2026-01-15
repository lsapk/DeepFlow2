import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { JournalEntry } from '../types';
import { Save, Smile, Meh, Frown, Zap, Coffee } from 'lucide-react-native';
import { supabase } from '../services/supabase';

interface JournalProps {
  userId: string;
}

const Journal: React.FC<JournalProps> = ({ userId }) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('neutral');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    // Assuming table 'journal_entries' exists. If not, this block handles graceful fail
    try {
        const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setEntries(data);
        }
    } catch (e) {
        console.log("Journal table might not exist yet", e);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setLoading(true);

    try {
        const newEntry = {
            user_id: userId,
            content,
            mood,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('journal_entries')
            .insert(newEntry)
            .select()
            .single();

        if (error) throw error;
        
        if (data) {
            setEntries([data, ...entries]);
            setContent('');
            Alert.alert("Saved", "Your reflection has been recorded.");
        }
    } catch (e: any) {
        Alert.alert("Error", "Could not save entry. " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const getMoodIcon = (m: string) => {
      switch(m) {
          case 'happy': return <Smile size={20} color="#34C759" />;
          case 'sad': return <Frown size={20} color="#5856D6" />;
          case 'energetic': return <Zap size={20} color="#FF9500" />;
          case 'tired': return <Coffee size={20} color="#8E8E93" />;
          default: return <Meh size={20} color="#007AFF" />;
      }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Journal</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.inputCard}>
                <Text style={styles.cardTitle}>Daily Reflection</Text>
                <TextInput
                    style={styles.textInput}
                    placeholder="What's on your mind? What did you achieve today?"
                    placeholderTextColor="#C7C7CC"
                    multiline
                    value={content}
                    onChangeText={setContent}
                />
                
                <View style={styles.moodRow}>
                    <Text style={styles.moodLabel}>Mood:</Text>
                    <View style={styles.moodSelector}>
                        {(['happy', 'neutral', 'sad', 'energetic', 'tired'] as const).map((m) => (
                            <TouchableOpacity 
                                key={m} 
                                onPress={() => setMood(m)}
                                style={[styles.moodBtn, mood === m && styles.moodBtnActive]}
                            >
                                {getMoodIcon(m)}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.saveButton, !content.trim() && styles.disabledBtn]} 
                    onPress={handleSave}
                    disabled={loading || !content.trim()}
                >
                    <Text style={styles.saveText}>Save Entry</Text>
                    <Save size={18} color="white" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>History</Text>
            
            {entries.length === 0 ? (
                <Text style={styles.emptyText}>No entries yet. Start writing!</Text>
            ) : (
                entries.map((entry) => (
                    <View key={entry.id} style={styles.entryCard}>
                        <View style={styles.entryHeader}>
                            <Text style={styles.entryDate}>
                                {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {getMoodIcon(entry.mood)}
                        </View>
                        <Text style={styles.entryContent}>{entry.content}</Text>
                    </View>
                ))
            )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  inputCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  textInput: {
    minHeight: 100,
    fontSize: 16,
    color: '#000',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moodLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  moodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  moodBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  moodBtnActive: {
    backgroundColor: '#E5E5EA',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  saveText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
    color: '#000',
  },
  entryCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  entryContent: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 20,
    fontStyle: 'italic',
  }
});

export default Journal;