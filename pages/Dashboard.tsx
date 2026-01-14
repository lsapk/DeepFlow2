import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PlayerProfile, UserProfile, Quest } from '../types';
import GamificationHeader from '../components/GamificationHeader';
import { ChevronRight, Target, Zap } from 'lucide-react-native';

interface DashboardProps {
  user: UserProfile;
  player: PlayerProfile;
  quests: Quest[];
  setView: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, player, quests, setView }) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GamificationHeader user={user} player={player} />

        {/* Quests Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Quests</Text>
            <TouchableOpacity>
                <Text style={styles.linkText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.listContainer}>
            {quests.slice(0, 3).map((quest, index) => (
                <View key={quest.id}>
                    <View style={styles.questItem}>
                        <View style={styles.questContent}>
                            <Text style={styles.questTitle} numberOfLines={1}>{quest.title}</Text>
                            <View style={styles.questMeta}>
                                <Text style={styles.questReward}>{quest.reward_xp} XP</Text>
                                <Text style={styles.questSep}>•</Text>
                                <Text style={[styles.questProgress, { color: quest.current_progress >= quest.target_value ? '#34C759' : '#8E8E93' }]}>
                                    {Math.round((quest.current_progress / quest.target_value) * 100)}%
                                </Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color="#C7C7CC" />
                    </View>
                    {index < quests.slice(0, 3).length - 1 && <View style={styles.separator} />}
                </View>
            ))}
          </View>
        </View>

        {/* Actions Grid */}
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.grid}>
                <TouchableOpacity 
                    onPress={() => setView('FOCUS')}
                    style={styles.gridItem}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#5856D6' }]}>
                        <Zap size={24} color="white" fill="white" />
                    </View>
                    <Text style={styles.gridLabel}>Focus Mode</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setView('TASKS')}
                    style={styles.gridItem}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}>
                        <Target size={24} color="white" />
                    </View>
                    <Text style={styles.gridLabel}>Add Task</Text>
                </TouchableOpacity>
            </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS Grouped Background
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 15,
    color: '#007AFF',
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },
  questContent: {
    flex: 1,
    marginRight: 16,
  },
  questTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  questMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questReward: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
  },
  questSep: {
    fontSize: 13,
    color: '#8E8E93',
    marginHorizontal: 4,
  },
  questProgress: {
    fontSize: 13,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
});

export default Dashboard;