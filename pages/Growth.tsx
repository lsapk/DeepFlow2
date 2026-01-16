import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Goal, JournalEntry, UserProfile } from '../types';
import { supabase } from '../services/supabase';
import ProgressRing from '../components/ProgressRing';
import { Book, Plus, ArrowRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface GrowthProps {
  goals: Goal[];
  userId: string;
}

const Growth: React.FC<GrowthProps> = ({ goals, userId }) => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  useEffect(() => {
      fetchJournal();
  }, [userId]);

  const fetchJournal = async () => {
      try {
        const { data } = await supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
        if (data) setJournalEntries(data);
      } catch(e) {}
  };

  const activeGoals = goals.filter(g => !g.completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
            <Text style={styles.largeTitle}>Croissance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Goals Section */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Objectifs</Text>
                <TouchableOpacity style={styles.iconBtn}><Plus size={20} color="#FFF" /></TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalScroll}>
                {activeGoals.map(goal => {
                    const totalSubs = goal.subobjectives?.length || 0;
                    const doneSubs = goal.subobjectives?.filter(s => s.completed).length || 0;
                    const progress = totalSubs > 0 ? doneSubs / totalSubs : (goal.progress ? goal.progress / 100 : 0);

                    return (
                        <View key={goal.id} style={styles.goalCard}>
                            <View style={styles.goalInfo}>
                                <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
                                <Text style={styles.goalMeta}>{doneSubs}/{totalSubs} steps completed</Text>
                            </View>
                            <ProgressRing 
                                size={44} 
                                strokeWidth={4} 
                                progress={progress} 
                                color="#FFFFFF" 
                                label="" 
                                value={`${Math.round(progress * 100)}%`} 
                            />
                        </View>
                    );
                })}
                {activeGoals.length === 0 && (
                     <View style={[styles.goalCard, {justifyContent: 'center', alignItems: 'center', width: 160}]}>
                         <Text style={{color: '#555'}}>No active goals.</Text>
                     </View>
                )}
            </ScrollView>
        </View>

        {/* Journal Section */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Journal</Text>
                <TouchableOpacity style={styles.iconBtn}><Book size={20} color="#FFF" /></TouchableOpacity>
            </View>

            <View style={styles.timeline}>
                <View style={styles.timelineLine} />
                {journalEntries.map((entry, index) => (
                    <View key={entry.id} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.entryCard}>
                            <Text style={styles.entryDate}>
                                {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                            <Text style={styles.entryContent} numberOfLines={3}>{entry.content}</Text>
                        </View>
                    </View>
                ))}
                {journalEntries.length === 0 && (
                     <View style={[styles.entryCard, { marginLeft: 0 }]}>
                         <Text style={styles.entryContent}>Start writing your thoughts...</Text>
                     </View>
                )}
            </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 10,
  },
  scrollContent: {
      paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingTop: 10,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  section: {
      marginBottom: 32,
  },
  sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFF',
  },
  iconBtn: {
      width: 32,
      height: 32,
      backgroundColor: '#171717',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
  },
  
  // Goals
  goalScroll: {
      paddingHorizontal: 20,
      gap: 12,
  },
  goalCard: {
      width: width * 0.65,
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#262626',
  },
  goalInfo: {
      flex: 1,
      marginRight: 12,
  },
  goalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFF',
      marginBottom: 4,
  },
  goalMeta: {
      fontSize: 12,
      color: '#888',
  },

  // Timeline
  timeline: {
      paddingHorizontal: 20,
      position: 'relative',
  },
  timelineLine: {
      position: 'absolute',
      left: 26, 
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: '#262626',
  },
  timelineItem: {
      flexDirection: 'row',
      marginBottom: 20,
  },
  timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#000',
      borderWidth: 2,
      borderColor: '#555',
      marginTop: 6,
      zIndex: 1,
      marginRight: 16,
  },
  entryCard: {
      flex: 1,
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
  },
  entryDate: {
      fontSize: 12,
      fontWeight: '700',
      color: '#666',
      marginBottom: 6,
      textTransform: 'uppercase',
  },
  entryContent: {
      fontSize: 15,
      color: '#DDD',
      lineHeight: 22,
  }
});

export default Growth;