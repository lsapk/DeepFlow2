import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, LayoutAnimation, UIManager, Modal, Alert } from 'react-native';
import { Goal, SubObjective } from '../types';
import { Plus, Check, Trash2, ChevronDown, ChevronUp, X, ArrowUp, ArrowDown } from 'lucide-react-native';
import { supabase } from '../services/supabase';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface GoalsProps {
  goals: Goal[];
  toggleGoal: (id: string) => void;
  addGoal: (title: string) => void;
  deleteGoal: (id: string) => void;
  userId: string;
  refreshGoals: () => void;
}

const Goals: React.FC<GoalsProps> = ({ goals, toggleGoal, addGoal, deleteGoal, userId, refreshGoals }) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleAdd = () => {
    if (newGoalTitle.trim()) {
      addGoal(newGoalTitle);
      setNewGoalTitle('');
    }
  };

  const toggleExpand = (goalId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSet = new Set(expandedGoalIds);
    if (newSet.has(goalId)) {
      newSet.delete(goalId);
    } else {
      newSet.add(goalId);
    }
    setExpandedGoalIds(newSet);
  };

  const openEditModal = (goal: Goal) => {
      setSelectedGoal(goal);
      setEditTitle(goal.title);
      setEditModalVisible(true);
  };

  const handleUpdateGoal = async () => {
      if (!selectedGoal) return;
      await supabase.from('goals').update({ title: editTitle }).eq('id', selectedGoal.id);
      refreshGoals();
      setEditModalVisible(false);
  };

  const handleMove = async (direction: 'up' | 'down') => {
      if (!selectedGoal) return;
      const currentOrder = selectedGoal.sort_order || 0;
      const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
      
      await supabase.from('goals').update({ sort_order: newOrder }).eq('id', selectedGoal.id);
      refreshGoals();
      setSelectedGoal({...selectedGoal, sort_order: newOrder});
  };

  const activeGoals = goals.filter(t => !t.completed);
  const completedGoals = goals.filter(t => t.completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <Text style={styles.largeTitle}>Objectifs</Text>
          <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)} style={styles.toggleCompletedBtn}>
              <Text style={styles.toggleText}>{showCompleted ? 'Masquer Terminés' : 'Voir Terminés'}</Text>
          </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        style={styles.keyboardAvoid}
      >
        <View style={styles.inputContainer}>
            <TextInput
            style={styles.textInput}
            placeholder="Nouvel objectif..."
            placeholderTextColor="#8E8E93"
            value={newGoalTitle}
            onChangeText={setNewGoalTitle}
            />
            <View style={styles.inputRow}>
                <View style={{flex: 1}} />
                <TouchableOpacity 
                    onPress={handleAdd}
                    disabled={!newGoalTitle.trim()}
                    style={styles.addButton}
                >
                    <Plus size={24} color={!newGoalTitle.trim() ? '#C7C7CC' : '#007AFF'} />
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listGroup}>
            {activeGoals.length === 0 && (
                <Text style={styles.emptyText}>Aucun objectif en cours.</Text>
            )}
            {activeGoals.map((goal, index) => (
                <View key={goal.id}>
                    <GoalItem 
                        goal={goal} 
                        isExpanded={expandedGoalIds.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)} 
                        onToggleExpand={() => toggleExpand(goal.id)}
                        onLongPress={() => openEditModal(goal)}
                        userId={userId}
                        refreshGoals={refreshGoals}
                    />
                    {index < activeGoals.length - 1 && <View style={styles.separator} />}
                </View>
            ))}
        </View>

        {showCompleted && completedGoals.length > 0 && (
             <View style={styles.completedGroup}>
                <Text style={styles.groupHeader}>Terminés</Text>
                <View style={styles.listGroup}>
                    {completedGoals.map((goal, index) => (
                        <View key={goal.id}>
                             <GoalItem 
                                goal={goal} 
                                isExpanded={expandedGoalIds.has(goal.id)}
                                onToggle={() => toggleGoal(goal.id)} 
                                onToggleExpand={() => toggleExpand(goal.id)}
                                onLongPress={() => openEditModal(goal)}
                                userId={userId}
                                refreshGoals={refreshGoals}
                            />
                            {index < completedGoals.length - 1 && <View style={styles.separator} />}
                        </View>
                    ))}
                </View>
            </View>
        )}
      </ScrollView>
      
      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Modifier l'Objectif</Text>
                      <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                          <X size={24} color="#000" />
                      </TouchableOpacity>
                  </View>

                  <TextInput 
                      style={styles.modalInput} 
                      value={editTitle} 
                      onChangeText={setEditTitle} 
                  />

                  <Text style={styles.modalLabel}>Réorganiser</Text>
                  <View style={styles.reorderRow}>
                      <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMove('up')}>
                           <ArrowUp size={20} color="#000" />
                           <Text>Monter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.reorderBtn} onPress={() => handleMove('down')}>
                           <ArrowDown size={20} color="#000" />
                           <Text>Descendre</Text>
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Actions</Text>
                  <TouchableOpacity 
                    style={styles.deleteActionBtn} 
                    onPress={() => {
                        if (selectedGoal) {
                            Alert.alert("Supprimer", "Êtes-vous sûr ?", [
                                { text: "Annuler", style: "cancel"},
                                { text: "Supprimer", style: 'destructive', onPress: () => {
                                    deleteGoal(selectedGoal.id);
                                    setEditModalVisible(false);
                                }}
                            ])
                        }
                    }}
                   >
                      <Trash2 size={20} color="#FF3B30" />
                      <Text style={styles.deleteText}>Supprimer l'Objectif</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateGoal}>
                      <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
};

