
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Reflection } from '../types';
import { BookOpen, Sparkles, Send, History, RefreshCw, PenLine, Menu, Calendar } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { addXp, REWARDS } from '../services/gamification';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReflectionProps {
  userId: string;
  openMenu?: () => void;
  isDarkMode?: boolean;
  noPadding?: boolean;
  deleteReflection?: (id: string) => void;
}

// 1. Base de données de questions (Extrait des 110+ questions)
const REFLECTION_QUESTIONS = [
    // Connaissance de soi
    "Quelle est votre plus grande source de motivation dans la vie ?",
    "Comment décririez-vous votre personnalité en quelques mots ?",
    "Quelles sont les trois valeurs les plus importantes pour vous ?",
    "Qu'est-ce qui vous draine le plus d'énergie au quotidien ?",
    "Dans quelles situations vous sentez-vous le plus authentique ?",
    
    // Développement personnel
    "Quelle version de vous-même voulez-vous devenir dans 5 ans ?",
    "Quelle habitude transformerait le plus votre vie si vous la maîtrisiez ?",
    "Quel est le plus grand obstacle qui vous empêche d'avancer aujourd'hui ?",
    "Quelle compétence aimeriez-vous apprendre cette année ?",
    "Si vous n'aviez pas peur d'échouer, que feriez-vous ?",

    // Questions profondes
    "Qui êtes-vous vraiment quand personne ne vous regarde ?",
    "Quel événement de votre enfance a le plus façonné qui vous êtes aujourd'hui ?",
    "Quelle est la leçon la plus difficile que vous ayez dû apprendre ?",
    "Si vous pouviez envoyer un message à votre 'vous' d'il y a 10 ans, que diriez-vous ?",
    "Qu'est-ce que vous ne pardonnez pas encore ?",

    // Réflexions émotionnelles
    "Quelle émotion avez-vous le plus de mal à exprimer et pourquoi ?",
    "Quel masque portez-vous le plus souvent face aux autres ?",
    "Quand avez-vous pleuré pour la dernière fois et pourquoi ?",
    "De quoi êtes-vous le plus reconnaissant aujourd'hui ?",
    "Quelle relation dans votre vie a besoin de plus d'attention ?"
];

