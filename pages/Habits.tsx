import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { Habit, Goal } from '../types';
import { Flame, Check, Plus, Archive, X, Trash2, Save, RefreshCw, Target, Filter, Grid, List, Zap, Layers, CalendarDays, Menu } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import * as Haptics from 'expo-haptics';

interface HabitsProps {
  habits: Habit[];
  goals: Goal[];
  incrementHabit: (id: string) => void;
  userId: string;
  createHabit: (habit: Partial<Habit>) => void;
  archiveHabit: (habit: Habit) => void;
  deleteHabit: (id: string) => void;
  refreshHabits: () => void;
  openMenu: () => void;
  isDarkMode?: boolean;
}

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const { width } = Dimensions.get('window');

const Habits: React.FC<HabitsProps> = ({ habits, goals, incrementHabit, userId, createHabit, archiveHabit, deleteHabit, refreshHabits, openMenu, isDarkMode = true }) => {
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [filterMode, setFilterMode] = useState<'TODAY' | 'ALL'>('TODAY'); // Ajout du filtre
  const [modalVisible, setModalVisible] = useState(false);
  
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
      success: '#34C759',
      streak: '#FF5733'
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

      const habitData = {
          title,
          description,
          category,
          frequency,
          target: parseInt(target) || 1,
          days_of_week: selectedDays.length === 0 ? null : selectedDays,
          linked_goal_id: linkedGoalId
      };

      setModalVisible(false);

      if (editingHabit) {
          await supabase.from('habits').update(habitData).eq('id', editingHabit.id);
          refreshHabits();
      } else {
          createHabit(habitData);
      }
  };

  const handleArchive = async (habit: Habit) => {
      setModalVisible(false);
      archiveHabit(habit);
  };

  const handleDelete = async (id: string) => {
      Alert.alert("Supprimer", "Cette action est irréversible.", [
          { text: "Annuler", style: "cancel" },
          { text: "Supprimer", style: "destructive", onPress: async () => {
              setModalVisible(false);
              deleteHabit(id);
          }}
      ]);
  };

  const handleIncrement = (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      incrementHabit(id);
  }

  const todayIndex = new Date().getDay();

  // Filtrage et Tri
  const displayedHabits = habits
    .filter(h => {
      if (h.is_archived && !showArchived) return false;
      
      if (filterMode === 'TODAY') {
          // Affiche si c'est programmé aujourd'hui OU si l'utilisateur l'a coché aujourd'hui (même si pas prévu)
          const isScheduledToday = !h.days_of_week || h.days_of_week.length === 0 || h.days_of_week.includes(todayIndex);
          const isDoneToday = h.last_completed_at && new Date(h.last_completed_at).toDateString() === new Date().toDateString();
          return isScheduledToday || isDoneToday;
      }
      return true; // Show ALL
    })
    .sort((a, b) => {
        // Tri : Non cochés en premier
        const aDone = a.last_completed_at && new Date(a.last_completed_at).toDateString() === new Date().toDateString();
        const bDone = b.last_completed_at && new Date(b.last_completed_at).toDateString() === new Date().toDateString();
        
        if (aDone === bDone) return 0; // Si statut identique, garde l'ordre par défaut (ou ajouter un tri par nom/création)
        if (aDone) return 1; // a est fait -> va en bas
        return -1; // a n'est pas fait -> va en haut
    });

  // Helper to render the last 5 days chain
  const StreakChain = ({ streak, isCompletedToday }: { streak: number, isCompletedToday: boolean }) => {
      // Logic visual simplified: Show 5 dots. 
      // If completed today, last one is filled. Previous ones filled if streak > i.
      const dots = [];
      const totalDots = 5;
      
      for(let i = 0; i < totalDots; i++) {
          const isFilled = i < (isCompletedToday ? 1 : 0) + (streak > 0 && i > 0 ? 1 : 0); // Simplified visual
          // Better logic:
          // Position 4 (rightmost) is today.
          // Position 3 is yesterday, etc.
          const dayOffset = totalDots - 1 - i; // 0 for today
          let active = false;
          
          if (dayOffset === 0 && isCompletedToday) active = true;
          else if (dayOffset > 0 && streak >= dayOffset + (isCompletedToday ? 0 : 1)) active = true;
          
          dots.push(
              <View 
                key={i} 
                style={[
                    styles.chainDot, 
                    { 
                        backgroundColor: active ? colors.success : 'transparent',
                        borderColor: active ? colors.success : colors.border
                    }
                ]} 
              />
          );
          if (i < totalDots - 1) {
              dots.push(
                  <View key={`line-${i}`} style={[styles.chainLine, { backgroundColor: active ? colors.success : colors.border }]} />
              );
          }
      }
      return <View style={styles.chainContainer}>{dots}</View>;
  }

  const renderGridItem = (habit: Habit, isCompletedToday: boolean, isScheduledToday: boolean) => (
      <TouchableOpacity 
          key={habit.id} 
          style={[styles.gridCard, {backgroundColor: colors.cardBg, opacity: isScheduledToday || isCompletedToday ? 1 : 0.6}]}
          onPress={() => handleIncrement(habit.id)}
          onLongPress={() => openEditModal(habit)}
          activeOpacity={0.8}
      >
          <View style={[styles.gridIcon, {backgroundColor: isCompletedToday ? colors.success : (isDarkMode ? '#333' : '#F2F2F7')}]}>
               {isCompletedToday ? <Check size={24} color="#FFF" /> : <Flame size={24} color={colors.textSub} />}
          </View>
          <Text style={[styles.gridTitle, {color: colors.text}]} numberOfLines={2}>{habit.title}</Text>
          <View style={styles.gridFooter}>
              <Text style={{color: colors.orange, fontSize: 12, fontWeight: '700'}}>{habit.streak} 🔥</Text>
          </View>
      </TouchableOpacity>
  );

  const renderListItem = (habit: Habit, isCompletedToday: boolean, isScheduledToday: boolean) => (
    <TouchableOpacity 
        key={habit.id} 
        style={[styles.card, {backgroundColor: colors.cardBg}, !(isScheduledToday || isCompletedToday) && {opacity: 0.5}]}
        onLongPress={() => openEditModal(habit)}
        activeOpacity={0.9} 
    >
        <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isCompletedToday ? colors.success : (isDarkMode ? '#333' : '#F2F2F7') }]}>
                    <Flame size={20} color={isCompletedToday ? "white" : colors.orange} fill={isCompletedToday ? "white" : colors.orange} />
                </View>
                <View>
                    <Text style={[styles.habitTitle, {color: colors.text}, isCompletedToday && {textDecorationLine: 'line-through', color: colors.textSub}]}>{habit.title}</Text>
                    <Text style={[styles.categoryLabel, {color: colors.textSub}]}>{habit.category?.toUpperCase() || 'GENERAL'}</Text>
                </View>
            </View>
            
            <TouchableOpacity 
                onPress={() => handleIncrement(habit.id)}
                style={[
                    styles.actionButton, 
                    isCompletedToday ? {backgroundColor: colors.success} : {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'},
                ]}
            >
                {isCompletedToday ? <Check size={20} color="#FFF" strokeWidth={3} /> : <Plus size={20} color={colors.text} />}
            </TouchableOpacity>
        </View>

        <View style={[styles.cardFooter, {borderTopColor: colors.border}]}>
             <StreakChain streak={habit.streak} isCompletedToday={isCompletedToday || false} />
             <Text style={[styles.streakCount, {color: colors.textSub}]}>{habit.streak} jours</Text>
        </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER iOS Style */}
      <View style={styles.header}>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <Text style={[styles.largeTitle, {color: colors.text}]}>Habitudes</Text>
         </View>
         <View style={styles.headerRight}>
             {/* Toggle Today/All */}
             <TouchableOpacity style={[styles.iconButton, {backgroundColor: colors.cardBg}]} onPress={() => setFilterMode(filterMode === 'TODAY' ? 'ALL' : 'TODAY')}>
                 {filterMode === 'TODAY' ? <CalendarDays size={20} color={colors.accent} /> : <Layers size={20} color={colors.accent} />}
             </TouchableOpacity>
             {/* Toggle Grid/List */}
             <TouchableOpacity style={[styles.iconButton, {backgroundColor: colors.cardBg}]} onPress={() => setViewMode(viewMode === 'LIST' ? 'GRID' : 'LIST')}>
                 {viewMode === 'LIST' ? <Grid size={20} color={colors.accent} /> : <List size={20} color={colors.accent} />}
             </TouchableOpacity>
             <TouchableOpacity style={[styles.addButton, {backgroundColor: colors.accent}]} onPress={openCreateModal}>
                <Plus size={20} color="#FFF" strokeWidth={3} />
             </TouchableOpacity>
         </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.filterStatus}>
            <Text style={{color: colors.textSub, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10}}>
                {filterMode === 'TODAY' ? "Aujourd'hui" : "Toutes les habitudes"}
            </Text>
        </View>

        {displayedHabits.length === 0 && (
            <Text style={[styles.emptyText, {color: colors.textSub}]}>
                {filterMode === 'TODAY' ? "Rien de prévu aujourd'hui." : "Aucune habitude définie."}
            </Text>
        )}
        
        {viewMode === 'GRID' ? (
            <View style={styles.gridContainer}>
                {displayedHabits.map(habit => {
                    const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toDateString() === new Date().toDateString();
                    const isScheduledToday = !habit.days_of_week || habit.days_of_week.length === 0 || habit.days_of_week.includes(todayIndex);
                    return renderGridItem(habit, !!isCompletedToday, isScheduledToday);
                })}
            </View>
        ) : (
            displayedHabits.map(habit => {
                const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toDateString() === new Date().toDateString();
                const isScheduledToday = !habit.days_of_week || habit.days_of_week.length === 0 || habit.days_of_week.includes(todayIndex);
                return renderListItem(habit, !!isCompletedToday, isScheduledToday);
            })
        )}

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
                      
                      <View style={styles.rowInputs}>
                          <View style={{flex: 1, marginRight: 8}}>
                                <Text style={styles.inputLabel}>CATÉGORIE</Text>
                                <TextInput style={[styles.input, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]} value={category} onChangeText={setCategory} placeholder="Santé" placeholderTextColor={colors.textSub} />
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
    marginTop: 20,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.37,
  },
  headerRight: {
      flexDirection: 'row',
      gap: 12,
  },
  iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  filterStatus: {
      alignItems: 'flex-start',
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 20,
      fontStyle: 'italic',
  },
  
  // LIST VIEW CARD
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  habitTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // VISUAL CHAIN
  chainContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  chainDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1,
  },
  chainLine: {
      width: 10,
      height: 2,
  },

  // GRID VIEW
  gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
  },
  gridCard: {
      width: (width - 52) / 2, // 2 cols with padding
      aspectRatio: 1,
      borderRadius: 20,
      padding: 16,
      justifyContent: 'space-between',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
  },
  gridIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  gridTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 8,
  },
  gridFooter: {
      alignItems: 'flex-end',
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