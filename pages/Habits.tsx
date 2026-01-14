import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Habit } from '../types';
import { Flame, Check, Plus } from 'lucide-react-native';

interface HabitsProps {
  habits: Habit[];
  incrementHabit: (id: string) => void;
}

const Habits: React.FC<HabitsProps> = ({ habits, incrementHabit }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Habits</Text>
        <TouchableOpacity style={styles.addButton}>
            <Plus size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {habits.map(habit => {
            const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toDateString() === new Date().toDateString();
            
            return (
                <View key={habit.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.iconContainer}>
                                <Flame size={20} color="#FF9500" fill="#FF9500" />
                            </View>
                            <Text style={styles.categoryLabel}>{habit.category?.toUpperCase() || 'GENERAL'}</Text>
                        </View>
                        <Text style={styles.streakCount}>{habit.streak} day streak</Text>
                    </View>

                    <Text style={styles.habitTitle}>{habit.title}</Text>

                    <View style={styles.cardFooter}>
                        <Text style={styles.frequencyText}>{habit.frequency}</Text>
                        <TouchableOpacity 
                            onPress={() => !isCompletedToday && incrementHabit(habit.id)}
                            disabled={isCompletedToday}
                            style={[
                                styles.actionButton, 
                                isCompletedToday ? styles.actionButtonCompleted : styles.actionButtonDefault
                            ]}
                        >
                            <Text style={[styles.actionButtonText, isCompletedToday && { color: '#007AFF' }]}>
                                {isCompletedToday ? 'Done' : 'Complete'}
                            </Text>
                            {isCompletedToday && <Check size={16} color="#007AFF" style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                    </View>
                </View>
            );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.37,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  streakCount: {
    fontSize: 13,
    color: '#8E8E93',
  },
  habitTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  frequencyText: {
    fontSize: 15,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionButtonDefault: {
    backgroundColor: '#007AFF',
  },
  actionButtonCompleted: {
    backgroundColor: '#E0F2FF',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default Habits;