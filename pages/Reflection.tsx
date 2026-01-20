import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Reflection } from '../types';
import { BrainCircuit, Sparkles, Send, X, Plus, Menu } from 'lucide-react-native';
import { supabase } from '../services/supabase';

// 100 Questions de développement personnel et d'introspection
const REFLECTION_QUESTIONS = [
    "Quelle est ma plus grande peur et pourquoi ?",
    "Si je ne pouvais pas échouer, que ferais-je aujourd'hui ?",
    "Quelles sont les 3 valeurs les plus importantes pour moi ?",
    "De quoi suis-je le plus fier cette semaine ?",
    "Quelle habitude me retient le plus en arrière ?",
    "Qui m'inspire le plus et pourquoi ?",
    "Quel est le dernier compliment que j'ai reçu et comment l'ai-je accueilli ?",
    "Quelle leçon douloureuse ai-je apprise récemment ?",
    "Si je pouvais parler à mon moi d'il y a 5 ans, que lui dirais-je ?",
    "Qu'est-ce qui me donne le plus d'énergie ?",
    "Qu'est-ce qui me draine le plus d'énergie ?",
    "Quelle est ma définition du succès ?",
    "Suis-je plus introverti ou extraverti, et comment cela influence-t-il ma vie ?",
    "Quel est le dernier livre ou film qui a changé ma perspective ?",
    "Si je devais mourir demain, quel serait mon plus grand regret ?",
    "Comment je réagis face au stress ?",
    "Quelle est ma plus grande qualité ?",
    "Quel est mon plus grand défaut sur lequel je veux travailler ?",
    "Qu'est-ce que je prends trop au sérieux ?",
    "Qu'est-ce que je ne prends pas assez au sérieux ?",
    "Quelle est la chose la plus gentille que j'ai faite pour quelqu'un récemment ?",
    "Quelle est la chose la plus gentille que quelqu'un a faite pour moi récemment ?",
    "Est-ce que je vis dans le passé, le présent ou le futur ?",
    "Quelles sont mes croyances limitantes ?",
    "Si l'argent n'existait pas, comment passerais-je mon temps ?",
    "Quelle relation dans ma vie a besoin de plus d'attention ?",
    "Quelle relation dans ma vie est toxique ?",
    "Qu'est-ce que je procrastine depuis longtemps ?",
    "Comment je me parle à moi-même (dialogue intérieur) ?",
    "Quelle est ma routine matinale idéale ?",
    "Quelle est ma routine du soir idéale ?",
    "Qu'est-ce que je dois pardonner (à moi-même ou aux autres) ?",
    "Quel est mon plus grand rêve d'enfant ?",
    "Est-ce que je suis heureux de la direction que prend ma vie ?",
    "Qu'est-ce que je ferais différemment si je recommençais cette année ?",
    "Quel risque devrais-je prendre ?",
    "Quelle compétence aimerais-je maîtriser ?",
    "Comment je définis l'amour ?",
    "Comment je définis l'amitié ?",
    "Qu'est-ce qui me met en colère et pourquoi ?",
    "Qu'est-ce qui me fait pleurer de joie ?",
    "Quelle est ma place dans l'univers ?",
    "Est-ce que je prends soin de mon corps ?",
    "Est-ce que je prends soin de mon esprit ?",
    "Quelle est la meilleure décision que j'ai prise ?",
    "Quelle est la pire décision que j'ai prise ?",
    "Comment je gère l'échec ?",
    "Comment je célèbre mes victoires ?",
    "Qu'est-ce que je veux laisser comme héritage ?",
    "Si je pouvais changer une chose dans le monde, ce serait quoi ?",
    "Quelle est ma citation préférée ?",
    "Quand me suis-je senti le plus vivant ?",
    "Qu'est-ce que je cache aux autres ?",
    "Qu'est-ce que je cache à moi-même ?",
    "Quelle est ma relation avec la technologie ?",
    "Suis-je un bon auditeur ?",
    "Est-ce que je juge trop vite les autres ?",
    "Quelle est la chose la plus courageuse que j'ai faite ?",
    "Qu'est-ce que je voudrais apprendre à mes enfants (ou futurs enfants) ?",
    "Quelle est ma saison préférée et pourquoi ?",
    "Quel est mon endroit préféré sur Terre ?",
    "Si je pouvais avoir un super-pouvoir, lequel serait-ce ?",
    "Quelle est la chose la plus importante que j'ai apprise cette année ?",
    "Comment je peux être plus bienveillant envers moi-même ?",
    "Qu'est-ce que je dois arrêter de faire immédiatement ?",
    "Qu'est-ce que je dois commencer à faire immédiatement ?",
    "Quelle est ma plus grande distraction ?",
    "Comment je définis la liberté ?",
    "Est-ce que je suis authentique ?",
    "Qu'est-ce qui me passionne vraiment ?",
    "Si je pouvais dîner avec une personne (vivante ou morte), qui serait-ce ?",
    "Quelle est ma plus grande insécurité ?",
    "Comment je réagis à la critique ?",
    "Est-ce que je demande de l'aide quand j'en ai besoin ?",
    "Qu'est-ce que je ferais si je savais que personne ne me jugerait ?",
    "Quelle est la chose la plus difficile que j'ai surmontée ?",
    "Qu'est-ce que je veux accomplir dans les 5 prochaines années ?",
    "Est-ce que je suis reconnaissant ?",
    "Pour quoi suis-je reconnaissant aujourd'hui ?",
    "Quelle est ma relation avec la nature ?",
    "Est-ce que je dors assez ?",
    "Quelle est ma relation avec la nourriture ?",
    "Qu'est-ce que je ferais avec 10 millions d'euros ?",
    "Quelle est la chose la plus drôle qui m'est arrivée ?",
    "Est-ce que je suis patient ?",
    "Comment je gère les conflits ?",
    "Quelle est ma définition de la beauté ?",
    "Est-ce que je suis curieux ?",
    "Qu'est-ce que je veux améliorer dans ma personnalité ?",
    "Si je pouvais vivre à une autre époque, laquelle choisirais-je ?",
    "Quelle est la chose la plus spontanée que j'ai faite ?",
    "Est-ce que je suis un leader ou un suiveur ?",
    "Quelle est ma plus grande source de stress ?",
    "Comment je me détends ?",
    "Est-ce que je suis fiable ?",
    "Quelle est la promesse que je dois me faire à moi-même ?",
    "Est-ce que je vis selon mes propres règles ou celles des autres ?",
    "Qu'est-ce que je ressens en ce moment précis ?",
    "Quelle question aimerais-je qu'on me pose ?"
];

interface ReflectionProps {
  userId: string;
  openMenu?: () => void;
}

const ReflectionPage: React.FC<ReflectionProps> = ({ userId, openMenu }) => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Create State
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

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

  const openNewSession = () => {
      setModalVisible(true);
      setAnswer('');
      // Pick a random question from the hardcoded list
      const randomQ = REFLECTION_QUESTIONS[Math.floor(Math.random() * REFLECTION_QUESTIONS.length)];
      setQuestion(randomQ);
  };

  const changeQuestion = () => {
      let newQ = question;
      // Ensure we get a different question
      while (newQ === question) {
          newQ = REFLECTION_QUESTIONS[Math.floor(Math.random() * REFLECTION_QUESTIONS.length)];
      }
      setQuestion(newQ);
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
        <View style={styles.leftRow}>
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
                  <Text style={styles.modalTitle}>Introspection</Text>
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
                      
                      <Text style={styles.generatedQuestion}>{question}</Text>
                      
                      <TouchableOpacity style={styles.regenBtn} onPress={changeQuestion}>
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
  leftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
  },
  largeTitle: {
    fontSize: 28,
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
  menuButton: {
    width: 40,
    height: 40,
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
      paddingVertical: 6,
      paddingHorizontal: 12,
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