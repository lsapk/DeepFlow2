import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, LayoutAnimation, UIManager, Modal, Alert } from 'react-native';
import { Goal, SubObjective } from '../types';
import { Plus, Check, Trash2, ChevronDown, ChevronUp, X, AlignLeft, Calendar, Save, Minus, Menu, Target } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import * as Haptics from 'expo-haptics';

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
  createSubObjective: (goalId: string, title: string) => void;
  toggleSubObjective: (subId: string, goalId: string) => void;
  deleteSubObjective: (subId: string, goalId: string) => void;
  userId: string;
  refreshGoals: () => void;
  openMenu?: () => void;
  isDarkMode?: boolean;
}

const Goals: React.FC<GoalsProps> = ({ goals, toggleGoal, addGoal, deleteGoal, createSubObjective, toggleSubObjective, deleteSubObjective, userId, refreshGoals, openMenu, isDarkMode = true }) => {
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

  const colors = {
      bg: isDarkMode ? '#000000' : '#F2F2F7',
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#007AFF',
      orange: '#FF9500',
      danger: '#FF3B30',
      success: '#34C759'
  };

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
    Haptics.selectionAsync();
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
      Haptics.selectionAsync();
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
      if (newVal !== formProgress) Haptics.selectionAsync();
      setFormProgress(newVal);
  };

  const onToggleGoal = (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toggleGoal(id);
  }

  const activeGoals = goals.filter(t => !t.completed);
  const completedGoals = goals.filter(t => t.completed);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
              <Text style={[styles.largeTitle, { color: colors.text }]}>Objectifs</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                <Plus size={24} color={colors.accent} />
          </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EN COURS</Text>
        </View>

        <View style={[styles.listGroup, { backgroundColor: colors.cardBg }]}>
            {activeGoals.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSub }]}>Aucun objectif actif.</Text>
            )}
            {activeGoals.map((goal, index) => (
                <View key={goal.id}>
                    <GoalItem 
                        goal={goal} 
                        isExpanded={expandedGoalIds.has(goal.id)}
                        onToggle={() => onToggleGoal(goal.id)} 
                        onToggleExpand={() => toggleExpand(goal.id)}
                        onLongPress={() => openEditModal(goal)}
                        colors={colors}
                        createSubObjective={createSubObjective}
                        toggleSubObjective={toggleSubObjective}
                        deleteSubObjective={deleteSubObjective}
                    />
                    {index < activeGoals.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                </View>
            ))}
        </View>

        <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)} style={styles.toggleCompletedBtn}>
            <Text style={[styles.toggleText, { color: colors.accent }]}>
                {showCompleted ? 'Masquer les terminés' : `Afficher les terminés (${completedGoals.length})`}
            </Text>
        </TouchableOpacity>

        {showCompleted && completedGoals.length > 0 && (
            <View style={[styles.listGroup, { backgroundColor: colors.cardBg, marginTop: 10 }]}>
                {completedGoals.map((goal, index) => (
                    <View key={goal.id}>
                            <GoalItem 
                            goal={goal} 
                            isExpanded={expandedGoalIds.has(goal.id)}
                            onToggle={() => onToggleGoal(goal.id)} 
                            onToggleExpand={() => toggleExpand(goal.id)}
                            onLongPress={() => openEditModal(goal)}
                            colors={colors}
                            createSubObjective={createSubObjective}
                            toggleSubObjective={toggleSubObjective}
                            deleteSubObjective={deleteSubObjective}
                        />
                        {index < completedGoals.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                    </View>
                ))}
            </View>
        )}
      </ScrollView>
      
      {/* Create / Edit Modal */}
      <Modal
        visible={createModalVisible || editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setCreateModalVisible(false); setEditModalVisible(false); }}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>{createModalVisible ? 'Nouvel Objectif' : 'Modifier'}</Text>
                      <TouchableOpacity onPress={() => { setCreateModalVisible(false); setEditModalVisible(false); }}>
                          <Text style={{color: colors.accent, fontSize: 17, fontWeight: '600'}}>Fermer</Text>
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.inputLabel}>TITRE</Text>
                    <TextInput 
                        style={[styles.modalInput, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text }]} 
                        value={formTitle} 
                        onChangeText={setFormTitle} 
                        placeholder="Ex: Courir un marathon"
                        placeholderTextColor={colors.textSub}
                    />

                    {editModalVisible && (
                        <>
                            <Text style={styles.inputLabel}>PROGRESSION ({formProgress}%)</Text>
                            <View style={styles.progressControl}>
                                <TouchableOpacity onPress={() => changeProgress(-10)} style={[styles.progressBtn, {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'}]}>
                                    <Minus size={20} color={colors.text} />
                                </TouchableOpacity>
                                <View style={[styles.progressBarBg, {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'}]}>
                                    <View style={[styles.progressBarFill, { width: `${formProgress}%`, backgroundColor: colors.accent }]} />
                                </View>
                                <TouchableOpacity onPress={() => changeProgress(10)} style={[styles.progressBtn, {backgroundColor: isDarkMode ? '#333' : '#E5E5EA'}]}>
                                    <Plus size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    <Text style={styles.inputLabel}>DESCRIPTION</Text>
                    <TextInput 
                        style={[styles.modalInput, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text, minHeight: 80 }]} 
                        value={formDesc} 
                        onChangeText={setFormDesc} 
                        placeholder="Détails..."
                        placeholderTextColor={colors.textSub}
                        multiline
                    />

                    <Text style={styles.inputLabel}>DATE CIBLE (YYYY-MM-DD)</Text>
                    <View style={[styles.inputWithIcon, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]}>
                        <Calendar size={18} color={colors.textSub} style={{marginRight: 10}} />
                        <TextInput 
                            style={{ flex: 1, fontSize: 17, color: colors.text, height: 50 }} 
                            value={formDate} 
                            onChangeText={setFormDate} 
                            placeholder="ex: 2024-12-31"
                            placeholderTextColor={colors.textSub}
                        />
                    </View>

                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={createModalVisible ? handleAdd : handleUpdateGoal}>
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
                            <Text style={styles.deleteText}>Supprimer l'objectif</Text>
                        </TouchableOpacity>
                    )}
                  </ScrollView>
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
    colors: any;
    createSubObjective: (goalId: string, title: string) => void;
    toggleSubObjective: (subId: string, goalId: string) => void;
    deleteSubObjective: (subId: string, goalId: string) => void;
}

const GoalItem: React.FC<GoalItemProps> = ({ goal, isExpanded, onToggle, onToggleExpand, onLongPress, colors, createSubObjective, toggleSubObjective, deleteSubObjective }) => {
    const [newSubGoalTitle, setNewSubGoalTitle] = useState('');
    
    const addSubGoal = () => {
        if (!newSubGoalTitle.trim()) return;
        createSubObjective(goal.id, newSubGoalTitle);
        setNewSubGoalTitle('');
    };

    return (
        <View>
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
                        { borderColor: colors.textSub },
                        goal.completed && { backgroundColor: colors.orange, borderColor: colors.orange }
                    ]}
                >
                    {goal.completed && <Check size={14} color="white" strokeWidth={4} />}
                </TouchableOpacity>
                
                <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, { color: colors.text }, goal.completed && styles.taskTitleCompleted]}>
                        {goal.title}
                    </Text>
                    {/* Progress Bar Mini */}
                    {!goal.completed && (goal.progress || 0) > 0 && (
                        <View style={[styles.miniProgressBg, { backgroundColor: colors.border }]}>
                            <View style={[styles.miniProgressFill, { width: `${goal.progress}%`, backgroundColor: colors.accent }]} />
                        </View>
                    )}
                    {goal.target_date && (
                         <Text style={[styles.dateText, { color: colors.textSub }]}>🎯 {new Date(goal.target_date).toLocaleDateString()}</Text>
                    )}
                </View>

                <View style={styles.rightActions}>
                     {isExpanded ? <ChevronUp size={20} color={colors.textSub} /> : <ChevronDown size={20} color={colors.textSub} />}
                </View>
            </TouchableOpacity>

            {/* EXPANDED SECTION */}
            {isExpanded && (
                <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                    {goal.description && <Text style={[styles.descText, { color: colors.textSub }]}>{goal.description}</Text>}

                    {goal.subobjectives?.map(subObjective => (
                        <View key={subObjective.id} style={[styles.subtaskRow, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={() => toggleSubObjective(subObjective.id, goal.id)} style={[styles.subtaskCheckbox, { borderColor: colors.textSub }]}>
                                {subObjective.completed && <View style={[styles.subtaskChecked, { backgroundColor: colors.text }]} />}
                            </TouchableOpacity>
                            <Text style={[styles.subtaskTitle, { color: colors.text }, subObjective.completed && styles.subtaskTitleCompleted]}>
                                {subObjective.title}
                            </Text>
                            <TouchableOpacity onPress={() => deleteSubObjective(subObjective.id, goal.id)} style={{marginLeft: 'auto'}}>
                                <X size={14} color={colors.textSub} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    
                    <View style={styles.addSubtaskRow}>
                        <TextInput
                            style={[styles.subtaskInput, { color: colors.text }]}
                            placeholder="Ajouter une étape..."
                            placeholderTextColor={colors.textSub}
                            value={newSubGoalTitle}
                            onChangeText={setNewSubGoalTitle}
                            onSubmitEditing={addSubGoal}
                        />
                        <TouchableOpacity onPress={addSubGoal} disabled={!newSubGoalTitle.trim()}>
                            <Plus size={20} color={newSubGoalTitle.trim() ? colors.accent : colors.textSub} />
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
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  largeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'left',
  },
  headerTitleContainer: {
      flex: 1,
      justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  sectionHeader: {
      marginBottom: 8,
      marginLeft: 16,
  },
  sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#8E8E93',
  },
  listGroup: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  toggleCompletedBtn: {
      padding: 16,
      alignItems: 'center',
  },
  toggleText: {
      fontSize: 15,
      fontWeight: '500',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 60,
  },
  separator: {
    height: 1,
    marginLeft: 56, 
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
  taskTitleCompleted: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  dateText: {
      fontSize: 12,
      marginTop: 2,
  },
  rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  expandedSection: {
      paddingLeft: 56,
      paddingRight: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
  },
  descText: {
      fontSize: 14,
      marginBottom: 12,
      fontStyle: 'italic',
      marginTop: 8,
  },
  subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 0.5,
  },
  subtaskCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 6,
      borderWidth: 1.5,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },
  subtaskChecked: {
      width: 10,
      height: 10,
      borderRadius: 2,
  },
  subtaskTitle: {
      fontSize: 15,
      flex: 1,
  },
  subtaskTitleCompleted: {
      opacity: 0.5,
      textDecorationLine: 'line-through',
  },
  addSubtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
  },
  subtaskInput: {
      flex: 1,
      fontSize: 15,
      marginRight: 8,
  },
  
  // Progress
  miniProgressBg: {
      height: 4,
      borderRadius: 2,
      marginTop: 6,
      width: '60%',
  },
  miniProgressFill: {
      height: '100%',
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
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
  },
  progressBarBg: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
  },
  progressBarFill: {
      height: '100%',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
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
  modalInput: {
      padding: 14,
      borderRadius: 12,
      fontSize: 17,
      marginBottom: 20,
  },
  inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 20,
  },
  inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8E8E93',
      marginBottom: 8,
      textTransform: 'uppercase',
  },
  deleteActionBtn: {
      alignItems: 'center',
      marginTop: 20,
      padding: 10,
  },
  deleteText: {
      color: '#FF3B30',
      fontWeight: '600',
      fontSize: 17,
  },
  saveBtn: {
      padding: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 10,
  },
  saveBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 17,
  }
});

export default Goals;