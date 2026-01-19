import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { Reflection } from '../types';
import { BrainCircuit, Sparkles, Send, X, Plus } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { generateReflectionQuestion } from '../services/ai';

interface ReflectionProps {
  userId: string;
}

const ReflectionPage: React.FC<ReflectionProps> = ({ userId }) => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Create State
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

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

  const openNewSession = async () => {
      setModalVisible(true);
      setAnswer('');
      setLoadingAi(true);
      const q = await generateReflectionQuestion();
      setQuestion(q);
      setLoadingAi(false);
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
          fetchReflections();
          setModalVisible(false);
      } else {
          Alert.alert("Erreur", "Impossible de sauvegarder la réflexion.");
      }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
            <BrainCircuit size={28} color="#C4B5FD" />
            <Text style={styles.largeTitle}>Réflexion</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openNewSession}>
            <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {reflections.length === 0 ? (
              <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Commencez votre voyage intérieur.</Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={openNewSession}>
                      <Text style={styles.ctaText}>Lancer une Réflexion</Text>
                  </TouchableOpacity>
              </View>
          ) : (
              reflections.map((ref) => (
                  <View key={ref.id} style={styles.card}>
                      <Text style={styles.date}>{new Date(ref.created_at).toLocaleDateString()}</Text>
                      <Text style={styles.questionText}>{ref.question}</Text>
                      <View style={styles.divider} />
                      <Text style={styles.answerText}>{ref.answer}</Text>
                  </View>
              ))
          )}
      </ScrollView>

      {/* NEW REFLECTION MODAL */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Session Guidée</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <X size={24} color="#FFF" />
                  </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                  <View style={styles.aiBox}>
                      <View style={styles.aiLabel}>
                          <Sparkles size={16} color="#000" />
                          <Text style={styles.aiLabelText}>Question du jour</Text>
                      </View>
                      {loadingAi ? (
                          <ActivityIndicator color="#000" style={{marginTop: 10}} />
                      ) : (
                          <Text style={styles.generatedQuestion}>{question}</Text>
                      )}
                      <TouchableOpacity style={styles.regenBtn} onPress={async () => {
                          setLoadingAi(true);
                          const q = await generateReflectionQuestion();
                          setQuestion(q);
                          setLoadingAi(false);
                      }}>
                          <Text style={styles.regenText}>Autre question</Text>
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>VOTRE RÉPONSE</Text>
                  <TextInput 
                      style={styles.input}
                      multiline
                      textAlignVertical="top"
                      placeholder="Écrivez librement..."
                      placeholderTextColor="#666"
                      value={answer}
                      onChangeText={setAnswer}
                  />

                  <TouchableOpacity style={styles.saveBtn} onPress={saveReflection}>
                      <Send size={20} color="#000" />
                      <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </TouchableOpacity>
              </ScrollView>
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
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
      paddingHorizontal: 20,
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
      padding: 20,
      borderWidth: 1,
      borderColor: '#262626',
  },
  date: {
      color: '#666',
      fontSize: 12,
      marginBottom: 8,
      fontWeight: '600',
  },
  questionText: {
      color: '#C4B5FD',
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      fontStyle: 'italic',
  },
  divider: {
      height: 1,
      backgroundColor: '#333',
      marginVertical: 12,
  },
  answerText: {
      color: '#DDD',
      fontSize: 15,
      lineHeight: 22,
  },
  modalContainer: {
      flex: 1,
      backgroundColor: '#000',
      paddingTop: 20,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#222',
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFF',
  },
  modalBody: {
      padding: 20,
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
      fontWeight: '600',
      lineHeight: 28,
      marginBottom: 12,
  },
  regenBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 8,
  },
  regenText: {
      fontSize: 12,
      color: '#000',
      fontWeight: '600',
  },
  label: {
      color: '#666',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
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