interface GoalItemProps {
    goal: Goal;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleExpand: () => void;
    onLongPress: () => void;
    userId: string;
    refreshGoals: () => void;
}

const GoalItem: React.FC<GoalItemProps> = ({ goal, isExpanded, onToggle, onToggleExpand, onLongPress, userId, refreshGoals }) => {
    const [newSubGoalTitle, setNewSubGoalTitle] = useState('');
    
    const addSubGoal = async () => {
        if (!newSubGoalTitle.trim()) return;
        await supabase.from('subobjectives').insert({
            parent_goal_id: goal.id,
            user_id: userId,
            title: newSubGoalTitle,
            completed: false,
            sort_order: goal.subobjectives ? goal.subobjectives.length : 0
        });
        setNewSubGoalTitle('');
        refreshGoals();
    };

    const toggleSubGoal = async (subObjective: SubObjective) => {
        const newStatus = !subObjective.completed;
        await supabase.from('subobjectives').update({ completed: newStatus }).eq('id', subObjective.id);
        refreshGoals(); 
    };

    const deleteSubGoal = async (id: string) => {
         await supabase.from('subobjectives').delete().eq('id', id);
         refreshGoals();
    }

    return (
        <View style={styles.taskItemContainer}>
            <TouchableOpacity 
                style={styles.taskItem} 
                onPress={onToggleExpand}
                onLongPress={onLongPress}
                activeOpacity={0.7}
            >
                <TouchableOpacity 
                    onPress={onToggle}
                    style={[
                        styles.checkbox,
                        goal.completed && { backgroundColor: '#FF9500', borderColor: '#FF9500' }
                    ]}
                >
                    {goal.completed && <Check size={14} color="white" strokeWidth={4} />}
                </TouchableOpacity>
                
                <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, goal.completed && styles.taskTitleCompleted]}>
                        {goal.title}
                    </Text>
                    {goal.subobjectives && goal.subobjectives.length > 0 && (
                        <Text style={styles.subtaskSummary}>
                            {goal.subobjectives.filter(s => s.completed).length}/{goal.subobjectives.length} étapes
                        </Text>
                    )}
                </View>

                <View style={styles.rightActions}>
                     {isExpanded ? <ChevronUp size={20} color="#C7C7CC" /> : <ChevronDown size={20} color="#C7C7CC" />}
                </View>
            </TouchableOpacity>

            {/* EXPANDED SECTION */}
            {isExpanded && (
                <View style={styles.expandedSection}>
                    {goal.subobjectives?.map(subObjective => (
                        <View key={subObjective.id} style={styles.subtaskRow}>
                            <TouchableOpacity onPress={() => toggleSubGoal(subObjective)} style={styles.subtaskCheckbox}>
                                {subObjective.completed && <View style={styles.subtaskChecked} />}
                            </TouchableOpacity>
                            <Text style={[styles.subtaskTitle, subObjective.completed && styles.subtaskTitleCompleted]}>
                                {subObjective.title}
                            </Text>
                            <TouchableOpacity onPress={() => deleteSubGoal(subObjective.id)} style={{marginLeft: 'auto'}}>
                                <X size={14} color="#C7C7CC" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    
                    <View style={styles.addSubtaskRow}>
                        <TextInput
                            style={styles.subtaskInput}
                            placeholder="Ajouter une étape..."
                            placeholderTextColor="#8E8E93"
                            value={newSubGoalTitle}
                            onChangeText={setNewSubGoalTitle}
                            onSubmitEditing={addSubGoal}
                        />
                        <TouchableOpacity onPress={addSubGoal} disabled={!newSubGoalTitle.trim()}>
                            <Plus size={20} color={newSubGoalTitle.trim() ? "#007AFF" : "#C7C7CC"} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.37,
  },
  toggleCompletedBtn: {
      padding: 8,
  },
  toggleText: {
      color: '#007AFF',
      fontSize: 15,
  },
  keyboardAvoid: {
    zIndex: 10,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  textInput: {
    fontSize: 17,
    color: '#000000',
    marginBottom: 16,
    paddingVertical: 0,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 150,
  },
  listGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  completedGroup: {
    marginTop: 32,
  },
  groupHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    marginLeft: 4,
  },
  emptyText: {
    padding: 16,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  taskItemContainer: {
      backgroundColor: 'white',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 48, 
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    color: '#000000',
  },
  taskTitleCompleted: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  subtaskSummary: {
      fontSize: 12,
      color: '#8E8E93',
      marginTop: 2,
  },
  rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  expandedSection: {
      paddingLeft: 52,
      paddingRight: 16,
      paddingBottom: 16,
  },
  subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  subtaskCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: '#C7C7CC',
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
  },
  subtaskChecked: {
      width: 10,
      height: 10,
      backgroundColor: '#FF9500',
      borderRadius: 2,
  },
  subtaskTitle: {
      fontSize: 15,
      color: '#333',
      flex: 1,
  },
  subtaskTitleCompleted: {
      color: '#C7C7CC',
      textDecorationLine: 'line-through',
  },
  addSubtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 0.5,
      borderTopColor: '#E5E5EA',
      paddingTop: 8,
  },
  subtaskInput: {
      flex: 1,
      fontSize: 14,
      color: '#000',
      marginRight: 8,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      width: '85%',
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '700',
  },
  modalInput: {
      backgroundColor: '#F2F2F7',
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
      marginBottom: 20,
  },
  modalLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#8E8E93',
      marginBottom: 8,
      textTransform: 'uppercase',
  },
  reorderRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
  },
  reorderBtn: {
      alignItems: 'center',
      padding: 10,
      backgroundColor: '#F2F2F7',
      borderRadius: 8,
      width: 100,
  },
  deleteActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: '#FFEBEA',
      borderRadius: 8,
      marginBottom: 20,
      gap: 8,
  },
  deleteText: {
      color: '#FF3B30',
      fontWeight: '600',
  },
  saveBtn: {
      backgroundColor: '#007AFF',
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
  },
  saveBtnText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
  }
});

export default Goals;