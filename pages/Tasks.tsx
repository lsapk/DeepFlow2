import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, Platform, FlatList, ActivityIndicator, InteractionManager, ScrollView } from 'react-native';
import { Task, Subtask, Goal } from '../types';
import { Plus, Check, Trash2, X, Sparkles, Menu } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { generateSubtasks } from '../services/ai';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TasksProps {
  tasks: Task[];
  goals: Goal[];
  toggleTask: (id: string) => void;
  addTask: (title: string, priority: Task['priority'], goalId?: string, dueDate?: string, description?: string) => void;
  deleteTask: (id: string) => void;
  createSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (subtaskId: string, taskId: string) => void;
  deleteSubtask: (subtaskId: string, taskId: string) => void;
  userId: string;
  refreshTasks: () => void;
  openMenu: () => void; 
  isDarkMode?: boolean;
  noPadding?: boolean;
}

const Tasks: React.FC<TasksProps> = ({ tasks, goals, toggleTask, addTask, deleteTask, createSubtask, toggleSubtask, deleteSubtask, userId, refreshTasks, openMenu, isDarkMode = true }) => {
  const insets = useSafeAreaInsets(); // Hook pour gérer les marges de sécurité (encoche, barre home)
  
  const [isReady, setIsReady] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Task['priority']>('medium');
  const [formGoalId, setFormGoalId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  const colors = {
      bg: isDarkMode ? '#000000' : '#F2F2F7',
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#007AFF',
      danger: '#FF3B30',
      success: '#34C759',
      priorityHigh: '#FF3B30',
      priorityMed: '#FF9500',
      priorityLow: '#34C759'
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  const openCreateModal = () => {
      setIsCreating(true);
      setSelectedTask(null);
      setFormTitle('');
      setFormDesc('');
      setFormPriority('medium');
      setFormGoalId(null);
      setFormDate('');
      setEditModalVisible(true);
  };

  const openEditModal = useCallback((task: Task) => {
      setIsCreating(false);
      setSelectedTask(task);
      setFormTitle(task.title);
      setFormDesc(task.description || '');
      setFormPriority(task.priority);
      setFormGoalId(task.linked_goal_id || null);
      setFormDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
      setEditModalVisible(true);
  }, []);

  const confirmDeleteTask = (id: string) => {
      Alert.alert(
          "Supprimer la tâche ?",
          "Cette action est irréversible.",
          [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: "destructive", onPress: () => {
                  deleteTask(id);
                  setEditModalVisible(false);
              }}
          ]
      );
  };

  const handleSaveTask = async () => {
      if (!formTitle.trim()) return;

      if (isCreating) {
          addTask(
              formTitle,
              formPriority,
              formGoalId || undefined,
              formDate ? new Date(formDate).toISOString() : undefined,
              formDesc
          );
      } else {
          if (!selectedTask) return;
          await supabase.from('tasks').update({
              title: formTitle,
              description: formDesc,
              linked_goal_id: formGoalId,
              priority: formPriority,
              due_date: formDate ? new Date(formDate).toISOString() : null,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
          }).eq('id', selectedTask.id);
          refreshTasks();
      }
      setEditModalVisible(false);
  };

  const handleMagicSplit = async () => {
      if (!selectedTask?.title) return;
      setIsSplitting(true);
      try {
          const subtasks = await generateSubtasks(selectedTask.title);
          if (subtasks.length > 0) {
              for (const st of subtasks) {
                  await createSubtask(selectedTask.id, st);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Magic Split", `${subtasks.length} sous-tâches générées !`);
          } else {
              Alert.alert("Info", "L'IA n'a pas pu diviser cette tâche.");
          }
      } catch (e) {
          Alert.alert("Erreur", "Impossible de contacter l'IA.");
      } finally {
          setIsSplitting(false);
          setEditModalVisible(false);
      }
  };

  const activeTasks = useMemo(() => {
      return tasks.filter(t => !t.completed).sort((a, b) => {
          const score = (p: string) => p === 'high' ? 3 : p === 'medium' ? 2 : 1;
          return score(b.priority) - score(a.priority);
      });
  }, [tasks]);

  const completedTasks = useMemo(() => tasks.filter(t => t.completed), [tasks]);

  const getPriorityColor = (p: string) => {
      if (p === 'high') return colors.priorityHigh;
      if (p === 'medium') return colors.priorityMed;
      return colors.priorityLow;
  };

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <View style={{marginBottom: 10}}>
        <SwipeableRow onSwipeRight={() => toggleTask(item.id)} onSwipeLeft={() => confirmDeleteTask(item.id)}>
            <TaskItem 
                task={item} 
                onToggle={() => toggleTask(item.id)} 
                onLongPress={() => openEditModal(item)} 
                colors={colors} 
                createSubtask={createSubtask}
                toggleSubtask={toggleSubtask}
                deleteSubtask={deleteSubtask}
                priorityColor={getPriorityColor(item.priority)}
            />
        </SwipeableRow>
    </View>
  ), [colors, toggleTask, deleteTask, openEditModal, createSubtask, toggleSubtask, deleteSubtask]);

  const ListFooter = () => (
      completedTasks.length > 0 ? (
        <View style={styles.completedGroup}>
            <Text style={[styles.groupHeader, {color: colors.textSub}]}>TERMINÉES ({completedTasks.length})</Text>
            {completedTasks.map((task) => (
                <View key={task.id} style={{marginBottom: 10}}>
                    <SwipeableRow onSwipeLeft={() => confirmDeleteTask(task.id)}>
                        <TaskItem 
                            task={task} 
                            onToggle={() => toggleTask(task.id)} 
                            onLongPress={() => openEditModal(task)} 
                            colors={colors} 
                            createSubtask={createSubtask}
                            toggleSubtask={toggleSubtask}
                            deleteSubtask={deleteSubtask}
                            priorityColor={colors.border}
                        />
                    </SwipeableRow>
                </View>
            ))}
        </View>
      ) : null
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
          <View style={{flex: 1}}>
            <Text style={[styles.largeTitle, {color: colors.text}]}>Tâches</Text>
            <Text style={[styles.subtitle, {color: colors.textSub}]}>{activeTasks.length} en attente</Text>
          </View>
          <TouchableOpacity style={[styles.addButton, {backgroundColor: colors.accent}]} onPress={openCreateModal}>
             <Plus size={24} color="#FFF" strokeWidth={3} />
          </TouchableOpacity>
      </View>

      {!isReady ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator size="small" color={colors.textSub} />
          </View>
      ) : (
          <FlatList
            data={activeTasks}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]} // Extra padding pour éviter que le dernier élément soit caché
            ListFooterComponent={ListFooter}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
          />
      )}

      {/* MODAL */}
      <Modal visible={editModalVisible} transparent={true} animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {backgroundColor: colors.cardBg}]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, {color: colors.text}]}>{isCreating ? 'Nouvelle Tâche' : 'Modifier'}</Text>
                      <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                          <Text style={{color: colors.accent, fontSize: 17, fontWeight: '600'}}>Fermer</Text>
                      </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>TITRE</Text>
                    <TextInput style={[styles.modalInput, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text}]} value={formTitle} onChangeText={setFormTitle} placeholder="Faire les courses..." placeholderTextColor={colors.textSub} />

                    {!isCreating && (
                        <TouchableOpacity style={[styles.magicBtn, {backgroundColor: isDarkMode ? '#333' : '#EEE'}]} onPress={handleMagicSplit} disabled={isSplitting}>
                            {isSplitting ? <ActivityIndicator color={colors.accent} size="small" /> : <Sparkles size={20} color="#FACC15" fill="#FACC15" />}
                            <Text style={[styles.magicBtnText, {color: colors.text}]}>{isSplitting ? 'IA au travail...' : 'Magic Split (IA)'}</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>PRIORITÉ</Text>
                    <View style={styles.priorityRow}>
                         {(['low', 'medium', 'high'] as const).map(p => (
                             <TouchableOpacity key={p} style={[styles.priorityPill, {backgroundColor: isDarkMode ? '#333' : '#EEE'}, formPriority === p && {backgroundColor: colors.text}]} onPress={() => { setFormPriority(p); }}>
                                 <Text style={{color: formPriority === p ? (isDarkMode ? '#000' : '#FFF') : colors.textSub, fontWeight: '600', textTransform: 'capitalize'}}>{p}</Text>
                             </TouchableOpacity>
                         ))}
                    </View>

                    <Text style={styles.label}>DESCRIPTION</Text>
                    <TextInput style={[styles.modalInput, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7', color: colors.text, minHeight: 80, paddingTop: 14}]} value={formDesc} onChangeText={setFormDesc} multiline placeholder="Détails de la tâche..." placeholderTextColor={colors.textSub} />

                    <Text style={styles.label}>DATE</Text>
                    <View style={[styles.inputWithIcon, {backgroundColor: isDarkMode ? '#000' : '#F2F2F7'}]}>
                        <TextInput style={[styles.transparentInput, {color: colors.text}]} value={formDate} onChangeText={setFormDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSub} />
                    </View>

                    <TouchableOpacity style={[styles.saveBtn, {backgroundColor: colors.accent}]} onPress={handleSaveTask}>
                        <Text style={styles.saveBtnText}>{isCreating ? 'Créer la tâche' : 'Enregistrer'}</Text>
                    </TouchableOpacity>

                    {!isCreating && selectedTask && (
                        <TouchableOpacity style={styles.deleteActionBtn} onPress={() => confirmDeleteTask(selectedTask.id)}>
                            <Text style={styles.deleteText}>Supprimer la tâche</Text>
                        </TouchableOpacity>
                    )}
                  </ScrollView>
              </View>
          </View>
      </Modal>
    </View>
  );
};

// ... SubtaskItem and TaskItem components remain the same ...
const SwipeableRow = ({ children, onSwipeLeft, onSwipeRight }: any) => {
    const renderRightActions = () => onSwipeLeft ? <TouchableOpacity style={styles.rightAction} onPress={onSwipeLeft}><Trash2 size={24} color="#FFF" /></TouchableOpacity> : null;
    const renderLeftActions = () => onSwipeRight ? <TouchableOpacity style={styles.leftAction} onPress={onSwipeRight}><Check size={24} color="#FFF" /></TouchableOpacity> : null;
    return <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions}>{children}</Swipeable>;
};

const SubtaskItem = React.memo(({ sub, taskId, colors, toggleSubtask, deleteSubtask }: any) => {
    const confirmDelete = () => {
        Alert.alert("Supprimer l'étape ?", "", [
            { text: "Non", style: "cancel" },
            { text: "Oui", style: "destructive", onPress: () => deleteSubtask(sub.id, taskId) }
        ]);
    };

    return (
        <TouchableOpacity 
            style={[styles.subtaskRow, {borderBottomColor: colors.border}]} 
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleSubtask(sub.id, taskId);
            }}
            activeOpacity={0.6}
        >
            <View style={[styles.subCheck, {borderColor: sub.completed ? colors.text : colors.textSub}]}>
                {sub.completed && <View style={[styles.subCheckInner, {backgroundColor: colors.text}]} />}
            </View>
            <Text style={[styles.subtaskText, {color: colors.text}, sub.completed && styles.subtaskTextDone]}>{sub.title}</Text>
            <TouchableOpacity 
                onPress={confirmDelete} 
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={{padding: 4}}
            >
                <X size={14} color={colors.textSub} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

const TaskItem = React.memo(({ task, onToggle, onLongPress, colors, priorityColor, createSubtask, toggleSubtask, deleteSubtask }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    
    const handleAddSub = () => { if (!newSubtaskTitle.trim()) return; createSubtask(task.id, newSubtaskTitle); setNewSubtaskTitle(''); };
    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <View style={[styles.taskCard, {backgroundColor: colors.cardBg, borderLeftColor: priorityColor}]}>
            <TouchableOpacity style={styles.taskItem} onPress={toggleExpand} onLongPress={onLongPress} activeOpacity={0.7}>
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
                    {task.subtasks?.map((sub: Subtask) => (
                        <SubtaskItem key={sub.id} sub={sub} taskId={task.id} colors={colors} toggleSubtask={toggleSubtask} deleteSubtask={deleteSubtask} />
                    ))}
                    <View style={styles.addSubtaskRow}>
                        <TextInput 
                            style={[styles.subInput, {color: colors.text}]} 
                            placeholder="Ajouter une étape..." 
                            placeholderTextColor={colors.textSub} 
                            value={newSubtaskTitle} 
                            onChangeText={setNewSubtaskTitle} 
                            onSubmitEditing={handleAddSub} 
                        />
                        <TouchableOpacity onPress={handleAddSub} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <Plus size={20} color={colors.accent} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    )
}, (prev, next) => {
    return (
        prev.task === next.task && 
        prev.task.subtasks === next.task.subtasks && 
        prev.colors.bg === next.colors.bg
    );
});

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16, marginTop: 20 },
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: 0.37 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 4 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  
  scrollContent: { paddingHorizontal: 20 },
  
  completedGroup: { marginTop: 30 },
  groupHeader: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  
  taskCard: { borderRadius: 12, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 60 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 17, fontWeight: '600' },
  dateText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  taskTitleCompleted: { opacity: 0.5, textDecorationLine: 'line-through' },
  
  subtaskList: { padding: 16, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  taskDescPreview: { fontSize: 14, marginBottom: 12, fontStyle: 'italic' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  subCheck: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  subCheckInner: { width: 10, height: 10, borderRadius: 2 },
  subtaskText: { fontSize: 15, flex: 1 },
  subtaskTextDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  subInput: { flex: 1, fontSize: 15, marginRight: 10, height: 40 },
  
  leftAction: { backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'flex-end', flex: 1, paddingRight: 20, borderRadius: 12 },
  rightAction: { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-start', flex: 1, paddingLeft: 20, borderRadius: 12 },
  
  quickAddWrapper: { 
      position: 'absolute', 
      left: 0, 
      right: 0, 
      borderTopWidth: 1, 
      paddingTop: 10, 
      paddingBottom: 15, 
      paddingHorizontal: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
  },
  quickAddInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickPriorityBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  priorityDot: { width: 12, height: 12, borderRadius: 6 },
  quickInput: { flex: 1, height: 44, fontSize: 16 },

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
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  magicBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginTop: 8, gap: 8 },
  magicBtnText: { fontWeight: '700', fontSize: 14 }
});

export default Tasks;