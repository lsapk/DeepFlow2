import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, LayoutAnimation, Platform, UIManager } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, ViewState } from '../types';
import { Check, Flame, Plus, Play, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#007AFF',
      success: '#34C759',
      danger: '#FF3B30',
      orange: '#FF9500',
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

  const handleToggleTask = (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      toggleTask(id);
  }

  // Score Calcul
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
      if (score >= 80) return colors.success;
      if (score >= 60) return '#C4B5FD';
      if (score >= 40) return colors.orange;
      return colors.danger;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
            <Menu size={24} color={colors.accent} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
            <Text style={[styles.dateText, {color: colors.textSub}]}>
                {today.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).toUpperCase()}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Aujourd'hui</Text>
        </View>

        <TouchableOpacity onPress={openProfile}>
            <Image 
                source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                style={styles.avatar} 
            />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* PRODUCTIVITY CARD */}
        <View style={[styles.scoreCard, { backgroundColor: colors.cardBg }]}>
            <View>
                <Text style={[styles.scoreLabel, {color: colors.textSub}]}>PRODUCTIVITÉ</Text>
                <Text style={[styles.scoreLevel, { color: colors.text }]}>
                    {productivityScore >= 80 ? 'Excellent' : productivityScore >= 60 ? 'Bon' : 'Moyen'}
                </Text>
            </View>
            <View style={[styles.scoreCircle, { borderColor: isDarkMode ? '#333' : '#F2F2F7' }]}>
                <Text style={[styles.scoreValue, { color: getScoreColor(productivityScore) }]}>{productivityScore}</Text>
            </View>
        </View>

        {/* HABITS SECTION */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Habitudes</Text>
                <TouchableOpacity onPress={() => setView(ViewState.HABITS)}>
                    <Text style={[styles.seeAllText, {color: colors.accent}]}>Tout voir</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitScroll}>
                {sortedHabits.length === 0 && (
                    <Text style={{color: colors.textSub, fontStyle: 'italic', paddingLeft: 20}}>Rien de prévu.</Text>
                )}
                {sortedHabits.map(habit => {
                    const isDone = habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), today);
                    return (
                        <TouchableOpacity 
                            key={habit.id} 
                            style={[
                                styles.habitCard, 
                                { backgroundColor: colors.cardBg },
                                isDone && { opacity: 0.6 }
                            ]} 
                            onPress={() => toggleHabit(habit.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.habitTop}>
                                {isDone ? (
                                    <View style={[styles.checkCircle, {backgroundColor: colors.success}]}>
                                        <Check size={14} color="#FFF" strokeWidth={3} />
                                    </View>
                                ) : (
                                    <View style={[styles.iconCircle, {backgroundColor: isDarkMode ? '#333' : '#F2F2F7'}]}>
                                        <Flame size={18} color={colors.orange} />
                                    </View>
                                )}
                                <Text style={[styles.habitStreak, {color: colors.textSub}]}>{habit.streak}</Text>
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

        {/* TASKS SECTION */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tâches Urgentes</Text>
                <TouchableOpacity onPress={() => setView(ViewState.TASKS)}>
                    <Text style={[styles.seeAllText, {color: colors.accent}]}>Tout voir</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.taskList, { backgroundColor: colors.cardBg }]}>
                {activeTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, {color: colors.textSub}]}>Aucune urgence.</Text>
                    </View>
                ) : (
                    activeTasks.map((task, index) => (
                        <TouchableOpacity 
                            key={task.id} 
                            style={[styles.taskRow, index < activeTasks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
                            onPress={() => handleToggleTask(task.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, { borderColor: colors.textSub }, task.completed && { backgroundColor: colors.success, borderColor: colors.success }]}>
                                {task.completed && <Check size={12} color="#FFF" strokeWidth={3} />}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={[styles.taskText, { color: colors.text }, task.completed && styles.taskTextDone]} numberOfLines={1}>
                                    {task.title}
                                </Text>
                                {task.linked_goal_id && <View style={[styles.linkedDot, {backgroundColor: colors.orange}]} />}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </View>

      </ScrollView>

      {/* FAB */}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
  },
  headerTitleContainer: {
      position: 'absolute',
      left: 0, 
      right: 0,
      alignItems: 'center',
      zIndex: -1,
  },
  dateText: {
      fontSize: 10,
      fontWeight: '600',
      marginBottom: 2,
      letterSpacing: 1,
  },
  headerTitle: {
      fontSize: 20,
      fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  scrollContent: {
    paddingBottom: 130, 
  },
  scoreCard: {
      marginHorizontal: 20,
      marginBottom: 30,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
  },
  scoreLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      marginBottom: 4,
  },
  scoreLevel: {
      fontSize: 22,
      fontWeight: '700',
  },
  scoreCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
  },
  scoreValue: {
      fontSize: 18,
      fontWeight: '700',
  },
  sectionContainer: {
      marginBottom: 30,
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 14,
  },
  sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
  },
  seeAllText: {
      fontSize: 15,
      fontWeight: '500',
  },
  habitScroll: {
      paddingHorizontal: 20,
      gap: 12,
  },
  habitCard: {
      width: 120,
      height: 120,
      borderRadius: 20,
      padding: 14,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
  },
  habitTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
  },
  habitStreak: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 4,
  },
  checkCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  iconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  habitTitle: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
  },
  textMuted: {
      textDecorationLine: 'line-through',
  },
  addHabitCard: {
      width: 60,
      height: 120,
      borderRadius: 20,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
  },
  taskList: {
      marginHorizontal: 20,
      borderRadius: 20,
      overflow: 'hidden',
  },
  taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
  },
  checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      marginRight: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  taskText: {
      fontSize: 16,
      fontWeight: '500',
      flex: 1,
  },
  taskTextDone: {
      color: '#8E8E93',
      textDecorationLine: 'line-through',
  },
  linkedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 6,
  },
  emptyState: {
      padding: 20,
      alignItems: 'center',
  },
  emptyText: {
      fontStyle: 'italic',
  },
  fab: {
      position: 'absolute',
      bottom: 110, 
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#007AFF', // Apple Blue
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
      zIndex: 100,
  }
});

export default Dashboard;