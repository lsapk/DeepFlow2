import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Goal, JournalEntry, ViewState } from '../types';
import { supabase } from '../services/supabase';
import { Book, ArrowRight, Target } from 'lucide-react-native';
import Goals from './Goals';

interface GrowthProps {
  goals: Goal[];
  userId: string;
  setView: (view: ViewState) => void;
}

const GoalsWrapper = ({ goals, userId, close }: { goals: Goal[], userId: string, close: () => void }) => {
    const [localGoals, setLocalGoals] = useState<Goal[]>(goals);
    
    useEffect(() => { setLocalGoals(goals) }, [goals]);

    // Independent CRUD for the modal wrapper to ensure responsiveness if props lag
    // Note: In a perfect world, we just pass CRUD props from App -> Growth -> GoalsWrapper
    // But since we didn't want to refactor App's entire prop drill, this ensures functionality.
    
    const refresh = async () => {
         const { data } = await supabase.from('goals').select('*, subobjectives(*)').eq('user_id', userId).order('sort_order');
         if(data) {
             const sortedData = data.map(g => ({
                ...g,
                subobjectives: g.subobjectives?.sort((a: any, b: any) => a.sort_order - b.sort_order)
            }));
             setLocalGoals(sortedData);
         }
    };

    const toggle = async (id: string) => {
        const g = localGoals.find((x) => x.id === id);
        if(g) {
            await supabase.from('goals').update({completed: !g.completed}).eq('id', id);
            refresh();
        }
    };
    const add = async (title: string) => {
        const orders = localGoals.map(g => g.sort_order || 0);
        const max = orders.length > 0 ? Math.max(...orders) : 0;
        await supabase.from('goals').insert({user_id: userId, title, sort_order: max + 1});
        refresh();
    };
    const del = async (id: string) => {
        await supabase.from('goals').delete().eq('id', id);
        refresh();
    };

    return (
        <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
                 <TouchableOpacity onPress={close} style={styles.closeBtn}>
                     <Text style={styles.closeText}>Fermer</Text>
                 </TouchableOpacity>
             </View>
             <Goals 
                goals={localGoals} 
                userId={userId} 
                toggleGoal={toggle} 
                addGoal={add} 
                deleteGoal={del} 
                refreshGoals={refresh} 
             />
        </View>
    )
}

const Growth: React.FC<GrowthProps> = ({ goals, userId, setView }) => {
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
      fetchJournal();
  }, [userId]);

  const fetchJournal = async () => {
      try {
        const { data } = await supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(3);
        if (data) setJournalEntries(data);
      } catch(e) {}
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.largeTitle}>Croissance</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
             {/* Goals Teaser */}
             <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Target size={24} color="#FF9500" />
                    <Text style={styles.cardTitle}>Objectifs</Text>
                    <TouchableOpacity onPress={() => setShowAllGoals(true)} style={styles.arrowBtn}>
                        <ArrowRight size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.cardSub}>{goals.filter(g => !g.completed).length} en cours</Text>
             </View>

             {/* Journal Teaser */}
             <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Book size={24} color="#007AFF" />
                    <Text style={styles.cardTitle}>Journal</Text>
                    <TouchableOpacity onPress={() => setView(ViewState.JOURNAL)} style={styles.arrowBtn}>
                        <ArrowRight size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.cardSub}>Réflexion quotidienne</Text>
             </View>
        </ScrollView>

        <Modal visible={showAllGoals} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAllGoals(false)}>
             <GoalsWrapper 
                goals={goals} 
                userId={userId} 
                close={() => setShowAllGoals(false)} 
             />
        </Modal>
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
      paddingHorizontal: 20,
      gap: 16,
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
  card: {
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: '#262626',
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 12,
  },
  cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#FFF',
      flex: 1,
  },
  arrowBtn: {
      padding: 4,
  },
  cardSub: {
      color: '#888',
      fontSize: 14,
      marginLeft: 36,
  },
  modalContainer: {
      flex: 1,
      backgroundColor: '#000',
  },
  modalHeader: {
      padding: 16,
      alignItems: 'flex-end',
      backgroundColor: '#171717',
  },
  closeBtn: {
      padding: 8,
  },
  closeText: {
      color: '#007AFF',
      fontSize: 16,
      fontWeight: '600',
  }
});

export default Growth;