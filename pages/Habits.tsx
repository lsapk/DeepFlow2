import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Habit, Goal } from '../types';
import { Flame, Check, Plus, Archive, X, Trash2, Save, RefreshCw, Calendar, Target, Filter, Menu } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import * as Haptics from 'expo-haptics';

interface HabitsProps {
  habits: Habit[];
  goals: Goal[];
  incrementHabit: (id: string) => void;
  userId: string;
  refreshHabits: () => void;
  openMenu?: () => void;
  isDarkMode?: boolean;
}

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Dimanche to Samedi

const Habits: React.FC<HabitsProps> = ({ habits, goals, incrementHabit, userId, refreshHabits, openMenu, isDarkMode = true }) => {
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

  const colors = {
      bg: isDarkMode ? '#000000' : '#F2F2F7',
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#007AFF',
      orange: '#FF9500',
      success: '#34C759'
  };

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
      Haptics.selectionAsync();
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

  const handleIncrement = (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      incrementHabit(id);
  }

  const todayIndex = new Date().getDay();

  const displayedHabits = habits.filter(h => {
      if (showArchived) return !!h.is_archived;
      if (h.is_archived) return false;
      
      if (showAllDays) return true;
      if (!h.days_of_week || h.days_of_week.length === 0) return true;
      return h.days_of_week.includes(todayIndex);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
         <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
              <Menu size={24} color={colors.accent} />
          </TouchableOpacity>
         
         <View style={styles.headerTitleContainer} pointerEvents="none">
             <Text style={[styles.largeTitle, {color: colors.text}]}>Habitudes</Text>
             <Text style={[styles.subtitle, {color: colors.textSub}]}>{showAllDays ? 'Toutes' : 'Aujourd\'hui'}</Text>
         </View>

        <View style={styles.headerButtons}>
            <TouchableOpacity 
                style={[styles.iconBtn, {backgroundColor: colors.cardBg}, showAllDays && {backgroundColor: colors.border}]} 
                onPress={() => setShowAllDays(!showAllDays)}
            >
                <Filter size={20} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                <Plus size={24} color={colors.accent} />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayedHabits.length === 0 && (
            <Text style={[styles.emptyText, {color: colors.textSub}]}>
                {showArchived ? "Aucune archive." : (showAllDays ? "Aucune habitude crée." : "Rien de prévu aujourd'hui.")}
            </Text>
        )}
        {displayedHabits.map(habit => {
            const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toDateString() === new Date().toDateString();
            const isScheduledToday = !habit.days_of_week || habit.days_of_week.length === 0 || habit.days_of_week.includes(todayIndex);

            return (
                <TouchableOpacity 
                    key={habit.id} 
                    style={[styles.card, {backgroundColor: colors.cardBg}, !isScheduledToday && {opacity: 0.5}]}
                    onLongPress={() => openEditModal(habit)}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: isCompletedToday ? colors.success : (isDarkMode ? '#333' : '#F2F2F7') }]}>
                                <Flame size={16} color={isCompletedToday ? "white" : colors.orange} fill={isCompletedToday ? "white" : colors.orange} />
                            </View>
                            <Text style={styles.categoryLabel}>{habit.category?.toUpperCase() || 'GENERAL'}</Text>
                        </View>
                        <Text style={styles.streakCount}>{habit.streak} jrs</Text>
                    </View>

                    <Text style={[styles.habitTitle, {color: colors.text}]}>{habit.title}</Text>
                    {habit.description && <Text style={[styles.habitDesc, {color: colors.textSub}]} numberOfLines={1}>{habit.description}</Text>}

                    <View style={[styles.cardFooter, {borderTopColor: colors.border}]}>
                        <View style={styles.freqBadge}>
                             <RefreshCw size={12} color={colors.textSub} style={{marginRight: 4}} />
                             <Text style={[styles.frequencyText, {color: colors.textSub}]}>{habit.frequency}</Text>
                        </View>
                        
                        {!showArchived && (
                            <TouchableOpacity 
                                onPress={() => handleIncrement(habit.id)}
                                style={[
                                    styles.actionButton, 
                                    isCompletedToday ? {backgroundColor: colors.success} : {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'},
                                ]}
                            >
                                <Text style={[styles.actionButtonText, isCompletedToday ? { color: '#FFF' } : { color: colors.text }]}>
                                    {isCompletedToday ? 'Fait' : 'Valider'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            );
        })}
      </ScrollView>

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {backgroundColor: colors.cardBg}]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, {color: colors.text}]}>{editingHabit ? 'Modifier' : 'Nouvelle Habitude'}</Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                          <Text style={{color: colors.accent, fontSize: 17, fontWeight: '600'}}>Fermer</Text>
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={styles.inputLabel}>TITRE</Text>
                      <TextInput style={[styles.input, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]} value={title} onChangeText={setTitle} placeholder="Ex: Méditation" placeholderTextColor={colors.textSub} />
                      
                      <Text style={styles.inputLabel}>DESCRIPTION</Text>
                      <TextInput style={[styles.input, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text, minHeight: 60}]} value={description} onChangeText={setDescription} placeholder="Détails optionnels..." placeholderTextColor={colors.textSub} multiline />

                      <View style={styles.rowInputs}>
                          <View style={{flex: 1, marginRight: 8}}>
                                <Text style={styles.inputLabel}>CATÉGORIE</Text>
                                <TextInput style={[styles.input, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]} value={category} onChangeText={setCategory} placeholder="Santé" placeholderTextColor={colors.textSub} />
                          </View>
                          <View style={{flex: 1, marginLeft: 8}}>
                                <Text style={styles.inputLabel}>CIBLE / JOUR</Text>
                                <TextInput style={[styles.input, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]} value={target} onChangeText={setTarget} keyboardType="numeric" placeholderTextColor={colors.textSub} />
                          </View>
                      </View>

                      <Text style={styles.inputLabel}>JOURS</Text>
                      <View style={styles.daysContainer}>
                          {DAYS.map((d, index) => (
                              <TouchableOpacity key={index} onPress={() => toggleDay(index)} style={[styles.dayCircle, {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'}, selectedDays.includes(index) && {backgroundColor: colors.text}]}>
                                  <Text style={[styles.dayText, {color: colors.textSub}, selectedDays.includes(index) && {color: isDarkMode ? '#000' : '#FFF'}]}>{d}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      <Text style={styles.inputLabel}>OBJECTIF LIÉ</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalsContainer}>
                          <TouchableOpacity style={[styles.goalChip, {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'}, !linkedGoalId && {backgroundColor: colors.text}]} onPress={() => setLinkedGoalId(null)}>
                               <Text style={[styles.goalChipText, !linkedGoalId && {color: isDarkMode ? '#000' : '#FFF'}]}>Aucun</Text>
                           </TouchableOpacity>
                           {goals.map(g => (
                               <TouchableOpacity key={g.id} style={[styles.goalChip, {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'}, linkedGoalId === g.id && {backgroundColor: colors.text}]} onPress={() => setLinkedGoalId(g.id)}>
                                   <Text style={[styles.goalChipText, linkedGoalId === g.id && {color: isDarkMode ? '#000' : '#FFF'}]}>{g.title}</Text>
                               </TouchableOpacity>
                           ))}
                      </ScrollView>

                      {editingHabit && (
                          <View style={styles.editActions}>
                                <TouchableOpacity style={[styles.archiveBtn, {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'}]} onPress={() => handleArchive(editingHabit)}>
                                    <Archive size={18} color={colors.text} />
                                    <Text style={{color: colors.text, fontWeight: '600'}}>{editingHabit.is_archived ? "Désarchiver" : "Archiver"}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(editingHabit.id)}>
                                    <Trash2 size={18} color="#FF3B30" />
                                    <Text style={{color: '#FF3B30', fontWeight: '600'}}>Supprimer</Text>
                                </TouchableOpacity>
                          </View>
                      )}

                      <TouchableOpacity style={[styles.saveMainBtn, {backgroundColor: colors.accent}]} onPress={handleSave}>
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
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 10,
    height: 50,
  },
  headerTitleContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: -1,
  },
  largeTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
      fontSize: 10,
      letterSpacing: 1,
  },
  headerButtons: {
      flexDirection: 'row',
      gap: 12,
      zIndex: 10, // BUTTONS ON TOP
  },
  iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10, // BUTTONS ON TOP
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // BUTTONS ON TOP
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 20,
      fontStyle: 'italic',
  },
  card: {
    borderRadius: 20,
    padding: 16,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  habitDesc: {
    fontSize: 14,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  freqBadge: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  frequencyText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  inputLabel: {
      fontSize: 12,
      color: '#8E8E93',
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'uppercase',
  },
  input: {
      borderRadius: 12,
      padding: 14,
      fontSize: 17,
      marginBottom: 20,
  },
  rowInputs: {
      flexDirection: 'row',
  },
  daysContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
  },
  dayCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
  },
  dayText: {
      fontWeight: '600',
      fontSize: 15,
  },
  goalsContainer: {
      flexDirection: 'row',
      marginBottom: 24,
  },
  goalChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 10,
  },
  goalChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#8E8E93',
  },
  editActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
  },
  archiveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 14,
      borderRadius: 12,
  },
  deleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      padding: 14,
      borderRadius: 12,
  },
  saveMainBtn: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
  },
  saveMainBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 17,
  }
});

export default Habits;