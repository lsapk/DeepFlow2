import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { PlayerProfile, UserProfile, Quest, Task, Habit } from '../types';
import { CheckCircle2, Zap, Trophy, BookOpen, Flag, BrainCircuit } from 'lucide-react-native';
import ProgressRing from '../components/ProgressRing';

interface DashboardProps {
  user: UserProfile;
  player: PlayerProfile;
  quests: Quest[];
  tasks: Task[];
  habits: Habit[];
  setView: (view: any) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

const Dashboard: React.FC<DashboardProps> = ({ user, player, quests, tasks, habits, setView }) => {
  
  // Calculate Stats
  const completedTasksToday = tasks.filter(t => t.completed).length; // Simplified for demo (should check date)
  const completedHabitsToday = habits.filter(h => {
       return h.last_completed_at && new Date(h.last_completed_at).toDateString() === new Date().toDateString();
  }).length;
  
  // Mock focus minutes (needs backend support later)
  const focusMinutes = 0; 

  const totalHabits = habits.length || 1; // avoid div by 0
  const habitProgress = completedHabitsToday / totalHabits;
  
  const totalTasks = tasks.length || 1;
  const taskProgress = completedTasksToday / totalTasks;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
            <Text style={styles.largeTitle}>Accueil</Text>
        </View>

        {/* Daily Report Section */}
        <View style={styles.reportContainer}>
            <Text style={styles.sectionTitle}>Rapport Quotidien</Text>
            <View style={styles.ringsRow}>
                <ProgressRing 
                    size={100} 
                    strokeWidth={8} 
                    progress={0} 
                    color="#5856D6" 
                    label="Focus" 
                    value={`${focusMinutes}m`} 
                />
                <ProgressRing 
                    size={100} 
                    strokeWidth={8} 
                    progress={taskProgress} 
                    color="#8E8E93" // Grey as per screenshot for Tasks (or Blue)
                    label="Tâches" 
                    value={completedTasksToday} 
                />
                <ProgressRing 
                    size={100} 
                    strokeWidth={8} 
                    progress={habitProgress} 
                    color="#34C759" 
                    label="Habitudes" 
                    value={completedHabitsToday} 
                />
            </View>
        </View>

        {/* Features Grid */}
        <View style={styles.gridContainer}>
            
            <TouchableOpacity style={styles.card} onPress={() => setView('TASKS')}>
                <View style={styles.cardContent}>
                    <CheckCircle2 size={32} color="#007AFF" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Tâches</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setView('HABITS')}>
                <View style={styles.cardContent}>
                    <Trophy size={32} color="#34C759" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Habitudes</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setView('GOALS')}>
                <View style={styles.cardContent}>
                    <Flag size={32} color="#FF9500" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Objectifs</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setView('JOURNAL')}>
                <View style={styles.cardContent}>
                    <BookOpen size={32} color="#FF3B30" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Journal</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setView('FOCUS')}>
                <View style={styles.cardContent}>
                    <Zap size={32} color="#5856D6" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Focus</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => setView('JOURNAL')}> 
                {/* Reusing Journal for Reflection/Reflexion as per screenshot, or make separate view */}
                <View style={styles.cardContent}>
                    <BrainCircuit size={32} color="#E0255E" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>Réflexion</Text>
                </View>
            </TouchableOpacity>

        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', 
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
  },
  reportContainer: {
      paddingHorizontal: 20,
      marginBottom: 30,
  },
  sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
      color: '#000',
  },
  ringsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 16,
  },
  card: {
      width: CARD_WIDTH,
      height: CARD_WIDTH * 0.85, // Slightly rectangular
      backgroundColor: 'white',
      borderRadius: 24, // High border radius like screenshot
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      justifyContent: 'flex-start',
  },
  cardContent: {
      flex: 1,
      justifyContent: 'space-between',
  },
  cardIcon: {
      marginBottom: 10,
  },
  cardTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: '#000',
  }
});

export default Dashboard;