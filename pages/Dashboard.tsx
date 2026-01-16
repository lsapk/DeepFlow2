import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Dimensions, StatusBar } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit } from '../types';
import { Check, Flame, Plus, Play, Menu, Sparkles, Search } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface DashboardProps {
  user: UserProfile;
  player: PlayerProfile;
  tasks: Task[];
  habits: Habit[];
  incrementHabit: (id: string) => void;
  toggleTask: (id: string) => void;
  openFocus: () => void;
  openProfile: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, player, tasks, habits, incrementHabit, toggleTask, openFocus, openProfile }) => {
  // Correction Bug Date : Comparaison stricte Jour/Mois/Année
  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getFullYear() === d2.getFullYear();
  };

  const today = new Date();
  
  const sortedHabits = [...habits].sort((a, b) => {
      const aDone = a.last_completed_at && isSameDay(new Date(a.last_completed_at), today);
      const bDone = b.last_completed_at && isSameDay(new Date(b.last_completed_at), today);
      if (aDone === bDone) return (a.sort_order || 0) - (b.sort_order || 0);
      return aDone ? 1 : -1;
  });

  const activeTasks = tasks.filter(t => !t.completed);
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* ChatGPT Style Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn}>
            <Menu size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.pillContainer}>
            <Sparkles size={14} color="#C4B5FD" style={{ marginRight: 6 }} />
            <Text style={styles.pillText}>DeepFlow Plus</Text>
        </View>

        <View style={styles.headerRight}>
             <TouchableOpacity style={[styles.iconBtn, { marginRight: 8 }]}>
                <Search size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openProfile} style={styles.avatarContainer}>
                 <Image 
                    source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                    style={styles.avatar} 
                />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Bonjour, {user.display_name?.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>Prêt à conquérir la journée ?</Text>
        </View>

        {/* Habits Row */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Habitudes</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitScroll}>
                {sortedHabits.map(habit => {
                    const isDone = habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), today);
                    return (
                        <TouchableOpacity 
                            key={habit.id} 
                            style={[styles.habitCard, isDone && styles.habitCardDone]} 
                            onPress={() => !isDone && incrementHabit(habit.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.habitTop}>
                                {isDone ? (
                                    <View style={styles.checkCircle}>
                                        <Check size={14} color="#000" strokeWidth={3} />
                                    </View>
                                ) : (
                                    <Flame size={20} color="#777" />
                                )}
                                <Text style={styles.habitStreak}>{habit.streak}</Text>
                            </View>
                            <Text style={[styles.habitTitle, isDone && styles.textMuted]} numberOfLines={2}>{habit.title}</Text>
                        </TouchableOpacity>
                    )
                })}
                <TouchableOpacity style={styles.addHabitCard}>
                    <Plus size={24} color="#444" />
                </TouchableOpacity>
            </ScrollView>
        </View>

        {/* Tasks List */}
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tâches</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeTasks.length}</Text>
                </View>
            </View>

            <View style={styles.taskList}>
                {activeTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Tout est calme ici.</Text>
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
                            <Text style={[styles.taskText, task.completed && styles.taskTextDone]} numberOfLines={1}>
                                {task.title}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </View>

      </ScrollView>

      {/* Minimalist Floating Focus Button */}
      <TouchableOpacity style={styles.fab} onPress={openFocus} activeOpacity={0.8}>
          <Play size={20} color="#000" fill="#000" />
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
    paddingTop: 10,
    paddingBottom: 10,
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: '#171717', // Dark Grey Button
  },
  pillContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1F1F1F',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#2C2C2C',
  },
  pillText: {
      color: '#E5E7EB',
      fontWeight: '600',
      fontSize: 14,
  },
  headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#171717',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 20,
  },
  welcomeSection: {
      paddingHorizontal: 20,
      marginBottom: 30,
  },
  greeting: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
  },
  subGreeting: {
      fontSize: 15,
      color: '#9CA3AF',
  },
  sectionContainer: {
      marginBottom: 32,
  },
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 8,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
  },
  badge: {
      backgroundColor: '#2C2C2C',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
  },
  badgeText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '600',
  },
  
  // Habits
  habitScroll: {
      paddingHorizontal: 20,
      gap: 12,
  },
  habitCard: {
      width: 120,
      height: 100,
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 14,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#262626',
  },
  habitCardDone: {
      backgroundColor: '#1A1A1A', // Slightly lighter or different tone? Keep dark for consistency
      borderColor: '#333',
      opacity: 0.6,
  },
  habitTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  habitStreak: {
      fontSize: 13,
      color: '#666',
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
      fontSize: 14,
      fontWeight: '500',
      color: '#EEE',
      lineHeight: 20,
  },
  textMuted: {
      color: '#777',
      textDecorationLine: 'line-through',
  },
  addHabitCard: {
      width: 50,
      height: 100,
      borderRadius: 16,
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
      borderColor: '#EF4444', // Red border for high priority
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
      bottom: 90,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
  }
});

export default Dashboard;