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
  isDarkMode?: boolean;
}

const ReflectionPage: React.FC<ReflectionProps> = ({ userId, openMenu, isDarkMode = true }) => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [question, setQuestion] = useState('Chargement de la question...');
  const [answer, setAnswer] = useState('');
  const [loadingQ, setLoadingQ] = useState(false);

  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFF' : '#000',
      subText: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#DDD',
      accent: '#C4B5FD',
      button: '#007AFF'
  };

  useEffect(() => {
      fetchReflections();
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
          Alert.alert("Erreur", "Impossible de sauvegarder.");
      }
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            {openMenu && (
                 <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
                      <Menu size={24} color={colors.button} />
                 </TouchableOpacity>
            )}
            <Text style={[styles.largeTitle, {color: colors.text}]}>Réflexion</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openNewSession}>
            <Plus size={24} color={colors.button} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {reflections.length === 0 ? (
              <View style={styles.emptyState}>
                  <BrainCircuit size={60} color={colors.subText} style={{marginBottom: 20}} />
                  <Text style={[styles.emptyText, {color: colors.subText}]}>Prenez un moment pour vous.</Text>
                  <TouchableOpacity style={[styles.ctaBtn, {backgroundColor: colors.accent}]} onPress={openNewSession}>
                      <Text style={styles.ctaText}>Commencer</Text>
                  </TouchableOpacity>
              </View>
          ) : (
              reflections.map((ref) => (
                  <View key={ref.id} style={[styles.card, {backgroundColor: colors.card}]}>
                      <View style={styles.cardHeader}>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                              <Sparkles size={14} color={colors.accent} fill={colors.accent} />
                              <Text style={styles.date}>{new Date(ref.created_at).toLocaleDateString('fr-FR')}</Text>
                          </View>
                      </View>
                      <Text style={[styles.questionText, {color: colors.text}]}>{ref.question}</Text>
                      <View style={[styles.divider, {backgroundColor: colors.border}]} />
                      <Text style={[styles.answerText, {color: colors.subText}]}>{ref.answer}</Text>
                  </View>
              ))
          )}
      </ScrollView>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
          <View style={[styles.modalOverlay, {backgroundColor: colors.bg}]}>
              <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, {color: colors.text}]}>Introspection</Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                           <Text style={{color: colors.button, fontSize: 17, fontWeight: '600'}}>Fermer</Text>
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={[styles.aiBox, {backgroundColor: 'rgba(196, 181, 253, 0.15)'}]}>
                          <View style={styles.aiLabel}>
                              <Sparkles size={14} color={colors.accent} />
                              <Text style={[styles.aiLabelText, {color: colors.accent}]}>Question générée par IA</Text>
                          </View>
                          <Text style={[styles.generatedQuestion, {color: colors.text}]}>
                              {loadingQ ? "Génération en cours..." : question}
                          </Text>
                          <TouchableOpacity style={styles.regenBtn} onPress={getNewQuestion} disabled={loadingQ}>
                              <RefreshCw size={14} color={colors.text} style={{marginRight: 6}} />
                              <Text style={[styles.regenText, {color: colors.text}]}>Autre question</Text>
                          </TouchableOpacity>
                      </View>

                      <Text style={styles.label}>VOTRE RÉPONSE</Text>
                      <TextInput 
                          style={[styles.input, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]}
                          multiline
                          textAlignVertical="top"
                          placeholder="Écrivez librement..."
                          placeholderTextColor={colors.subText}
                          value={answer}
                          onChangeText={setAnswer}
                      />

                      <TouchableOpacity style={[styles.saveBtn, {backgroundColor: colors.button}]} onPress={saveReflection}>
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
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
      fontSize: 16,
      marginBottom: 20,
  },
  ctaBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
  },
  ctaText: {
      color: '#000',
      fontWeight: '600',
  },
  card: {
      borderRadius: 16,
      padding: 20,
  },
  cardHeader: {
      marginBottom: 12,
  },
  date: {
      color: '#8E8E93',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  questionText: {
      fontSize: 19,
      fontWeight: '700',
      lineHeight: 26,
      marginBottom: 8,
  },
  divider: {
      height: 1,
      marginVertical: 12,
  },
  answerText: {
      fontSize: 16,
      lineHeight: 24,
  },
  modalOverlay: {
      flex: 1,
  },
  modalContent: {
      flex: 1,
      padding: 20,
      marginTop: 60,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '700',
  },
  aiBox: {
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
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'uppercase',
  },
  generatedQuestion: {
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 30,
      marginBottom: 16,
  },
  regenBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
  },
  regenText: {
      fontSize: 13,
      fontWeight: '600',
  },
  label: {
      color: '#8E8E93',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 10,
      textTransform: 'uppercase',
  },
  input: {
      borderRadius: 12,
      padding: 16,
      fontSize: 17,
      minHeight: 200,
      marginBottom: 30,
  },
  saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
  },
  saveBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 17,
  }
});

export default ReflectionPage;