import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Task, Subtask, Goal } from '../types';
import { Plus, Check, Trash2, X, Calendar, ArrowUpCircle } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import * as Haptics from 'expo-haptics';
import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { BlurView } from 'expo-blur';

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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Task['priority']>('medium');

  // Edit Form State
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
      warning: '#FF9500',
      success: '#34C759',
      priorityHigh: '#FF3B30',
      priorityMed: '#FF9500',
      priorityLow: '#34C759' // Green or Blue
  };

  const handleQuickAdd = () => {
    if (quickTitle.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Simple logic: if title contains "demain", set date to tomorrow (basic parsing demo)
        let dueDate = undefined;
        let title = quickTitle;
        
        if (title.toLowerCase().includes('demain')) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            dueDate = d.toISOString();
            title = title.replace(/demain/i, '').trim();
        }

        addTask(title, quickPriority, undefined, dueDate);
        setQuickTitle('');
        setQuickPriority('medium');
        Keyboard.dismiss();
    }
  };

  const toggleExpand = (taskId: string) => {
    const newSet = new Set(expandedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setExpandedTaskIds(newSet);
  };

  const onTaskToggle = (id: string) => {
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

  const getPriorityColor = (p: string) => {
      if (p === 'high') return colors.priorityHigh;
      if (p === 'medium') return colors.priorityMed;
      return colors.priorityLow;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
          <Text style={[styles.largeTitle, {color: colors.text}]}>Tâches</Text>
          <Text style={[styles.subtitle, {color: colors.textSub}]}>{activeTasks.length} en attente</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listGroup}>
            {activeTasks.length === 0 && (
                <View style={styles.emptyState}>
                    <Check size={40} color={colors.textSub} style={{opacity: 0.5, marginBottom: 10}} />
                    <Text style={[styles.emptyText, {color: colors.textSub}]}>Tout est propre. Profitez !</Text>
                </View>
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
                            priorityColor={getPriorityColor(task.priority)}
                        />
                    </SwipeableRow>
                    <View style={{height: 10}} />
                </Animated.View>
            ))}
        </View>

        {completedTasks.length > 0 && (
             <View style={styles.completedGroup}>
                <Text style={[styles.groupHeader, {color: colors.textSub}]}>TERMINÉES ({completedTasks.length})</Text>
                <View style={styles.listGroup}>
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
                                    priorityColor={colors.border} // Grey for completed
                                />
                             </SwipeableRow>
                             <View style={{height: 10}} />
                        </Animated.View>
                    ))}
                </View>
            </View>
        )}
      </ScrollView>

      {/* QUICK ADD BAR (Fixed Bottom) */}
      <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          keyboardVerticalOffset={Platform.OS === "ios" ? 85 : 0}
          style={[styles.quickAddContainer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}
      >
          <View style={styles.quickAddInner}>
              <TouchableOpacity 
                  onPress={() => setQuickPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')}
                  style={[styles.quickPriorityBtn, { borderColor: getPriorityColor(quickPriority) }]}
              >
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(quickPriority) }]} />
              </TouchableOpacity>
              
              <TextInput 
                  style={[styles.quickInput, { color: colors.text }]} 
                  placeholder="Ajouter une tâche..." 
                  placeholderTextColor={colors.textSub}
                  value={quickTitle}
                  onChangeText={setQuickTitle}
                  onSubmitEditing={handleQuickAdd}
              />
              
              <TouchableOpacity 
                  onPress={handleQuickAdd} 
                  style={[styles.quickSendBtn, { opacity: quickTitle ? 1 : 0.5 }]}
                  disabled={!quickTitle}
              >
                  <ArrowUpCircle size={32} color={colors.accent} fill={colors.cardBg} />
              </TouchableOpacity>
          </View>
      </KeyboardAvoidingView>

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} transparent={true} animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
          <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
              <View style={[styles.modalContent, {backgroundColor: colors.cardBg}]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, {color: colors.text}]}>Modifier</Text>
                      <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                          <Text style={{color: colors.accent, fontSize: 17, fontWeight: '600'}}>Fermer</Text>
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>TITRE</Text>
                    <TextInput style={[styles.modalInput, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]} value={formTitle} onChangeText={setFormTitle} />

                    <Text style={styles.label}>PRIORITÉ</Text>
                    <View style={styles.priorityRow}>
                         {(['low', 'medium', 'high'] as const).map(p => (
                             <TouchableOpacity key={p} style={[styles.priorityPill, {backgroundColor: isDarkMode ? '#333' : '#EEE'}, formPriority === p && {backgroundColor: colors.text}]} onPress={() => { setFormPriority(p); }}>
                                 <Text style={{color: formPriority === p ? (isDarkMode ? '#000' : '#FFF') : colors.textSub, fontWeight: '600', textTransform: 'capitalize'}}>{p}</Text>
                             </TouchableOpacity>
                         ))}
                    </View>

                    <Text style={styles.label}>DESCRIPTION</Text>
                    <TextInput style={[styles.modalInput, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text, minHeight: 80, paddingTop: 10}]} value={formDesc} onChangeText={setFormDesc} multiline />

                    <Text style={styles.label}>DATE</Text>
                    <View style={[styles.inputWithIcon, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7'}]}>
                        <Calendar size={18} color={colors.textSub} style={{marginRight: 10}} />
                        <TextInput style={[styles.transparentInput, {color: colors.text}]} value={formDate} onChangeText={setFormDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSub} />
                    </View>

                    <TouchableOpacity style={[styles.saveBtn, {backgroundColor: colors.accent}]} onPress={handleUpdateTask}>
                        <Text style={styles.saveBtnText}>Enregistrer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteActionBtn} onPress={() => {
                        if (selectedTask) {
                            Alert.alert("Supprimer", "Sûr ?", [
                                { text: "Annuler", style: "cancel"},
                                { text: "Supprimer", style: 'destructive', onPress: () => { deleteTask(selectedTask.id); setEditModalVisible(false); }}
                            ])
                        }
                    }}>
                        <Text style={styles.deleteText}>Supprimer la tâche</Text>
                    </TouchableOpacity>
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
    priorityColor: string;
    createSubtask: (taskId: string, title: string) => void;
    toggleSubtask: (subtaskId: string, taskId: string) => void;
    deleteSubtask: (subtaskId: string, taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isExpanded, onToggle, onToggleExpand, onLongPress, colors, priorityColor, createSubtask, toggleSubtask, deleteSubtask }) => {
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const handleAddSub = () => { if (!newSubtaskTitle.trim()) return; createSubtask(task.id, newSubtaskTitle); setNewSubtaskTitle(''); };

    return (
        <View style={[styles.taskCard, {backgroundColor: colors.cardBg, borderLeftColor: priorityColor}]}>
            <TouchableOpacity style={styles.taskItem} onPress={onToggleExpand} onLongPress={onLongPress} activeOpacity={0.7}>
                <TouchableOpacity onPress={onToggle} style={[styles.checkbox, { borderColor: task.completed ? colors.success : colors.textSub, backgroundColor: task.completed ? colors.success : 'transparent' }]}>
                    {task.completed && <Check size={14} color="#FFF" strokeWidth={4} />}
                </TouchableOpacity>
                <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, {color: colors.text}, task.completed && styles.taskTitleCompleted]}>{task.title}</Text>
                    {task.due_date && <Text style={[styles.dateText, {color: colors.textSub}]}>{new Date(task.due_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</Text>}
                </View>
            </TouchableOpacity>
            
            {isExpanded && (
                <View style={[styles.subtaskList, {borderTopColor: colors.border}]}>
                    {task.description ? <Text style={[styles.taskDescPreview, {color: colors.textSub}]}>{task.description}</Text> : null}
                    {task.subtasks?.map(sub => (
                        <View key={sub.id} style={[styles.subtaskRow, {borderBottomColor: colors.border}]}>
                            <TouchableOpacity onPress={() => toggleSubtask(sub.id, task.id)} style={[styles.subCheck, {borderColor: sub.completed ? colors.text : colors.textSub}]}>
                                {sub.completed && <View style={[styles.subCheckInner, {backgroundColor: colors.text}]} />}
                            </TouchableOpacity>
                            <Text style={[styles.subtaskText, {color: colors.text}, sub.completed && styles.subtaskTextDone]}>{sub.title}</Text>
                            <TouchableOpacity onPress={() => deleteSubtask(sub.id, task.id)}><X size={14} color={colors.textSub} /></TouchableOpacity>
                        </View>
                    ))}
                    <View style={styles.addSubtaskRow}>
                        <TextInput style={[styles.subInput, {color: colors.text}]} placeholder="Ajouter une étape..." placeholderTextColor={colors.textSub} value={newSubtaskTitle} onChangeText={setNewSubtaskTitle} onSubmitEditing={handleAddSub} />
                        <TouchableOpacity onPress={handleAddSub}><Plus size={20} color={colors.accent} /></TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  header: { paddingHorizontal: 20, marginBottom: 16, marginTop: 20 },
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: 0.37 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 4 },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  listGroup: {  },
  completedGroup: { marginTop: 30 },
  groupHeader: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontStyle: 'italic' },
  
  taskCard: {
      borderRadius: 12,
      marginBottom: 0,
      borderLeftWidth: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      overflow: 'hidden'
  },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 60 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 17, fontWeight: '600' },
  dateText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  taskTitleCompleted: { opacity: 0.5, textDecorationLine: 'line-through' },
  
  subtaskList: { padding: 16, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  taskDescPreview: { fontSize: 14, marginBottom: 12, fontStyle: 'italic' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  subCheck: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  subCheckInner: { width: 10, height: 10, borderRadius: 2 },
  subtaskText: { fontSize: 15, flex: 1 },
  subtaskTextDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  subInput: { flex: 1, fontSize: 15, marginRight: 10 },
  
  leftAction: { backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'flex-end', flex: 1, paddingRight: 20, borderRadius: 12 },
  rightAction: { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-start', flex: 1, paddingLeft: 20, borderRadius: 12 },
  
  // QUICK ADD
  quickAddContainer: {
      borderTopWidth: 1,
      paddingTop: 10,
      paddingBottom: 30, // Safe area approx
      paddingHorizontal: 16,
  },
  quickAddInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  quickPriorityBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
  },
  priorityDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
  },
  quickInput: {
      flex: 1,
      height: 44,
      fontSize: 16,
  },
  quickSendBtn: {
      padding: 4,
  },

  // MODAL
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