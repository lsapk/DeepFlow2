import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Habit, Goal } from '../types';
import { Flame, Check, Plus, Archive, X, Trash2, Save, RefreshCw, Calendar, Target, Filter, Menu } from 'lucide-react-native';
import { supabase } from '../services/supabase';

interface HabitsProps {
  habits: Habit[];
  goals: Goal[];
  incrementHabit: (id: string) => void;
  userId: string;
  refreshHabits: () => void;
  openMenu?: () => void;
}

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Dimanche to Samedi

const Habits: React.FC<HabitsProps> = ({ habits, goals, incrementHabit, userId, refreshHabits, openMenu }) => {
  const [showArchived, setShowArchived] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false); 
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [target, setTarget] = useState('1');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);

  const openCreateModal = () => {
      setEditingHabit(null);
      setTitle('');
      setDescription('');
      setCategory('General');
      setFrequency('daily');
      setTarget('1');
      setSelectedDays([]); 
      setLinkedGoalId(null);
      setModalVisible(true);
  };

  const openEditModal = (habit: Habit) => {
      setEditingHabit(habit);
      setTitle(habit.title);
      setDescription(habit.description || '');
      setCategory(habit.category || 'General');
      setFrequency(habit.frequency);
      setTarget(habit.target.toString());
      setSelectedDays(habit.days_of_week || []);
      setLinkedGoalId(habit.linked_goal_id || null);
      setModalVisible(true);
  };

  const toggleDay = (index: number) => {
      if (selectedDays.includes(index)) {
          setSelectedDays(selectedDays.filter(d => d !== index));
      } else {
          setSelectedDays([...selectedDays, index].sort());
      }
  };

  const handleSave = async () => {
      if (!title.trim()) return;

      const maxOrder = habits.length > 0 ? Math.max(...habits.map(h => h.sort_order || 0)) : 0;

      const habitData = {
          user_id: userId,
          title,
          description,
          category,
          frequency,
          target: parseInt(target) || 1,
          updated_at: new Date().toISOString(),
          days_of_week: selectedDays.length === 0 ? null : selectedDays,
          linked_goal_id: linkedGoalId
      };

      if (editingHabit) {
          await supabase.from('habits').update(habitData).eq('id', editingHabit.id);
      } else {
          await supabase.from('habits').insert({
              ...habitData,
              streak: 0,
              is_archived: false,
              sort_order: maxOrder + 1 
          });
      }

      setModalVisible(false);
      refreshHabits();
  };

  const handleArchive = async (habit: Habit) => {
      await supabase.from('habits').update({ is_archived: !habit.is_archived }).eq('id', habit.id);
      setModalVisible(false);
      refreshHabits();
  };

  const handleDelete = async (id: string) => {
      Alert.alert("Supprimer", "Cette action est irréversible.", [
          { text: "Annuler", style: "cancel" },
          { text: "Supprimer", style: "destructive", onPress: async () => {
              await supabase.from('habits').delete().eq('id', id);
              setModalVisible(false);
              refreshHabits();
          }}
      ]);
  };

  const todayIndex = new Date().getDay();

  const displayedHabits = habits.filter(h => {
      if (showArchived) return !!h.is_archived;
      if (h.is_archived) return false;
      
      if (showAllDays) return true;
      if (!h.days_of_week || h.days_of_week.length === 0) return true;
      return h.days_of_week.includes(todayIndex);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
             {openMenu && (
                  <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
                      <Menu size={24} color="#FFF" />
                  </TouchableOpacity>
             )}
             <View>
                 <Text style={styles.largeTitle}>Habitudes</Text>
                 <Text style={styles.subtitle}>{showAllDays ? 'Toutes les habitudes' : 'Aujourd\'hui'}</Text>
             </View>
        </View>
        <View style={styles.headerButtons}>
            <TouchableOpacity 
                style={[styles.iconBtn, showAllDays && styles.iconBtnActive]} 
                onPress={() => setShowAllDays(!showAllDays)}
            >
                <Filter size={20} color={showAllDays ? "white" : "#FFF"} />
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.iconBtn, showArchived && styles.iconBtnActive]} 
                onPress={() => setShowArchived(!showArchived)}
            >
                <Archive size={20} color={showArchived ? "white" : "#FFF"} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                <Plus size={24} color="black" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayedHabits.length === 0 && (
            <Text style={styles.emptyText}>
                {showArchived ? "Aucune archive." : (showAllDays ? "Aucune habitude crée." : "Rien de prévu aujourd'hui.")}
            </Text>
        )}
        {displayedHabits.map(habit => {
            const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toDateString() === new Date().toDateString();
            const isScheduledToday = !habit.days_of_week || habit.days_of_week.length === 0 || habit.days_of_week.includes(todayIndex);

            return (
                <TouchableOpacity 
                    key={habit.id} 
                    style={[styles.card, !isScheduledToday && styles.cardDimmed]}
                    onLongPress={() => openEditModal(habit)}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: isCompletedToday ? '#34C759' : '#333' }]}>
                                <Flame size={16} color={isCompletedToday ? "white" : "#666"} fill={isCompletedToday ? "white" : "#666"} />
                            </View>
                            <Text style={styles.categoryLabel}>{habit.category?.toUpperCase() || 'GENERAL'}</Text>
                        </View>
                        <Text style={styles.streakCount}>{habit.streak} jrs</Text>
                    </View>

                    <Text style={styles.habitTitle}>{habit.title}</Text>
                    {habit.description && <Text style={styles.habitDesc} numberOfLines={1}>{habit.description}</Text>}

                    <View style={styles.cardFooter}>
                        <View style={styles.freqBadge}>
                             <RefreshCw size={12} color="#666" style={{marginRight: 4}} />
                             <Text style={styles.frequencyText}>{habit.frequency}</Text>
                        </View>
                        
                        {!showArchived && (
                            <TouchableOpacity 
                                onPress={() => incrementHabit(habit.id)}
                                style={[
                                    styles.actionButton, 
                                    isCompletedToday ? styles.actionButtonCompleted : styles.actionButtonDefault,
                                    !isScheduledToday && { opacity: 0.5 }
                                ]}
                            >
                                <Text style={[styles.actionButtonText, isCompletedToday && { color: '#000' }]}>
                                    {isCompletedToday ? 'Fait' : 'Valider'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            );
        })}
      </ScrollView>

      {/* CREATE / EDIT MODAL (Identique) */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{editingHabit ? 'Modifier' : 'Nouvelle Habitude'}</Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                          <X size={24} color="#FFF" />
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={styles.inputLabel}>Titre</Text>
                      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Méditation" placeholderTextColor="#666" />
                      
                      <Text style={styles.inputLabel}>Description</Text>
                      <TextInput style={[styles.input, { minHeight: 60 }]} value={description} onChangeText={setDescription} placeholder="Détails optionnels..." placeholderTextColor="#666" multiline />

                      <View style={styles.rowInputs}>
                          <View style={{flex: 1, marginRight: 8}}>
                                <Text style={styles.inputLabel}>Catégorie</Text>
                                <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Santé" placeholderTextColor="#666" />
                          </View>
                          <View style={{flex: 1, marginLeft: 8}}>
                                <Text style={styles.inputLabel}>Cible / jour</Text>
                                <TextInput style={styles.input} value={target} onChangeText={setTarget} keyboardType="numeric" placeholderTextColor="#666" />
                          </View>
                      </View>

                      <Text style={styles.inputLabel}>Jours (Vide = Tous les jours)</Text>
                      <View style={styles.daysContainer}>
                          {DAYS.map((d, index) => (
                              <TouchableOpacity key={index} onPress={() => toggleDay(index)} style={[styles.dayCircle, selectedDays.includes(index) && styles.dayCircleActive]}>
                                  <Text style={[styles.dayText, selectedDays.includes(index) && styles.dayTextActive]}>{d}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      <Text style={styles.inputLabel}>Lier à un objectif</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalsContainer}>
                          <TouchableOpacity style={[styles.goalChip, !linkedGoalId && styles.goalChipActive]} onPress={() => setLinkedGoalId(null)}>
                               <Text style={[styles.goalChipText, !linkedGoalId && styles.goalChipTextActive]}>Aucun</Text>
                           </TouchableOpacity>
                           {goals.map(g => (
                               <TouchableOpacity key={g.id} style={[styles.goalChip, linkedGoalId === g.id && styles.goalChipActive]} onPress={() => setLinkedGoalId(g.id)}>
                                   <Target size={14} color={linkedGoalId === g.id ? "#000" : "#666"} />
                                   <Text style={[styles.goalChipText, linkedGoalId === g.id && styles.goalChipTextActive]}>{g.title}</Text>
                               </TouchableOpacity>
                           ))}
                      </ScrollView>

                      {editingHabit && (
                          <View style={styles.editActions}>
                                <TouchableOpacity style={styles.archiveBtn} onPress={() => handleArchive(editingHabit)}>
                                    <Archive size={18} color="#FFF" />
                                    <Text style={{color: '#FFF', fontWeight: '600'}}>{editingHabit.is_archived ? "Désarchiver" : "Archiver"}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(editingHabit.id)}>
                                    <Trash2 size={18} color="#FF3B30" />
                                    <Text style={{color: '#FF3B30', fontWeight: '600'}}>Supprimer</Text>
                                </TouchableOpacity>
                          </View>
                      )}

                      <TouchableOpacity style={styles.saveMainBtn} onPress={handleSave}>
                          <Save size={20} color="black" />
                          <Text style={styles.saveMainBtnText}>Enregistrer</Text>
                      </TouchableOpacity>
                  </ScrollView>
              </View>
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
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 10,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
      color: '#888',
      fontSize: 14,
  },
  headerButtons: {
      flexDirection: 'row',
      gap: 12,
  },
  iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#171717',
      alignItems: 'center',
      justifyContent: 'center',
  },
  iconBtnActive: {
      backgroundColor: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 16,
  },
  emptyText: {
      textAlign: 'center',
      color: '#666',
      marginTop: 20,
      fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardDimmed: {
      opacity: 0.6,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  streakCount: {
    fontSize: 13,
    color: '#666',
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  habitDesc: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 16,
  },
  freqBadge: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  frequencyText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonDefault: {
    backgroundColor: '#FFF',
  },
  actionButtonCompleted: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  
  // MODAL styles same as previous
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: '#171717',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '90%',
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
  },
  inputLabel: {
      fontSize: 12,
      color: '#666',
      fontWeight: '600',
      marginBottom: 6,
      textTransform: 'uppercase',
  },
  input: {
      backgroundColor: '#000',
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      marginBottom: 16,
      color: '#FFF',
      borderWidth: 1,
      borderColor: '#333',
  },
  rowInputs: {
      flexDirection: 'row',
  },
  daysContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
  },
  dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#333',
      alignItems: 'center',
      justifyContent: 'center',
  },
  dayCircleActive: {
      backgroundColor: '#007AFF',
  },
  dayText: {
      color: '#888',
      fontWeight: '600',
  },
  dayTextActive: {
      color: '#FFF',
  },
  goalsContainer: {
      flexDirection: 'row',
      marginBottom: 20,
  },
  goalChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#333',
      marginRight: 8,
  },
  goalChipActive: {
      backgroundColor: '#FFF',
  },
  goalChipText: {
      color: '#BBB',
      fontSize: 13,
  },
  goalChipTextActive: {
      color: '#000',
      fontWeight: '600',
  },
  editActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
      marginTop: 10,
  },
  archiveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#333',
      padding: 12,
      borderRadius: 10,
  },
  deleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      padding: 12,
      borderRadius: 10,
  },
  saveMainBtn: {
      flexDirection: 'row',
      backgroundColor: '#FFF',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
      marginBottom: 40,
  },
  saveMainBtnText: {
      color: 'black',
      fontWeight: '700',
      fontSize: 16,
  }
});

export default Habits;