import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal, Alert } from 'react-native';
import { Goal, SubObjective } from '../types';
import { Plus, Check, ChevronDown, ChevronUp, X, Calendar, Minus, Flag, GitBranch, Menu } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';

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
  openMenu: () => void;
  isDarkMode?: boolean;
  noPadding?: boolean;
}

const Goals: React.FC<GoalsProps> = ({ goals, toggleGoal, addGoal, deleteGoal, createSubObjective, toggleSubObjective, deleteSubObjective, userId, refreshGoals, openMenu, isDarkMode = true, noPadding = false }) => {
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
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

  const toggleExpand = useCallback((goalId: string) => {
    // Removed LayoutAnimation for instant snap
    setExpandedGoalIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) newSet.delete(goalId);
      else newSet.add(goalId);
      return newSet;
    });
  }, []);

  const openEditModal = useCallback((goal: Goal) => {
      setSelectedGoal(goal);
      setFormTitle(goal.title);
      setFormDesc(goal.description || '');
      setFormDate(goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : '');
      setFormProgress(goal.progress || 0);
      setEditModalVisible(true);
  }, []);

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
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: noPadding ? 0 : 20 }]}>
      <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <Text style={[styles.largeTitle, { color: colors.text }]}>Objectifs</Text>
          </View>
          <TouchableOpacity style={[styles.addButton, {backgroundColor: colors.accent}]} onPress={openCreateModal}>
                <Plus size={20} color="#FFF" strokeWidth={3} />
          </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EN COURS</Text>
        </View>

        <View style={styles.listGroup}>
            {activeGoals.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSub }]}>Aucun objectif actif.</Text>
            )}
            {activeGoals.map((goal) => (
                <GoalItem 
                    key={goal.id}
                    goal={goal} 
                    isExpanded={expandedGoalIds.has(goal.id)}
                    onToggle={() => toggleGoal(goal.id)} 
                    onToggleExpand={() => toggleExpand(goal.id)}
                    onLongPress={() => openEditModal(goal)}
                    colors={colors}
                    createSubObjective={createSubObjective}
                    toggleSubObjective={toggleSubObjective}
                    deleteSubObjective={deleteSubObjective}
                />
            ))}
        </View>

        <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)} style={styles.toggleCompletedBtn}>
            <Text style={[styles.toggleText, { color: colors.accent }]}>
                {showCompleted ? 'Masquer les terminés' : `Afficher les terminés (${completedGoals.length})`}
            </Text>
        </TouchableOpacity>

        {showCompleted && completedGoals.length > 0 && (
            <View style={[styles.listGroup, { marginTop: 10 }]}>
                {completedGoals.map((goal) => (
                    <GoalItem 
                        key={goal.id}
                        goal={goal} 
                        isExpanded={expandedGoalIds.has(goal.id)}
                        onToggle={() => toggleGoal(goal.id)} 
                        onToggleExpand={() => toggleExpand(goal.id)}
                        onLongPress={() => openEditModal(goal)}
                        colors={colors}
                        createSubObjective={createSubObjective}
                        toggleSubObjective={toggleSubObjective}
                        deleteSubObjective={deleteSubObjective}
                    />
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
                                Alert.alert("Supprimer l'objectif ?", "Toutes les sous-tâches associées seront aussi supprimées.", [
                                    { text: "Annuler", style: "cancel"},
                                    { text: "Supprimer", style: 'destructive', onPress: () => {
                                        deleteGoal(selectedGoal!.id);
                                        setEditModalVisible(false);
                                    }}
                                ])
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

const GoalItem = React.memo(({ goal, isExpanded, onToggle, onToggleExpand, onLongPress, colors, createSubObjective, toggleSubObjective, deleteSubObjective }: any) => {
    const [newSubGoalTitle, setNewSubGoalTitle] = useState('');
    
    const addSubGoal = () => {
        if (!newSubGoalTitle.trim()) return;
        createSubObjective(goal.id, newSubGoalTitle);
        setNewSubGoalTitle('');
    };

    const confirmDeleteSub = (subId: string) => {
        Alert.alert("Supprimer la branche ?", "", [
            { text: "Non", style: "cancel" },
            { text: "Oui", style: "destructive", onPress: () => deleteSubObjective(subId, goal.id) }
        ]);
    };

    return (
        <View style={[styles.goalCard, {backgroundColor: colors.cardBg}]}>
            <TouchableOpacity style={styles.taskItem} onPress={onToggleExpand} onLongPress={onLongPress} activeOpacity={0.8}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={onToggle}>
                        {goal.completed ? <Check size={24} color={colors.success} /> : <Flag size={24} color={colors.textSub} />}
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                         <Text style={[styles.taskTitle, { color: colors.text }, goal.completed && styles.taskTitleCompleted]}>{goal.title}</Text>
                         {goal.target_date && <Text style={[styles.dateText, {color: colors.textSub}]}>Date cible : {new Date(goal.target_date).toLocaleDateString()}</Text>}
                    </View>
                    <View style={styles.rightActions}>
                        {isExpanded ? <ChevronUp size={20} color={colors.textSub} /> : <ChevronDown size={20} color={colors.textSub} />}
                    </View>
                </View>

                {!goal.completed && (
                    <View style={styles.rpgProgressContainer}>
                         <View style={[styles.rpgBarBg, {backgroundColor: '#333'}]}>
                             <LinearGradient colors={['#4F46E5', '#9333EA']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={[styles.rpgBarFill, { width: `${goal.progress || 0}%` }]} />
                             <View style={[styles.milestone, {left: '25%'}]} />
                             <View style={[styles.milestone, {left: '50%'}]} />
                             <View style={[styles.milestone, {left: '75%'}]} />
                         </View>
                         <Text style={styles.progressText}>{goal.progress || 0}%</Text>
                    </View>
                )}
            </TouchableOpacity>

            {isExpanded && (
                <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                    {goal.description && <Text style={[styles.descText, { color: colors.textSub }]}>{goal.description}</Text>}
                    <View style={styles.treeContainer}>
                        <View style={[styles.treeLineVertical, { backgroundColor: colors.border }]} />
                        {goal.subobjectives?.map((subObjective: SubObjective) => (
                            <View key={subObjective.id} style={styles.treeItem}>
                                <View style={[styles.treeLineHorizontal, { backgroundColor: colors.border }]} />
                                <View style={[styles.subtaskRow, { borderBottomColor: colors.border }]}>
                                    <TouchableOpacity onPress={() => toggleSubObjective(subObjective.id, goal.id)} style={[styles.subtaskCheckbox, { borderColor: colors.textSub }]}>
                                        {subObjective.completed && <View style={[styles.subtaskChecked, { backgroundColor: colors.text }]} />}
                                    </TouchableOpacity>
                                    <Text style={[styles.subtaskTitle, { color: colors.text }, subObjective.completed && styles.subtaskTitleCompleted]}>{subObjective.title}</Text>
                                    <TouchableOpacity onPress={() => confirmDeleteSub(subObjective.id)} style={{marginLeft: 'auto'}}><X size={14} color={colors.textSub} /></TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                    <View style={styles.addSubtaskRow}>
                        <GitBranch size={16} color={colors.textSub} style={{marginRight: 8}} />
                        <TextInput style={[styles.subtaskInput, { color: colors.text }]} placeholder="Nouvelle branche..." placeholderTextColor={colors.textSub} value={newSubGoalTitle} onChangeText={setNewSubGoalTitle} onSubmitEditing={addSubGoal} />
                        <TouchableOpacity onPress={addSubGoal} disabled={!newSubGoalTitle.trim()}><Plus size={20} color={newSubGoalTitle.trim() ? colors.accent : colors.textSub} /></TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    )
}, (prev, next) => {
    return (
        prev.isExpanded === next.isExpanded &&
        prev.goal === next.goal && 
        prev.goal.subobjectives === next.goal.subobjectives && 
        prev.goal.progress === next.goal.progress &&
        prev.colors.bg === next.colors.bg
    );
});

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  header: { paddingHorizontal: 20, marginBottom: 16, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: 0.37 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },
  sectionHeader: { marginBottom: 8, marginLeft: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  listGroup: { gap: 16 },
  toggleCompletedBtn: { padding: 16, alignItems: 'center' },
  toggleText: { fontSize: 15, fontWeight: '500' },
  emptyText: { padding: 20, textAlign: 'center', fontStyle: 'italic' },
  goalCard: { borderRadius: 16, overflow: 'hidden', paddingBottom: 4 },
  taskItem: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 18, fontWeight: '700' },
  taskTitleCompleted: { opacity: 0.5, textDecorationLine: 'line-through' },
  dateText: { fontSize: 12, marginTop: 2 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rpgProgressContainer: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rpgBarBg: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  rpgBarFill: { height: '100%', borderRadius: 6 },
  milestone: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 10 },
  progressText: { color: '#FFF', fontSize: 12, fontWeight: '700', width: 35, textAlign: 'right' },
  expandedSection: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, marginTop: 8 },
  descText: { fontSize: 14, marginBottom: 12, fontStyle: 'italic', marginTop: 8 },
  treeContainer: { position: 'relative', paddingLeft: 10 },
  treeLineVertical: { position: 'absolute', left: 0, top: 0, bottom: 15, width: 2, borderRadius: 1 },
  treeItem: { position: 'relative', paddingLeft: 16, marginBottom: 0 },
  treeLineHorizontal: { position: 'absolute', left: 0, top: 22, width: 12, height: 2 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  subtaskCheckbox: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  subtaskChecked: { width: 10, height: 10, borderRadius: 2 },
  subtaskTitle: { fontSize: 15, flex: 1 },
  subtaskTitleCompleted: { opacity: 0.5, textDecorationLine: 'line-through' },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingLeft: 10 },
  subtaskInput: { flex: 1, fontSize: 15, marginRight: 8 },
  miniProgressBg: { height: 4, borderRadius: 2, marginTop: 6, width: '60%' },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  progressControl: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  progressBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  progressBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalInput: { padding: 14, borderRadius: 12, fontSize: 17, marginBottom: 20 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 8, textTransform: 'uppercase' },
  deleteActionBtn: { alignItems: 'center', marginTop: 20, padding: 10 },
  deleteText: { color: '#FF3B30', fontWeight: '600', fontSize: 17 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 }
});

export default Goals;