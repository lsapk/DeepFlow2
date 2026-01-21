import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, ViewState } from '../types';
import { Check, Flame, Plus, Play, Menu, ArrowRight, Zap } from 'lucide-react-native';
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
  openProfile: () => void;
  setView: (view: ViewState) => void;
  isDarkMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, player, tasks, habits, toggleHabit, toggleTask, openFocus, openMenu, openProfile, setView, isDarkMode = true }) => {
  const insets = useSafeAreaInsets();
  
  const colors = {
      bg: isDarkMode ? '#000000' : '#F2F2F7',
      cardBg: isDarkMode ? '#171717' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#888' : '#666',
      border: isDarkMode ? '#262626' : '#E5E5EA',
      iconBtn: isDarkMode ? '#171717' : '#FFF',
  };

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getFullYear() === d2.getFullYear();
  };

  const today = new Date();
  const dayOfWeek = today.getDay(); 
  
  const todaysHabits = habits.filter(h => {
      if (!h.days_of_week || h.days_of_week.length === 0) return true;
      return h.days_of_week.includes(dayOfWeek);
  });
  
  const sortedHabits = [...todaysHabits].sort((a, b) => {
      const aDone = a.last_completed_at && isSameDay(new Date(a.last_completed_at), today);
      const bDone = b.last_completed_at && isSameDay(new Date(b.last_completed_at), today);
      if (aDone === bDone) return (a.sort_order || 0) - (b.sort_order || 0);
      return aDone ? 1 : -1;
  });

  const activeTasks = tasks.filter(t => !t.completed && t.priority === 'high').slice(0, 5); 

  // --- SCORE DE PRODUCTIVITÉ ---
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length || 1;
  const completionRate = completedTasksCount / totalTasks;
  const averageStreak = habits.length > 0 ? habits.reduce((acc, h) => acc + h.streak, 0) / habits.length : 0;
  
  let productivityScore = Math.round(
      (completionRate * 40) + 
      (Math.min(averageStreak, 30) / 30 * 20) + 
      (Math.min(player.level, 50) / 50 * 40)
  );
  if (productivityScore < 10) productivityScore = 15; 

  const getScoreColor = (score: number) => {
      if (score >= 80) return '#4ADE80';
      if (score >= 60) return '#C4B5FD';
      if (score >= 40) return '#FACC15';
      return '#F87171';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDarkMode ? 'transparent' : '#FFF' }]} onPress={openMenu}>
            <Menu size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>DeepFlow</Text>

        <TouchableOpacity onPress={openProfile}>
            <Image 
                source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                style={styles.avatar} 
            />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* PRODUCTIVITY SCORE CARD */}
        <View style={[styles.scoreCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View>
                <Text style={styles.scoreLabel}>Score de Productivité</Text>
                <Text style={[styles.scoreLevel, { color: colors.text }]}>
                    {productivityScore >= 80 ? 'Excellent' : productivityScore >= 60 ? 'Bon' : 'Moyen'}
                </Text>
            </View>
            <View style={[styles.scoreCircle, { borderColor: isDarkMode ? '#333' : '#EEE' }]}>
                <Text style={[styles.scoreValue, { color: getScoreColor(productivityScore) }]}>{productivityScore}</Text>
            </View>
        </View>

        <View style={styles.welcomeSection}>
            <Text style={[styles.greeting, { color: colors.text }]}>Bonjour {user.display_name?.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>Prêt à conquérir la journée, Cyber Knight ?</Text>
        </View>

        {/* Habits Section */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Habitudes du jour</Text>
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
                            style={[
                                styles.habitCard, 
                                { backgroundColor: colors.cardBg, borderColor: colors.border },
                                isDone && { opacity: 0.5, backgroundColor: isDarkMode ? '#222' : '#F0F0F0' }
                            ]} 
                            onPress={() => toggleHabit(habit.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.habitTop}>
                                {isDone ? (
                                    <View style={styles.checkCircle}>
                                        <Check size={14} color="#000" strokeWidth={3} />
                                    </View>
                                ) : (
                                    <Flame size={20} color={isDarkMode ? "#666" : "#FF9500"} />
                                )}
                                <Text style={styles.habitStreak}>{habit.streak}</Text>
                            </View>
                            <Text style={[styles.habitTitle, { color: colors.text }, isDone && styles.textMuted]} numberOfLines={2}>{habit.title}</Text>
                        </TouchableOpacity>
                    )
                })}
                <TouchableOpacity style={[styles.addHabitCard, { borderColor: colors.border }]} onPress={() => setView(ViewState.HABITS)}>
                    <Plus size={24} color={colors.textSub} />
                </TouchableOpacity>
            </ScrollView>
        </View>

        {/* Tasks Section */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Urgences (High)</Text>
                <TouchableOpacity onPress={() => setView(ViewState.TASKS)}>
                    <ArrowRight size={20} color="#666" />
                </TouchableOpacity>
            </View>

            <View style={styles.taskList}>
                {activeTasks.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <Text style={styles.emptyText}>Aucune tâche haute priorité.</Text>
                    </View>
                ) : (
                    activeTasks.map((task) => (
                        <TouchableOpacity 
                            key={task.id} 
                            style={[styles.taskRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]} 
                            onPress={() => toggleTask(task.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.checkbox, 
                                task.completed && styles.checkboxDone,
                                styles.checkboxHigh
                            ]}>
                                {task.completed && <Check size={12} color="#000" strokeWidth={3} />}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={[styles.taskText, { color: colors.text }, task.completed && styles.taskTextDone]} numberOfLines={1}>
                                    {task.title}
                                </Text>
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
          <Play size={24} color="#FFF" fill="#FFF" style={{marginLeft: 4}} />
      </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12, 
    marginBottom: 10,
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#171717',
  },
  scrollContent: {
    paddingBottom: 130, 
    paddingTop: 10,
  },
  scoreCard: {
      marginHorizontal: 20,
      marginBottom: 24,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
  },
  scoreLabel: {
      color: '#888',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 4,
  },
  scoreLevel: {
      fontSize: 24,
      fontWeight: '700',
  },
  scoreCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
  },
  scoreValue: {
      fontSize: 20,
      fontWeight: '700',
  },

  welcomeSection: {
      paddingHorizontal: 20,
      marginBottom: 30,
  },
  greeting: {
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.5,
  },
  subGreeting: {
      color: '#888',
      fontSize: 14,
      marginTop: 4,
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
  },
  
  // Habits
  habitScroll: {
      paddingHorizontal: 20,
      gap: 12,
  },
  habitCard: {
      width: 110,
      height: 110,
      borderRadius: 20,
      padding: 14,
      justifyContent: 'space-between',
      borderWidth: 1,
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
      lineHeight: 18,
  },
  textMuted: {
      textDecorationLine: 'line-through',
  },
  addHabitCard: {
      width: 50,
      height: 110,
      borderRadius: 20,
      borderWidth: 1,
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
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 16,
      marginBottom: 8,
      borderWidth: 1,
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
      borderRadius: 16,
      borderWidth: 1,
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
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 100,
  }
});

export default Dashboard;