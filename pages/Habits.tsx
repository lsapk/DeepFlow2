import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Habit } from '../types';
import { Flame, Check, Plus, Archive, X, Trash2, ArrowUp, ArrowDown, Save, RefreshCw, Target } from 'lucide-react-native';
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
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null); // If null, we are creating
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

      const habitData = {
          user_id: userId,
          title,
          category,
          frequency,
          target: parseInt(target) || 1,
          updated_at: new Date().toISOString()
      };

      if (editingHabit) {
          // Update
          await supabase.from('habits').update(habitData).eq('id', editingHabit.id);
      } else {
          // Create
          await supabase.from('habits').insert({
              ...habitData,
              streak: 0,
              is_archived: false,
              sort_order: 0 // Add to top
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
      Alert.alert("Delete Habit", "This action cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: async () => {
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
      refreshHabits();
      setEditingHabit({ ...editingHabit, sort_order: newOrder });
  };

  // Filter habits based on view mode
  const displayedHabits = habits.filter(h => !!h.is_archived === showArchived);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.largeTitle}>{showArchived ? 'Archived' : 'Habits'}</Text>
        <View style={styles.headerButtons}>
            <TouchableOpacity 
                style={[styles.iconBtn, showArchived && styles.iconBtnActive]} 
                onPress={() => setShowArchived(!showArchived)}
            >
                <Archive size={22} color={showArchived ? "white" : "#007AFF"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                <Plus size={24} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayedHabits.length === 0 && (
            <Text style={styles.emptyText}>
                {showArchived ? "No archived habits." : "No active habits. Create one!"}
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
                            <View style={[styles.iconContainer, { backgroundColor: isCompletedToday ? '#34C759' : '#FFF5E0' }]}>
                                <Flame size={20} color={isCompletedToday ? "white" : "#FF9500"} fill={isCompletedToday ? "white" : "#FF9500"} />
                            </View>
                            <Text style={styles.categoryLabel}>{habit.category?.toUpperCase() || 'GENERAL'}</Text>
                        </View>
                        <Text style={styles.streakCount}>{habit.streak} day streak</Text>
                    </View>

                    <Text style={styles.habitTitle}>{habit.title}</Text>

                    <View style={styles.cardFooter}>
                        <View style={styles.freqBadge}>
                             <RefreshCw size={12} color="#8E8E93" style={{marginRight: 4}} />
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
                                <Text style={[styles.actionButtonText, isCompletedToday && { color: '#007AFF' }]}>
                                    {isCompletedToday ? 'Done' : 'Complete'}
                                </Text>
                                {isCompletedToday && <Check size={16} color="#007AFF" style={{ marginLeft: 4 }} />}
                            </TouchableOpacity>
                        )}
                        {showArchived && (
                            <Text style={styles.archivedLabel}>Archived</Text>
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
                      <Text style={styles.modalTitle}>{editingHabit ? 'Edit Habit' : 'New Habit'}</Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                          <X size={24} color="#000" />
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={styles.inputLabel}>Title</Text>
                      <TextInput 
                          style={styles.input} 
                          value={title} 
                          onChangeText={setTitle} 
                          placeholder="e.g. Read 10 pages"
                      />

                      <View style={styles.rowInputs}>
                          <View style={{flex: 1, marginRight: 8}}>
                                <Text style={styles.inputLabel}>Category</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={category} 
                                    onChangeText={setCategory} 
                                    placeholder="Health"
                                />
                          </View>
                          <View style={{flex: 1, marginLeft: 8}}>
                                <Text style={styles.inputLabel}>Target / Day</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={target} 
                                    onChangeText={setTarget} 
                                    keyboardType="numeric"
                                    placeholder="1"
                                />
                          </View>
                      </View>

                      <Text style={styles.inputLabel}>Frequency</Text>
                      <View style={styles.freqSelector}>
                          {['daily', 'weekly'].map(f => (
                              <TouchableOpacity 
                                key={f} 
                                style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
                                onPress={() => setFrequency(f)}
                              >
                                  <Text style={[styles.freqBtnText, frequency === f && {color: 'white'}]}>{f}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      {editingHabit && (
                          <View style={styles.editActions}>
                                <Text style={styles.inputLabel}>Reorder</Text>
                                <View style={styles.reorderRow}>
                                    <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMove('up')}>
                                        <ArrowUp size={20} color="#000" />
                                        <Text>Up</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMove('down')}>
                                        <ArrowDown size={20} color="#000" />
                                        <Text>Down</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.inputLabel}>Danger Zone</Text>
                                <View style={styles.dangerRow}>
                                    <TouchableOpacity style={styles.archiveBtn} onPress={() => handleArchive(editingHabit)}>
                                        <Archive size={18} color="#007AFF" />
                                        <Text style={{color: '#007AFF', fontWeight: '600'}}>
                                            {editingHabit.is_archived ? "Unarchive" : "Archive"}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(editingHabit.id)}>
                                        <Trash2 size={18} color="#FF3B30" />
                                        <Text style={{color: '#FF3B30', fontWeight: '600'}}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                          </View>
                      )}

                      <TouchableOpacity style={styles.saveMainBtn} onPress={handleSave}>
                          <Save size={20} color="white" />
                          <Text style={styles.saveMainBtnText}>Save Habit</Text>
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
  headerButtons: {
      flexDirection: 'row',
      gap: 12,
  },
  iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#E5E5EA',
      alignItems: 'center',
      justifyContent: 'center',
  },
  iconBtnActive: {
      backgroundColor: '#007AFF',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
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
      color: '#8E8E93',
      marginTop: 20,
      fontStyle: 'italic',
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
  freqBadge: {
      flexDirection: 'row',
      alignItems: 'center',
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
  archivedLabel: {
      color: '#8E8E93',
      fontStyle: 'italic',
  },
  
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: '#F2F2F7',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '85%',
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
      fontSize: 13,
      color: '#8E8E93',
      fontWeight: '600',
      marginBottom: 6,
      textTransform: 'uppercase',
  },
  input: {
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      marginBottom: 16,
  },
  rowInputs: {
      flexDirection: 'row',
  },
  freqSelector: {
      flexDirection: 'row',
      backgroundColor: '#E5E5EA',
      borderRadius: 10,
      padding: 2,
      marginBottom: 20,
  },
  freqBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
  },
  freqBtnActive: {
      backgroundColor: '#007AFF',
  },
  freqBtnText: {
      fontWeight: '600',
      color: '#000',
  },
  editActions: {
      marginTop: 10,
  },
  reorderRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
  },
  reorderBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: 'white',
      padding: 10,
      borderRadius: 10,
  },
  dangerRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
  },
  archiveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#E0F2FF',
      padding: 12,
      borderRadius: 10,
  },
  deleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#FFEBEA',
      padding: 12,
      borderRadius: 10,
  },
  saveMainBtn: {
      flexDirection: 'row',
      backgroundColor: '#007AFF',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
      marginBottom: 40,
  },
  saveMainBtnText: {
      color: 'white',
      fontWeight: '700',
      fontSize: 17,
  }
});

export default Habits;