import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Habit } from '../types';
import { Flame, Check, Plus, Archive, X, Trash2, ArrowUp, ArrowDown, Save, RefreshCw } from 'lucide-react-native';
import { supabase } from '../services/supabase';

interface HabitsProps {
  habits: Habit[];
  incrementHabit: (id: string) => void;
  userId: string;
  refreshHabits: () => void;
}

const Habits: React.FC<HabitsProps> = ({ habits, incrementHabit, userId, refreshHabits }) => {
  const [showArchived, setShowArchived] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [target, setTarget] = useState('1');

  const openCreateModal = () => {
      setEditingHabit(null);
      setTitle('');
      setCategory('General');
      setFrequency('daily');
      setTarget('1');
      setModalVisible(true);
  };

  const openEditModal = (habit: Habit) => {
      setEditingHabit(habit);
      setTitle(habit.title);
      setCategory(habit.category || 'General');
      setFrequency(habit.frequency);
      setTarget(habit.target.toString());
      setModalVisible(true);
  };

  const handleSave = async () => {
      if (!title.trim()) return;

      const maxOrder = habits.length > 0 ? Math.max(...habits.map(h => h.sort_order || 0)) : 0;

      const habitData = {
          user_id: userId,
          title,
          category,
          frequency,
          target: parseInt(target) || 1,
          updated_at: new Date().toISOString()
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

  const handleMove = async (direction: 'up' | 'down') => {
      if (!editingHabit) return;
      const currentOrder = editingHabit.sort_order || 0;
      const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
      
      await supabase.from('habits').update({ sort_order: newOrder }).eq('id', editingHabit.id);
      setEditingHabit({...editingHabit, sort_order: newOrder});
      refreshHabits();
  };

  const displayedHabits = habits.filter(h => !!h.is_archived === showArchived);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.largeTitle}>{showArchived ? 'Archivées' : 'Habitudes'}</Text>
        <View style={styles.headerButtons}>
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
                {showArchived ? "Aucune archive." : "Aucune habitude active."}
            </Text>
        )}
        {displayedHabits.map(habit => {
            const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toDateString() === new Date().toDateString();
            
            return (
                <TouchableOpacity 
                    key={habit.id} 
                    style={styles.card}
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

                    <View style={styles.cardFooter}>
                        <View style={styles.freqBadge}>
                             <RefreshCw size={12} color="#666" style={{marginRight: 4}} />
                             <Text style={styles.frequencyText}>{habit.frequency}</Text>
                        </View>
                        
                        {!showArchived && (
                            <TouchableOpacity 
                                onPress={() => !isCompletedToday && incrementHabit(habit.id)}
                                disabled={isCompletedToday}
                                style={[
                                    styles.actionButton, 
                                    isCompletedToday ? styles.actionButtonCompleted : styles.actionButtonDefault
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

      {/* CREATE / EDIT MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
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
                      <TextInput 
                          style={styles.input} 
                          value={title} 
                          onChangeText={setTitle} 
                          placeholder="Ex: Méditation"
                          placeholderTextColor="#666"
                      />

                      <View style={styles.rowInputs}>
                          <View style={{flex: 1, marginRight: 8}}>
                                <Text style={styles.inputLabel}>Catégorie</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={category} 
                                    onChangeText={setCategory} 
                                    placeholder="Santé"
                                    placeholderTextColor="#666"
                                />
                          </View>
                          <View style={{flex: 1, marginLeft: 8}}>
                                <Text style={styles.inputLabel}>Cible / jour</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={target} 
                                    onChangeText={setTarget} 
                                    keyboardType="numeric"
                                    placeholderTextColor="#666"
                                />
                          </View>
                      </View>

                      {editingHabit && (
                          <>
                            <Text style={styles.inputLabel}>Organisation</Text>
                            <View style={styles.reorderRow}>
                                <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMove('up')}>
                                    <ArrowUp size={20} color="#FFF" />
                                    <Text style={styles.reorderText}>Monter</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMove('down')}>
                                    <ArrowDown size={20} color="#FFF" />
                                    <Text style={styles.reorderText}>Descendre</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.editActions}>
                                    <TouchableOpacity style={styles.archiveBtn} onPress={() => handleArchive(editingHabit)}>
                                        <Archive size={18} color="#FFF" />
                                        <Text style={{color: '#FFF', fontWeight: '600'}}>
                                            {editingHabit.is_archived ? "Désarchiver" : "Archiver"}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(editingHabit.id)}>
                                        <Trash2 size={18} color="#FF3B30" />
                                        <Text style={{color: '#FF3B30', fontWeight: '600'}}>Supprimer</Text>
                                    </TouchableOpacity>
                            </View>
                          </>
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
    marginBottom: 20,
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
  
  // MODAL
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
  reorderRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
  },
  reorderBtn: {
      flex: 1,
      backgroundColor: '#333',
      padding: 12,
      alignItems: 'center',
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
  },
  reorderText: {
      color: '#FFF',
      fontWeight: '600',
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