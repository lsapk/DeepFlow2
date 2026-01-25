import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { Task, Subtask, Goal } from '../types';
import { Plus, Check, Trash2, ChevronDown, ChevronUp, X, Calendar, Menu } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import * as Haptics from 'expo-haptics';
import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { BlurView } from 'expo-blur';
import { playMenuClick, playSuccess, playError } from '../services/sound';

interface TasksProps {
  tasks: Task[];
  goals: Goal[];
  toggleTask: (id: string) => void;
  addTask: (title: string, priority: Task['priority'], goalId?: string, dueDate?: string) => void;
  deleteTask: (id: string) => void;
  createSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (subtaskId: string, taskId: string) => void;
  deleteSubtask: (subtaskId: string, taskId: string) => void;
  userId: string;
  refreshTasks: () => void;
  openMenu?: () => void; 
  isDarkMode?: boolean;
}

const Tasks: React.FC<TasksProps> = ({ tasks, goals, toggleTask, addTask, deleteTask, createSubtask, toggleSubtask, deleteSubtask, userId, refreshTasks, openMenu, isDarkMode = true }) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Task['priority']>('medium');
  const [formGoalId, setFormGoalId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState('');

  const colors = {
      bg: isDarkMode ? '#000000' : '#F2F2F7',
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#007AFF',
      danger: '#FF3B30',
      success: '#34C759'
  };

  const openCreateModal = () => {
      // playMenuClick(); // Reduced for no-friction
      setFormTitle('');
      setFormDesc('');
      setFormPriority('medium');
      setFormGoalId(null);
      setFormDate('');
      setCreateModalVisible(true);
  };

  const handleAdd = async () => {
    if (formTitle.trim()) {
      // Optimistic create via Prop
      const dateIso = formDate ? new Date(formDate).toISOString() : undefined;
      addTask(formTitle, formPriority, formGoalId || undefined, dateIso);
      setCreateModalVisible(false);
    }
  };

  const toggleExpand = (taskId: string) => {
    // playMenuClick();
    const newSet = new Set(expandedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setExpandedTaskIds(newSet);
  };

  const onTaskToggle = (id: string) => {
      // playSuccess(); // handled in App.tsx logic for consistency or remove for zero friction
      toggleTask(id);
  };

  const openEditModal = (task: Task) => {
      setSelectedTask(task);
      setFormTitle(task.title);
      setFormDesc(task.description || '');
      setFormPriority(task.priority);
      setFormGoalId(task.linked_goal_id || null);
      setFormDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
      setEditModalVisible(true);
  };

  const handleUpdateTask = async () => {
      if (!selectedTask) return;
      // For updates, we can keep using direct supabase or pass up. Keeping direct for now as "creation" was the main issue.
      await supabase.from('tasks').update({ 
          title: formTitle,
          description: formDesc,
          linked_goal_id: formGoalId,
          priority: formPriority,
          due_date: formDate ? new Date(formDate).toISOString() : null
      }).eq('id', selectedTask.id);
      
      refreshTasks();
      setEditModalVisible(false);
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
              <Text style={[styles.largeTitle, {color: colors.text}]}>Tâches</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                <Plus size={24} color={colors.accent} />
          </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.listGroup, {backgroundColor: colors.cardBg}]}>
            {activeTasks.length === 0 && (
                <Text style={[styles.emptyText, {color: colors.textSub}]}>Rien à faire.</Text>
            )}
            {activeTasks.map((task, index) => (
                <Animated.View key={task.id} layout={LinearTransition.springify()} entering={FadeIn} exiting={FadeOut}>
                    <SwipeableRow onSwipeRight={() => onTaskToggle(task.id)} onSwipeLeft={() => deleteTask(task.id)}>
                        <TaskItem 
                            task={task} 
                            isExpanded={expandedTaskIds.has(task.id)} 
                            onToggle={() => onTaskToggle(task.id)} 
                            onToggleExpand={() => toggleExpand(task.id)} 
                            onLongPress={() => openEditModal(task)} 
                            colors={colors} 
                            createSubtask={createSubtask}
                            toggleSubtask={toggleSubtask}
                            deleteSubtask={deleteSubtask}
                        />
                    </SwipeableRow>
                    {index < activeTasks.length - 1 && <View style={[styles.separator, {backgroundColor: colors.border}]} />}
                </Animated.View>
            ))}
        </View>

        {completedTasks.length > 0 && (
             <View style={styles.completedGroup}>
                <Text style={[styles.groupHeader, {color: colors.textSub}]}>TERMINÉES</Text>
                <View style={[styles.listGroup, {backgroundColor: colors.cardBg}]}>
                    {completedTasks.map((task, index) => (
                        <Animated.View key={task.id} layout={LinearTransition.springify()} entering={FadeIn} exiting={FadeOut}>
                             <SwipeableRow onSwipeLeft={() => deleteTask(task.id)}>
                                <TaskItem 
                                    task={task} 
                                    isExpanded={expandedTaskIds.has(task.id)} 
                                    onToggle={() => onTaskToggle(task.id)} 
                                    onToggleExpand={() => toggleExpand(task.id)} 
                                    onLongPress={() => openEditModal(task)} 
                                    colors={colors} 
                                    createSubtask={createSubtask}
                                    toggleSubtask={toggleSubtask}
                                    deleteSubtask={deleteSubtask}
                                />
                             </SwipeableRow>
                            {index < completedTasks.length - 1 && <View style={[styles.separator, {backgroundColor: colors.border}]} />}
                        </Animated.View>
                    ))}
                </View>
            </View>
        )}
      </ScrollView>

      {/* BLUR MODAL */}
      <Modal visible={createModalVisible || editModalVisible} transparent={true} animationType="fade" onRequestClose={() => { setCreateModalVisible(false); setEditModalVisible(false); }}>
          <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
              <View style={[styles.modalContent, {backgroundColor: colors.cardBg}]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, {color: colors.text}]}>{createModalVisible ? 'Nouvelle Tâche' : 'Modifier'}</Text>
                      <TouchableOpacity onPress={() => { setCreateModalVisible(false); setEditModalVisible(false); }}>
                          <Text style={{color: colors.accent, fontSize: 17, fontWeight: '600'}}>Fermer</Text>
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>TITRE</Text>
                    <TextInput style={[styles.modalInput, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]} value={formTitle} onChangeText={setFormTitle} placeholder="Ex: Payer loyer" placeholderTextColor={colors.textSub} />

                    <Text style={styles.label}>PRIORITÉ</Text>
                    <View style={styles.priorityRow}>
                         {(['low', 'medium', 'high'] as const).map(p => (
                             <TouchableOpacity key={p} style={[styles.priorityPill, {backgroundColor: isDarkMode ? '#333' : '#EEE'}, formPriority === p && {backgroundColor: colors.text}]} onPress={() => { setFormPriority(p); }}>
                                 <Text style={{color: formPriority === p ? (isDarkMode ? '#000' : '#FFF') : colors.textSub, fontWeight: '600', textTransform: 'capitalize'}}>{p}</Text>
                             </TouchableOpacity>
                         ))}
                    </View>

                    <Text style={styles.label}>DESCRIPTION</Text>
                    <TextInput style={[styles.modalInput, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text, minHeight: 80, paddingTop: 10}]} value={formDesc} onChangeText={setFormDesc} placeholder="Détails de la tâche..." placeholderTextColor={colors.textSub} multiline />

                    <Text style={styles.label}>DATE (YYYY-MM-DD)</Text>
                    <View style={[styles.inputWithIcon, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7'}]}>
                        <Calendar size={18} color={colors.textSub} style={{marginRight: 10}} />
                        <TextInput style={[styles.transparentInput, {color: colors.text}]} value={formDate} onChangeText={setFormDate} placeholder="ex: 2024-12-31" placeholderTextColor={colors.textSub} />
                    </View>

                    <TouchableOpacity style={[styles.saveBtn, {backgroundColor: colors.accent}]} onPress={createModalVisible ? handleAdd : handleUpdateTask}>
                        <Text style={styles.saveBtnText}>Enregistrer</Text>
                    </TouchableOpacity>

                    {editModalVisible && (
                        <TouchableOpacity style={styles.deleteActionBtn} onPress={() => {
                                if (selectedTask) {
                                    Alert.alert("Supprimer", "Êtes-vous sûr ?", [
                                        { text: "Annuler", style: "cancel"},
                                        { text: "Supprimer", style: 'destructive', onPress: () => { deleteTask(selectedTask.id); setEditModalVisible(false); }}
                                    ])
                                }
                            }}>
                            <Text style={styles.deleteText}>Supprimer la tâche</Text>
                        </TouchableOpacity>
                    )}
                  </ScrollView>
              </View>
          </BlurView>
      </Modal>
    </View>
  );
};

