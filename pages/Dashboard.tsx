import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, ViewState } from '../types';
import { Check, Flame, Plus, Play, Menu, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DashboardProps {
  user: UserProfile;
  player: PlayerProfile;
  tasks: Task[];
  habits: Habit[];
  toggleHabit: (id: string) => void;
  toggleTask: (id: string) => void;
  openFocus: () => void;
  openMenu: () => void;
  setView: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, player, tasks, habits, toggleHabit, toggleTask, openFocus, openMenu, setView }) => {
  const insets = useSafeAreaInsets();
  
  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getFullYear() === d2.getFullYear();
  };

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  
  // Filter habits for today
  const todaysHabits = habits.filter(h => {
      // If days_of_week is null or empty, assume everyday
      if (!h.days_of_week || h.days_of_week.length === 0) return true;
      // Check if current day index is in array
      return h.days_of_week.includes(dayOfWeek);
  });
  
  const sortedHabits = [...todaysHabits].sort((a, b) => {
      const aDone = a.last_completed_at && isSameDay(new Date(a.last_completed_at), today);
      const bDone = b.last_completed_at && isSameDay(new Date(b.last_completed_at), today);
      if (aDone === bDone) return (a.sort_order || 0) - (b.sort_order || 0);
      return aDone ? 1 : -1;
  });

  const activeTasks = tasks.filter(t => !t.completed).slice(0, 5); // Show top 5

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header avec espacement dynamique */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
            <Menu size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DeepFlow</Text>

        <View style={styles.avatarContainer}>
            <Image 
            source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
            style={styles.avatar} 
        />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Bonjour {user.display_name?.split(' ')[0]}</Text>
        </View>

        {/* Habits Section */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Habitudes du jour</Text>
                <TouchableOpacity onPress={() => setView(ViewState.HABITS)}>
                    <ArrowRight size={20} color="#666" />
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitScroll}>
                {sortedHabits.length === 0 && (
                    <Text style={{color: '#666', fontStyle: 'italic', padding: 10}}>Rien de prévu aujourd'hui.</Text>
                )}
                {sortedHabits.map(habit => {
                    const isDone = habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), today);
                    return (
                        <TouchableOpacity 
                            key={habit.id} 
                            style={[styles.habitCard, isDone && styles.habitCardDone]} 
                            onPress={() => toggleHabit(habit.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.habitTop}>
                                {isDone ? (
                                    <View style={styles.checkCircle}>
                                        <Check size={14} color="#000" strokeWidth={3} />
                                    </View>
                                ) : (
                                    <Flame size={20} color="#666" />
                                )}
                                <Text style={styles.habitStreak}>{habit.streak}</Text>
                            </View>
                            <Text style={[styles.habitTitle, isDone && styles.textMuted]} numberOfLines={2}>{habit.title}</Text>
                        </TouchableOpacity>
                    )
                })}
                <TouchableOpacity style={styles.addHabitCard} onPress={() => setView(ViewState.HABITS)}>
                    <Plus size={24} color="#444" />
                </TouchableOpacity>
            </ScrollView>
        </View>

        {/* Tasks Section */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tâches Prioritaires</Text>
                <TouchableOpacity onPress={() => setView(ViewState.TASKS)}>
                    <ArrowRight size={20} color="#666" />
                </TouchableOpacity>
            </View>

            <View style={styles.taskList}>
                {activeTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Aucune tâche urgente.</Text>
                    </View>
                ) : (
                    activeTasks.map((task) => (
                        <TouchableOpacity 
                            key={task.id} 
                            style={styles.taskRow} 
                            onPress={() => toggleTask(task.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.checkbox, 
                                task.completed && styles.checkboxDone,
                                task.priority === 'high' && styles.checkboxHigh
                            ]}>
                                {task.completed && <Check size={12} color="#000" strokeWidth={3} />}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={[styles.taskText, task.completed && styles.taskTextDone]} numberOfLines={1}>
                                    {task.title}
                                </Text>
                                {/* Indicator for linked Goal */}
                                {task.linked_goal_id && <View style={styles.linkedDot} />}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </View>

      </ScrollView>

      {/* Floating Focus Button */}
      <TouchableOpacity style={styles.fab} onPress={openFocus} activeOpacity={0.8}>
          <Play size={24} color="#000" fill="#000" style={{marginLeft: 4}} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, 
    marginBottom: 10,
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFF',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 130, // Espace pour le FAB et la Nav
    paddingTop: 10,
  },
  welcomeSection: {
      paddingHorizontal: 20,
      marginBottom: 30,
  },
  greeting: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: -0.5,
  },
  sectionContainer: {
      marginBottom: 32,
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 16,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
  },
  
  // Habits
  habitScroll: {
      paddingHorizontal: 20,
      gap: 12,
  },
  habitCard: {
      width: 110,
      height: 110,
      backgroundColor: '#171717',
      borderRadius: 20,
      padding: 14,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#262626',
  },
  habitCardDone: {
      backgroundColor: '#1C1C1E',
      borderColor: '#333',
      opacity: 0.5,
  },
  habitTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  habitStreak: {
      fontSize: 13,
      color: '#888',
      fontWeight: '600',
  },
  checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
  },
  habitTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#EEE',
      lineHeight: 18,
  },
  textMuted: {
      color: '#666',
      textDecorationLine: 'line-through',
  },
  addHabitCard: {
      width: 50,
      height: 110,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#262626',
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
  },

  // Tasks
  taskList: {
      marginHorizontal: 20,
  },
  taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#171717',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#262626',
  },
  checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: '#444',
      marginRight: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  checkboxDone: {
      backgroundColor: '#FFF',
      borderColor: '#FFF',
  },
  checkboxHigh: {
      borderColor: '#EF4444', 
  },
  taskText: {
      fontSize: 15,
      color: '#FFF',
      fontWeight: '500',
      flex: 1,
  },
  taskTextDone: {
      color: '#555',
      textDecorationLine: 'line-through',
  },
  linkedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FF9500',
      marginTop: 4,
  },
  emptyState: {
      padding: 20,
      alignItems: 'center',
      backgroundColor: '#111',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#222',
  },
  emptyText: {
      color: '#555',
      fontStyle: 'italic',
  },

  // FAB
  fab: {
      position: 'absolute',
      bottom: 110, 
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
      zIndex: 100,
  }
});

export default Dashboard;