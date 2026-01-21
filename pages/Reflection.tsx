import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Image } from 'react-native';
import { Reflection } from '../types';
import { BrainCircuit, Sparkles, Send, X, Plus, Menu, Save, RefreshCw } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { addXp, REWARDS } from '../services/gamification';
import { generateReflectionQuestion } from '../services/ai';

interface ReflectionProps {
  userId: string;
  openMenu?: () => void;
}

const ReflectionPage: React.FC<ReflectionProps> = ({ userId, openMenu }) => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // State for new entry
  const [question, setQuestion] = useState('Chargement de la question...');
  const [answer, setAnswer] = useState('');
  const [loadingQ, setLoadingQ] = useState(false);

  useEffect(() => {
      if (userId) fetchReflections();
  }, [userId]);

  const fetchReflections = async () => {
      const { data } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setReflections(data);
  };

  const getNewQuestion = async () => {
      setLoadingQ(true);
      const q = await generateReflectionQuestion();
      setQuestion(q);
      setLoadingQ(false);
  };

  const openNewSession = () => {
      setModalVisible(true);
      setAnswer('');
      getNewQuestion();
  };

  const saveReflection = async () => {
      if (!answer.trim()) return;

      const { error } = await supabase.from('reflections').insert({
          user_id: userId,
          question: question,
          answer: answer,
          created_at: new Date().toISOString()
      });

      if (!error) {
          // Add XP
          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
          if (player) await addXp(userId, REWARDS.JOURNAL, player);

          fetchReflections();
          setModalVisible(false);
      } else {
          Alert.alert("Erreur", "Impossible de sauvegarder la réflexion.");
      }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            {openMenu && (
                 <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
                      <Menu size={24} color="#FFF" />
                 </TouchableOpacity>
            )}
            <Text style={styles.largeTitle}>Réflexion</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openNewSession}>
            <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {reflections.length === 0 ? (
              <View style={styles.emptyState}>
                  <BrainCircuit size={60} color="#333" style={{marginBottom: 20}} />
                  <Text style={styles.emptyText}>Prenez un moment pour vous.</Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={openNewSession}>
                      <Text style={styles.ctaText}>Commencer</Text>
                  </TouchableOpacity>
              </View>
          ) : (
              reflections.map((ref) => (
                  <View key={ref.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                              <Sparkles size={16} color="#C4B5FD" />
                              <Text style={styles.date}>{new Date(ref.created_at).toLocaleDateString()}</Text>
                          </View>
                      </View>
                      <Text style={styles.questionText}>{ref.question}</Text>
                      <View style={styles.divider} />
                      <Text style={styles.answerText}>{ref.answer}</Text>
                  </View>
              ))
          )}
      </ScrollView>

      {/* MODAL SIMILAIRE AU JOURNAL */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Introspection</Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                          <X size={24} color="#FFF" />
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={styles.aiBox}>
                          <View style={styles.aiLabel}>
                              <Sparkles size={16} color="#000" />
                              <Text style={styles.aiLabelText}>Question générée par IA</Text>
                          </View>
                          <Text style={styles.generatedQuestion}>
                              {loadingQ ? "Génération en cours..." : question}
                          </Text>
                          <TouchableOpacity style={styles.regenBtn} onPress={getNewQuestion} disabled={loadingQ}>
                              <RefreshCw size={14} color="#000" style={{marginRight: 6}} />
                              <Text style={styles.regenText}>Autre question</Text>
                          </TouchableOpacity>
                      </View>

                      <Text style={styles.label}>VOTRE RÉPONSE</Text>
                      <TextInput 
                          style={styles.input}
                          multiline
                          textAlignVertical="top"
                          placeholder="Écrivez librement ce que vous ressentez..."
                          placeholderTextColor="#666"
                          value={answer}
                          onChangeText={setAnswer}
                      />

                      <TouchableOpacity style={styles.saveBtn} onPress={saveReflection}>
                          <Save size={20} color="#000" />
                          <Text style={styles.saveBtnText}>Enregistrer (+20 XP)</Text>
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
    paddingVertical: 12,
    marginBottom: 10,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
      marginTop: 100,
      alignItems: 'center',
  },
  emptyText: {
      color: '#666',
      fontSize: 16,
      marginBottom: 20,
  },
  ctaBtn: {
      backgroundColor: '#C4B5FD',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
  },
  ctaText: {
      color: '#000',
      fontWeight: '600',
  },
  card: {
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
  },
  cardHeader: {
      marginBottom: 12,
  },
  date: {
      color: '#888',
      fontSize: 12,
      fontWeight: '600',
  },
  questionText: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
      fontStyle: 'italic',
      marginBottom: 4,
  },
  divider: {
      height: 1,
      backgroundColor: '#333',
      marginVertical: 12,
  },
  answerText: {
      color: '#CCC',
      fontSize: 15,
      lineHeight: 22,
  },
  
  // MODAL
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
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFF',
  },
  aiBox: {
      backgroundColor: '#C4B5FD',
      borderRadius: 16,
      padding: 16,
      marginBottom: 30,
  },
  aiLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
  },
  aiLabelText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'uppercase',
  },
  generatedQuestion: {
      color: '#000',
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 28,
      marginBottom: 16,
  },
  regenBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
  },
  regenText: {
      fontSize: 13,
      color: '#000',
      fontWeight: '600',
  },
  label: {
      color: '#888',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
      textTransform: 'uppercase',
  },
  input: {
      backgroundColor: '#171717',
      borderRadius: 12,
      padding: 16,
      color: '#FFF',
      fontSize: 16,
      minHeight: 200,
      borderWidth: 1,
      borderColor: '#333',
      marginBottom: 30,
  },
  saveBtn: {
      backgroundColor: '#FFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 10,
  },
  saveBtnText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 16,
  }
});

export default ReflectionPage;