const SwipeableRow = ({ children, onSwipeLeft, onSwipeRight }: any) => {
    const renderRightActions = () => onSwipeLeft ? <TouchableOpacity style={styles.rightAction} onPress={onSwipeLeft}><Trash2 size={24} color="#FFF" /></TouchableOpacity> : null;
    const renderLeftActions = () => onSwipeRight ? <TouchableOpacity style={styles.leftAction} onPress={onSwipeRight}><Check size={24} color="#FFF" /></TouchableOpacity> : null;
    return <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions}>{children}</Swipeable>;
};

interface TaskItemProps {
    task: Task;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleExpand: () => void;
    onLongPress: () => void;
    colors: any;
    createSubtask: (taskId: string, title: string) => void;
    toggleSubtask: (subtaskId: string, taskId: string) => void;
    deleteSubtask: (subtaskId: string, taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isExpanded, onToggle, onToggleExpand, onLongPress, colors, createSubtask, toggleSubtask, deleteSubtask }) => {
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const handleAddSub = () => { if (!newSubtaskTitle.trim()) return; createSubtask(task.id, newSubtaskTitle); setNewSubtaskTitle(''); };

    return (
        <View style={{backgroundColor: colors.cardBg}}>
            <TouchableOpacity style={styles.taskItem} onPress={onToggleExpand} onLongPress={onLongPress} activeOpacity={0.7}>
                <View style={[styles.priorityIndicator, { backgroundColor: task.priority === 'high' ? colors.danger : (task.priority === 'medium' ? colors.orange : 'transparent') }]} />
                <TouchableOpacity onPress={onToggle} style={[styles.checkbox, { borderColor: colors.textSub }, task.completed && { backgroundColor: colors.success, borderColor: colors.success }]}>
                    {task.completed && <Check size={12} color="#FFF" strokeWidth={3} />}
                </TouchableOpacity>
                <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, {color: colors.text}, task.completed && styles.taskTitleCompleted]}>{task.title}</Text>
                    {task.due_date && <Text style={[styles.dateText, {color: colors.textSub}]}>{new Date(task.due_date).toLocaleDateString()}</Text>}
                </View>
                <TouchableOpacity onPress={onToggleExpand} style={styles.expandBtn}>{isExpanded ? <ChevronUp size={20} color={colors.textSub} /> : <ChevronDown size={20} color={colors.textSub} />}</TouchableOpacity>
            </TouchableOpacity>
            {isExpanded && (
                <View style={[styles.subtaskList, {backgroundColor: colors.cardBg, borderTopColor: colors.border}]}>
                    {task.description && <Text style={[styles.taskDescPreview, {color: colors.textSub}]}>{task.description}</Text>}
                    {task.subtasks?.map(sub => (
                        <View key={sub.id} style={[styles.subtaskRow, {borderBottomColor: colors.border}]}>
                            <TouchableOpacity onPress={() => toggleSubtask(sub.id, task.id)} style={[styles.subCheck, {borderColor: colors.textSub}]}>{sub.completed && <View style={[styles.subCheckInner, {backgroundColor: colors.text}]} />}</TouchableOpacity>
                            <Text style={[styles.subtaskText, {color: colors.text}, sub.completed && styles.subtaskTextDone]}>{sub.title}</Text>
                            <TouchableOpacity onPress={() => deleteSubtask(sub.id, task.id)}><X size={14} color={colors.textSub} /></TouchableOpacity>
                        </View>
                    ))}
                    <View style={styles.addSubtaskRow}>
                        <TextInput style={[styles.subInput, {color: colors.text}]} placeholder="Ajouter sous-tâche..." placeholderTextColor={colors.textSub} value={newSubtaskTitle} onChangeText={setNewSubtaskTitle} onSubmitEditing={handleAddSub} />
                        <TouchableOpacity onPress={handleAddSub}><Plus size={20} color={colors.accent} /></TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  header: { paddingHorizontal: 20, marginBottom: 20, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 50 },
  largeTitle: { fontSize: 22, fontWeight: '700', textAlign: 'left' },
  headerTitleContainer: { flex: 1, justifyContent: 'center' },
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },
  listGroup: { borderRadius: 14, overflow: 'hidden' },
  completedGroup: { marginTop: 30 },
  groupHeader: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 16, textTransform: 'uppercase' },
  emptyText: { padding: 20, textAlign: 'center', fontStyle: 'italic' },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 60 },
  priorityIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  separator: { height: 1, marginLeft: 56 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, marginRight: 16, alignItems: 'center', justifyContent: 'center' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 17, fontWeight: '500' },
  dateText: { fontSize: 12, marginTop: 2 },
  taskTitleCompleted: { opacity: 0.5, textDecorationLine: 'line-through' },
  expandBtn: { padding: 8 },
  subtaskList: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1 },
  taskDescPreview: { fontSize: 14, marginBottom: 12, marginTop: 8, marginLeft: 40 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginLeft: 40, borderBottomWidth: 0.5 },
  subCheck: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  subCheckInner: { width: 10, height: 10, borderRadius: 2 },
  subtaskText: { fontSize: 15, flex: 1 },
  subtaskTextDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 40 },
  subInput: { flex: 1, fontSize: 15, marginRight: 10 },
  leftAction: { backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'flex-end', flex: 1, paddingRight: 20 },
  rightAction: { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-start', flex: 1, paddingLeft: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 12, color: '#8E8E93', marginBottom: 8, marginTop: 16, fontWeight: '600', letterSpacing: 0.5 },
  modalInput: { padding: 14, borderRadius: 12, fontSize: 17 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14 },
  transparentInput: { flex: 1, height: 50, fontSize: 17 },
  priorityRow: { flexDirection: 'row', gap: 12 },
  priorityPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flex: 1, alignItems: 'center' },
  deleteActionBtn: { alignItems: 'center', padding: 16, marginTop: 20 },
  deleteText: { color: '#FF3B30', fontWeight: '600', fontSize: 17 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 }
});

export default Tasks;