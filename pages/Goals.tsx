import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, LayoutAnimation, UIManager, Modal, Alert } from 'react-native';
import { Goal, SubObjective } from '../types';
import { Plus, Check, Trash2, ChevronDown, ChevronUp, X, AlignLeft, Calendar, Save, Minus, Menu } from 'lucide-react-native';
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
  openMenu?: () => void;
}

const Goals: React.FC<GoalsProps> = ({ goals, toggleGoal, addGoal, deleteGoal, userId, refreshGoals, openMenu }) => {
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Edit State
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formProgress, setFormProgress] = useState(0);

  const openCreateModal = () => {
    setFormTitle('');
    setFormDesc('');
    setFormDate('');
    setFormProgress(0);
    setCreateModalVisible(true);
  };

  const handleAdd = () => {
    if (formTitle.trim()) {
      addGoal(formTitle);
      setCreateModalVisible(false);
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
      setFormTitle(goal.title);
      setFormDesc(goal.description || '');
      setFormDate(goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : '');
      setFormProgress(goal.progress || 0);
      setEditModalVisible(true);
  };

  const handleUpdateGoal = async () => {
      if (!selectedGoal) return;
      await supabase.from('goals').update({ 
          title: formTitle,
          description: formDesc,
          target_date: formDate ? new Date(formDate).toISOString() : null,
          progress: formProgress
      }).eq('id', selectedGoal.id);
      
      refreshGoals();
      setEditModalVisible(false);
  };

  const changeProgress = (delta: number) => {
      const newVal = Math.max(0, Math.min(100, formProgress + delta));
      setFormProgress(newVal);
  };

  const activeGoals = goals.filter(t => !t.completed);
  const completedGoals = goals.filter(t => t.completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              {openMenu && (
                  <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
                      <Menu size={24} color="#FFF" />
                  </TouchableOpacity>
              )}
              <Text style={styles.largeTitle}>Objectifs</Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)} style={styles.toggleCompletedBtn}>
                    <Text style={styles.toggleText}>{showCompleted ? 'Masquer' : 'Terminés'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                        <Plus size={24} color="#000" />
                </TouchableOpacity>
          </View>
      </View>

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
      
      {/* Create / Edit Modal */}
      <Modal
        visible={createModalVisible || editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setCreateModalVisible(false); setEditModalVisible(false); }}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{createModalVisible ? 'Nouvel Objectif' : 'Modifier'}</Text>
                      <TouchableOpacity onPress={() => { setCreateModalVisible(false); setEditModalVisible(false); }}>
                          <X size={24} color="#FFF" />
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Titre</Text>
                  <TextInput 
                      style={styles.modalInput} 
                      value={formTitle} 
                      onChangeText={setFormTitle} 
                      color="#FFF"
                  />

                  {editModalVisible && (
                      <>
                        <Text style={styles.modalLabel}>Progression ({formProgress}%)</Text>
                        <View style={styles.progressControl}>
                            <TouchableOpacity onPress={() => changeProgress(-10)} style={styles.progressBtn}>
                                <Minus size={20} color="#FFF" />
                            </TouchableOpacity>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${formProgress}%` }]} />
                            </View>
                            <TouchableOpacity onPress={() => changeProgress(10)} style={styles.progressBtn}>
                                <Plus size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                      </>
                  )}

                  <Text style={styles.modalLabel}>Description</Text>
                   <View style={styles.inputWithIcon}>
                         <AlignLeft size={18} color="#666" style={{marginRight: 10}} />
                         <TextInput 
                            style={[styles.modalInput, {flex: 1, height: 'auto', minHeight: 40, borderWidth: 0, marginBottom: 0}]} 
                            value={formDesc} 
                            onChangeText={setFormDesc} 
                            placeholder="Détails..."
                            placeholderTextColor="#666"
                            multiline
                            color="#FFF"
                        />
                    </View>

                    <Text style={styles.modalLabel}>Date Cible (YYYY-MM-DD)</Text>
                    <View style={styles.inputWithIcon}>
                        <Calendar size={18} color="#666" style={{marginRight: 10}} />
                        <TextInput 
                            style={[styles.modalInput, { borderWidth: 0, marginBottom: 0 }]} 
                            value={formDate} 
                            onChangeText={setFormDate} 
                            placeholder="ex: 2024-12-31"
                            placeholderTextColor="#666"
                            color="#FFF"
                        />
                    </View>


                  <TouchableOpacity style={styles.saveBtn} onPress={createModalVisible ? handleAdd : handleUpdateGoal}>
                        <Save size={20} color="black" />
                        <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </TouchableOpacity>

                  {editModalVisible && (
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
                        <Text style={styles.deleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  )}
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
                    {/* Progress Bar Mini */}
                    {!goal.completed && (goal.progress || 0) > 0 && (
                        <View style={styles.miniProgressBg}>
                            <View style={[styles.miniProgressFill, { width: `${goal.progress}%` }]} />
                        </View>
                    )}
                    {goal.target_date && (
                         <Text style={styles.dateText}>🎯 {new Date(goal.target_date).toLocaleDateString()}</Text>
                    )}
                </View>

                <View style={styles.rightActions}>
                     {isExpanded ? <ChevronUp size={20} color="#666" /> : <ChevronDown size={20} color="#666" />}
                </View>
            </TouchableOpacity>

            {/* EXPANDED SECTION */}
            {isExpanded && (
                <View style={styles.expandedSection}>
                    {goal.description && <Text style={styles.descText}>{goal.description}</Text>}

                    {goal.subobjectives?.map(subObjective => (
                        <View key={subObjective.id} style={styles.subtaskRow}>
                            <TouchableOpacity onPress={() => toggleSubGoal(subObjective)} style={styles.subtaskCheckbox}>
                                {subObjective.completed && <View style={styles.subtaskChecked} />}
                            </TouchableOpacity>
                            <Text style={[styles.subtaskTitle, subObjective.completed && styles.subtaskTitleCompleted]}>
                                {subObjective.title}
                            </Text>
                            <TouchableOpacity onPress={() => deleteSubGoal(subObjective.id)} style={{marginLeft: 'auto'}}>
                                <X size={14} color="#666" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    
                    <View style={styles.addSubtaskRow}>
                        <TextInput
                            style={styles.subtaskInput}
                            placeholder="Ajouter une étape..."
                            placeholderTextColor="#666"
                            value={newSubGoalTitle}
                            onChangeText={setNewSubGoalTitle}
                            onSubmitEditing={addSubGoal}
                        />
                        <TouchableOpacity onPress={addSubGoal} disabled={!newSubGoalTitle.trim()}>
                            <Plus size={20} color={newSubGoalTitle.trim() ? "#007AFF" : "#666"} />
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
    backgroundColor: '#000000',
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
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCompletedBtn: {
      padding: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
      color: '#007AFF',
      fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 150,
  },
  listGroup: {
    backgroundColor: '#171717',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  completedGroup: {
    marginTop: 32,
  },
  groupHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
    marginLeft: 4,
  },
  emptyText: {
    padding: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  taskItemContainer: {
      backgroundColor: '#171717',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#262626',
    marginLeft: 16, 
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#444',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    color: '#FFF',
  },
  taskTitleCompleted: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  dateText: {
      fontSize: 11,
      color: '#FF9500',
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
  descText: {
      color: '#888',
      fontSize: 13,
      marginBottom: 12,
      fontStyle: 'italic',
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
      borderColor: '#444',
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
      color: '#DDD',
      flex: 1,
  },
  subtaskTitleCompleted: {
      color: '#666',
      textDecorationLine: 'line-through',
  },
  addSubtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#262626',
      paddingTop: 8,
  },
  subtaskInput: {
      flex: 1,
      fontSize: 14,
      color: '#FFF',
      marginRight: 8,
  },
  
  // Progress
  miniProgressBg: {
      height: 4,
      backgroundColor: '#333',
      borderRadius: 2,
      marginTop: 6,
      width: '60%',
  },
  miniProgressFill: {
      height: '100%',
      backgroundColor: '#007AFF',
      borderRadius: 2,
  },
  progressControl: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
  },
  progressBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#333',
      alignItems: 'center',
      justifyContent: 'center',
  },
  progressBarBg: {
      flex: 1,
      height: 10,
      backgroundColor: '#333',
      borderRadius: 5,
      overflow: 'hidden',
  },
  progressBarFill: {
      height: '100%',
      backgroundColor: '#007AFF',
  },

  // Modal
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      width: '85%',
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: '#333',
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
      color: '#FFF',
  },
  modalInput: {
      backgroundColor: '#000',
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
      marginBottom: 20,
      color: '#FFF',
      borderWidth: 1,
      borderColor: '#333',
  },
  inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
      paddingHorizontal: 12,
      marginBottom: 20,
  },
  modalLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#888',
      marginBottom: 6,
      textTransform: 'uppercase',
  },
  deleteActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: 'rgba(255,59,48,0.1)',
      borderRadius: 8,
      marginBottom: 10,
      gap: 8,
      marginTop: 20,
  },
  deleteText: {
      color: '#FF3B30',
      fontWeight: '600',
  },
  saveBtn: {
      backgroundColor: '#FFF',
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
  },
  saveBtnText: {
      color: 'black',
      fontWeight: '600',
      fontSize: 16,
  }
});

export default Goals;