const ReflectionPage: React.FC<ReflectionProps> = ({ userId, openMenu, isDarkMode = true, noPadding = false, deleteReflection }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'WRITE' | 'HISTORY'>('WRITE');
  
  // State Data
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = {
      bg: isDarkMode ? '#000' : '#F2F2F7',
      card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFF' : '#000',
      subText: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      inputBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      accent: '#C4B5FD', // Violet soft
      button: '#007AFF', // Apple Blue
      questionBg: isDarkMode ? 'rgba(196, 181, 253, 0.1)' : '#F5F3FF'
  };

  useEffect(() => {
      generateRandomQuestion();
      fetchReflections();
  }, [userId]);

  const generateRandomQuestion = () => {
      const randomIndex = Math.floor(Math.random() * REFLECTION_QUESTIONS.length);
      setCurrentQuestion(REFLECTION_QUESTIONS[randomIndex]);
  };

  const fetchReflections = async () => {
      setLoading(true);
      // Correction : Utilisation de la table daily_reflections
      const { data } = await supabase
        .from('daily_reflections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setReflections(data);
      setLoading(false);
  };

  const confirmDelete = (id: string) => {
      Alert.alert(
          "Supprimer cette réflexion ?",
          "Cette action est définitive.",
          [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: "destructive", onPress: () => {
                  if (deleteReflection) {
                      deleteReflection(id);
                      setReflections(prev => prev.filter(r => r.id !== id));
                  }
              }}
          ]
      );
  };

  const handleSave = async () => {
      if (!answer.trim()) {
          Alert.alert("Réponse vide", "Prenez le temps d'écrire quelques mots avant de sauvegarder.");
          return;
      }

      setSaving(true);
      
      // Sauvegarde DB - Correction table daily_reflections
      const { error } = await supabase.from('daily_reflections').insert({
          user_id: userId,
          question: currentQuestion,
          answer: answer.trim(),
          created_at: new Date().toISOString()
      });

      if (!error) {
          // Gamification
          const { data: player } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
          if (player) await addXp(userId, REWARDS.JOURNAL, player);

          Alert.alert("Réflexion sauvegardée !", "Bravo pour ce moment d'introspection.");
          setAnswer("");
          fetchReflections();
          generateRandomQuestion(); // Nouvelle question pour la prochaine fois
          setViewMode('HISTORY'); // Switch to history to see result
      } else {
          console.error(error);
          Alert.alert("Erreur", "Impossible de sauvegarder votre réflexion.");
      }
      setSaving(false);
  };

  const renderWriteMode = () => (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}} keyboardVerticalOffset={100}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Question Card */}
              <View style={[styles.questionCard, {backgroundColor: colors.questionBg, borderColor: colors.accent}]}>
                  <View style={styles.questionHeader}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                          <Sparkles size={16} color={colors.accent} fill={colors.accent} />
                          <Text style={[styles.questionLabel, {color: colors.accent}]}>QUESTION DU MOMENT</Text>
                      </View>
                      <TouchableOpacity onPress={generateRandomQuestion} style={styles.refreshBtn}>
                          <RefreshCw size={16} color={colors.subText} />
                      </TouchableOpacity>
                  </View>
                  <Text style={[styles.questionText, {color: colors.text}]}>{currentQuestion}</Text>
              </View>

              {/* Input Area */}
              <View style={[styles.inputContainer, {backgroundColor: colors.inputBg}]}>
                  <TextInput 
                      style={[styles.textArea, {color: colors.text}]}
                      multiline
                      textAlignVertical="top"
                      placeholder="Prenez le temps de réfléchir et écrivez votre réponse..."
                      placeholderTextColor={colors.subText}
                      value={answer}
                      onChangeText={setAnswer}
                  />
              </View>

              <TouchableOpacity 
                  style={[styles.saveBtn, {backgroundColor: colors.button}, !answer.trim() && {opacity: 0.5}]} 
                  onPress={handleSave}
                  disabled={saving || !answer.trim()}
              >
                  {saving ? <ActivityIndicator color="#FFF" /> : <Send size={20} color="#FFF" style={{marginRight: 8}} />}
                  <Text style={styles.saveBtnText}>{saving ? "Sauvegarde..." : "Sauvegarder la réflexion"}</Text>
              </TouchableOpacity>

          </ScrollView>
      </KeyboardAvoidingView>
  );

  const renderHistoryMode = () => (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.historyInfo}>
              <Text style={[styles.historyCount, {color: colors.subText}]}>{reflections.length} réflexions enregistrées</Text>
          </View>

          {reflections.length === 0 ? (
              <View style={styles.emptyState}>
                  <History size={48} color={colors.subText} style={{marginBottom: 16}} />
                  <Text style={[styles.emptyText, {color: colors.subText}]}>Votre historique est vide.</Text>
                  <TouchableOpacity onPress={() => setViewMode('WRITE')} style={{marginTop: 20}}>
                      <Text style={{color: colors.button, fontSize: 16, fontWeight: '600'}}>Commencer une réflexion</Text>
                  </TouchableOpacity>
              </View>
          ) : (
              reflections.map((item) => {
                  const date = new Date(item.created_at);
                  const formattedDate = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                  
                  return (
                      <TouchableOpacity 
                        key={item.id} 
                        style={[styles.historyCard, {backgroundColor: colors.card}]}
                        activeOpacity={0.7}
                        onLongPress={() => confirmDelete(item.id)}
                      >
                          <View style={styles.historyHeader}>
                              <Calendar size={14} color={colors.subText} style={{marginRight: 6}} />
                              <Text style={[styles.historyDate, {color: colors.subText}]}>{formattedDate}</Text>
                          </View>
                          
                          <View style={[styles.historyQuestionBox, {backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7'}]}>
                              <Text style={[styles.historyQuestion, {color: colors.text}]}>{item.question}</Text>
                          </View>
                          
                          <Text style={[styles.historyAnswer, {color: colors.subText}]}>{item.answer}</Text>
                      </TouchableOpacity>
                  );
              })
          )}
      </ScrollView>
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.bg, paddingTop: noPadding ? 0 : insets.top}]}>
      {/* Header Styled Apple */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, {color: colors.text}]}>Réflexion</Text>
        </View>

        {/* Toggle View Button */}
        <TouchableOpacity 
            style={[styles.toggleBtn, {backgroundColor: isDarkMode ? '#1C1C1E' : '#E5E5EA'}]}
            onPress={() => setViewMode(viewMode === 'WRITE' ? 'HISTORY' : 'WRITE')}
        >
            {viewMode === 'WRITE' ? (
                <>
                    <History size={16} color={colors.text} />
                    <Text style={[styles.toggleText, {color: colors.text}]}>Historique</Text>
                </>
            ) : (
                <>
                    <PenLine size={16} color={colors.text} />
                    <Text style={[styles.toggleText, {color: colors.text}]}>Écrire</Text>
                </>
            )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
          {viewMode === 'WRITE' ? renderWriteMode() : renderHistoryMode()}
      </View>
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
    paddingVertical: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
  },
  headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'left',
  },
  toggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      gap: 6,
      zIndex: 50,
  },
  toggleText: {
      fontSize: 12,
      fontWeight: '600',
  },
  contentContainer: {
      flex: 1,
  },
  scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 100,
  },
  
  // Write Mode Styles
  questionCard: {
      padding: 20,
      borderRadius: 20,
      marginBottom: 20,
      borderWidth: 1,
      marginTop: 10,
  },
  questionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  questionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
  },
  refreshBtn: {
      padding: 4,
  },
  questionText: {
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 30,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  inputContainer: {
      borderRadius: 20,
      padding: 16,
      minHeight: 250,
      marginBottom: 30,
  },
  textArea: {
      fontSize: 17,
      lineHeight: 24,
      minHeight: 220,
  },
  saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
  },
  saveBtnText: {
      color: '#FFF',
      fontSize: 17,
      fontWeight: '700',
  },

  // History Mode Styles
  historyInfo: {
      marginBottom: 16,
      alignItems: 'center',
  },
  historyCount: {
      fontSize: 13,
      fontWeight: '600',
  },
  emptyState: {
      alignItems: 'center',
      marginTop: 60,
      padding: 20,
  },
  emptyText: {
      fontSize: 16,
      fontStyle: 'italic',
  },
  historyCard: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
  },
  historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  historyDate: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  historyQuestionBox: {
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
  },
  historyQuestion: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
  },
  historyAnswer: {
      fontSize: 16,
      lineHeight: 24,
  }
});

export default ReflectionPage;
