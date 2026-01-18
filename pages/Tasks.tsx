import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, LayoutAnimation, UIManager, Modal, Alert } from 'react-native';
import { Task, Subtask, Goal } from '../types';
import { Plus, Check, Trash2, ChevronDown, ChevronUp, X, Calendar, AlignLeft, Save, Target } from 'lucide-react-native';
import { supabase } from '../services/supabase';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface TasksProps {
  tasks: Task[];
  goals: Goal[];
  toggleTask: (id: string) => void;
  addTask: (title: string, priority: Task['priority'], goalId?: string) => void;
  deleteTask: (id: string) => void;
  userId: string;
  refreshTasks: () => void;
}

const Tasks: React.FC<TasksProps> = ({ tasks, goals, toggleTask, addTask, deleteTask, userId, refreshTasks }) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Task['priority']>('medium');
  const [formGoalId, setFormGoalId] = useState<string | null>(null);

  const openCreateModal = () => {
      setFormTitle('');
      setFormDesc('');
      setFormPriority('medium');
      setFormGoalId(null);
      setCreateModalVisible(true);
  };

  const handleAdd = () => {
    if (formTitle.trim()) {
      addTask(formTitle, formPriority, formGoalId || undefined);
      setCreateModalVisible(false);
    }
  };

  const toggleExpand = (taskId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSet = new Set(expandedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setExpandedTaskIds(newSet);
  };

  const openEditModal = (task: Task) => {
      setSelectedTask(task);
      setFormTitle(task.title);
      setFormDesc(task.description || '');
      setFormPriority(task.priority);
      setFormGoalId(task.linked_goal_id || null);
      setEditModalVisible(true);
  };

  const handleUpdateTask = async () => {
      if (!selectedTask) return;
      await supabase.from('tasks').update({ 
          title: formTitle,
          description: formDesc,
          linked_goal_id: formGoalId,
          priority: formPriority
      }).eq('id', selectedTask.id);
      
      refreshTasks();
      setEditModalVisible(false);
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <Text style={styles.largeTitle}>Tâches</Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                <Plus size={24} color="#000" />
          </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listGroup}>
            {activeTasks.length === 0 && (
                <Text style={styles.emptyText}>Rien à faire.</Text>
            )}
            {activeTasks.map((task, index) => (
                <View key={task.id}>
                    <TaskItem 
                        task={task} 
                        isExpanded={expandedTaskIds.has(task.id)}
                        onToggle={() => toggleTask(task.id)} 
                        onToggleExpand={() => toggleExpand(task.id)}
                        onLongPress={() => openEditModal(task)}
                        userId={userId}
                        refreshTasks={refreshTasks}
                    />
                    {index < activeTasks.length - 1 && <View style={styles.separator} />}
                </View>
            ))}
        </View>

        {completedTasks.length > 0 && (
             <View style={styles.completedGroup}>
                <Text style={styles.groupHeader}>Terminées</Text>
                <View style={styles.listGroup}>
                    {completedTasks.map((task, index) => (
                        <View key={task.id}>
                             <TaskItem 
                                task={task} 
                                isExpanded={expandedTaskIds.has(task.id)}
                                onToggle={() => toggleTask(task.id)} 
                                onToggleExpand={() => toggleExpand(task.id)}
                                onLongPress={() => openEditModal(task)}
                                userId={userId}
                                refreshTasks={refreshTasks}
                            />
                            {index < completedTasks.length - 1 && <View style={styles.separator} />}
                        </View>
                    ))}
                </View>
            </View>
        )}
      </ScrollView>

      {/* CREATE / EDIT MODAL (Reused structure) */}
      <Modal
        visible={createModalVisible || editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
            setCreateModalVisible(false);
            setEditModalVisible(false);
        }}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{createModalVisible ? 'Nouvelle Tâche' : 'Modifier'}</Text>
                      <TouchableOpacity onPress={() => { setCreateModalVisible(false); setEditModalVisible(false); }}>
                          <X size={24} color="#FFF" />
                      </TouchableOpacity>
                  </View>

                  <ScrollView>
                    <Text style={styles.label}>Titre</Text>
                    <TextInput 
                        style={styles.modalInput} 
                        value={formTitle} 
                        onChangeText={setFormTitle} 
                        color="#FFF"
                    />

                    <Text style={styles.label}>Priorité</Text>
                    <View style={styles.priorityRow}>
                         {(['low', 'medium', 'high'] as const).map(p => (
                             <TouchableOpacity 
                                key={p}
                                style={[styles.priorityPill, formPriority === p && styles.priorityPillActive]}
                                onPress={() => setFormPriority(p)}
                             >
                                 <Text style={{color: formPriority === p ? '#000' : '#888', fontWeight: '600', textTransform: 'capitalize'}}>{p}</Text>
                             </TouchableOpacity>
                         ))}
                    </View>

                    <Text style={styles.label}>Description</Text>
                    <View style={styles.inputWithIcon}>
                         <AlignLeft size={18} color="#666" style={{marginRight: 10}} />
                         <TextInput 
                            style={[styles.modalInput, {flex: 1, height: 'auto', minHeight: 40, marginBottom: 0}]} 
                            value={formDesc} 
                            onChangeText={setFormDesc} 
                            placeholder="Détails de la tâche..."
                            placeholderTextColor="#666"
                            multiline
                            color="#FFF"
                        />
                    </View>

                    <Text style={styles.label}>Lier à un objectif</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalsContainer}>
                        <TouchableOpacity 
                                style={[styles.goalChip, !formGoalId && styles.goalChipActive]}
                                onPress={() => setFormGoalId(null)}
                           >
                               <Text style={[styles.goalChipText, !formGoalId && styles.goalChipTextActive]}>Aucun</Text>
                           </TouchableOpacity>
                           {goals.map(g => (
                               <TouchableOpacity 
                                    key={g.id} 
                                    style={[styles.goalChip, formGoalId === g.id && styles.goalChipActive]}
                                    onPress={() => setFormGoalId(g.id)}
                               >
                                   <Target size={14} color={formGoalId === g.id ? "#000" : "#666"} />
                                   <Text style={[styles.goalChipText, formGoalId === g.id && styles.goalChipTextActive]}>{g.title}</Text>
                               </TouchableOpacity>
                           ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.saveBtn} onPress={createModalVisible ? handleAdd : handleUpdateTask}>
                        <Save size={20} color="black" />
                        <Text style={styles.saveBtnText}>Enregistrer</Text>
                    </TouchableOpacity>

                    {editModalVisible && (
                        <TouchableOpacity 
                            style={styles.deleteActionBtn} 
                            onPress={() => {
                                if (selectedTask) {
                                    Alert.alert("Supprimer", "Êtes-vous sûr ?", [
                                        { text: "Annuler", style: "cancel"},
                                        { text: "Supprimer", style: 'destructive', onPress: () => {
                                            deleteTask(selectedTask.id);
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
                  </ScrollView>
              </View>
          </View>
      </Modal>

    </View>
  );
};

interface TaskItemProps {
    task: Task;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleExpand: () => void;
    onLongPress: () => void;
    userId: string;
    refreshTasks: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isExpanded, onToggle, onToggleExpand, onLongPress, userId, refreshTasks }) => {
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const addSubtask = async () => {
        if (!newSubtaskTitle.trim()) return;
        
        await supabase.from('subtasks').insert({
            parent_task_id: task.id,
            user_id: userId,
            title: newSubtaskTitle,
            completed: false,
            sort_order: task.subtasks ? task.subtasks.length : 0
        });
        setNewSubtaskTitle('');
        refreshTasks();
    };

    const toggleSubtask = async (sub: Subtask) => {
        await supabase.from('subtasks').update({ completed: !sub.completed }).eq('id', sub.id);
        refreshTasks();
    };

    const deleteSubtask = async (id: string) => {
        await supabase.from('subtasks').delete().eq('id', id);
        refreshTasks();
    };

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
                        task.completed && { backgroundColor: '#FFF', borderColor: '#FFF' }
                    ]}
                >
                    {task.completed && <Check size={14} color="black" strokeWidth={4} />}
                </TouchableOpacity>
                
                <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                        {task.title}
                    </Text>
                    {task.linked_goal_id && <View style={styles.linkedDot} />}
                    {task.subtasks && task.subtasks.length > 0 && (
                        <Text style={styles.subtaskCount}>
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                        </Text>
                    )}
                </View>

                {/* Petit bouton flèche */}
                <TouchableOpacity onPress={onToggleExpand} style={styles.expandBtn}>
                     {isExpanded ? <ChevronUp size={16} color="#666" /> : <ChevronDown size={16} color="#666" />}
                </TouchableOpacity>
            </TouchableOpacity>

            {/* Subtasks Section */}
            {isExpanded && (
                <View style={styles.subtaskList}>
                    {task.description && (
                        <Text style={styles.taskDescPreview}>{task.description}</Text>
                    )}
                    
                    {task.subtasks?.map(sub => (
                        <View key={sub.id} style={styles.subtaskRow}>
                            <TouchableOpacity onPress={() => toggleSubtask(sub)} style={styles.subCheck}>
                                {sub.completed && <View style={styles.subCheckInner} />}
                            </TouchableOpacity>
                            <Text style={[styles.subtaskText, sub.completed && styles.subtaskTextDone]}>
                                {sub.title}
                            </Text>
                            <TouchableOpacity onPress={() => deleteSubtask(sub.id)}>
                                <X size={14} color="#666" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <View style={styles.addSubtaskRow}>
                        <TextInput 
                            style={styles.subInput} 
                            placeholder="Ajouter sous-tâche..." 
                            placeholderTextColor="#666"
                            value={newSubtaskTitle}
                            onChangeText={setNewSubtaskTitle}
                            onSubmitEditing={addSubtask}
                        />
                        <TouchableOpacity onPress={addSubtask}>
                            <Plus size={18} color="#007AFF" />
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    zIndex: 10,
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
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#444',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  taskTitleCompleted: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  linkedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FF9500',
      marginTop: 4,
  },
  subtaskCount: {
      fontSize: 11,
      color: '#666',
      marginTop: 2,
  },
  expandBtn: {
      padding: 8,
  },
  
  // Subtasks
  subtaskList: {
      backgroundColor: '#121212',
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: '#262626',
  },
  taskDescPreview: {
      fontSize: 13,
      color: '#888',
      marginBottom: 10,
      fontStyle: 'italic',
  },
  subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: '#222',
  },
  subCheck: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#555',
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
  },
  subCheckInner: {
      width: 10,
      height: 10,
      backgroundColor: '#007AFF',
      borderRadius: 2,
  },
  subtaskText: {
      color: '#DDD',
      fontSize: 14,
      flex: 1,
  },
  subtaskTextDone: {
      color: '#555',
      textDecorationLine: 'line-through',
  },
  addSubtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
  },
  subInput: {
      flex: 1,
      color: '#FFF',
      fontSize: 14,
      marginRight: 10,
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
  label: {
      fontSize: 12,
      color: '#888',
      marginBottom: 6,
      marginTop: 12,
      textTransform: 'uppercase',
  },
  modalInput: {
      backgroundColor: '#000',
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
      color: '#FFF',
      borderWidth: 1,
      borderColor: '#333',
      marginBottom: 16,
  },
  inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
      paddingHorizontal: 12,
  },
  priorityRow: {
      flexDirection: 'row',
      gap: 12,
  },
  priorityPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#333',
  },
  priorityPillActive: {
      backgroundColor: '#FFF',
  },
  goalsContainer: {
      flexDirection: 'row',
  },
  goalChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#333',
      marginRight: 8,
  },
  goalChipActive: {
      backgroundColor: '#FFF',
  },
  goalChipText: {
      color: '#BBB',
      fontSize: 13,
  },
  goalChipTextActive: {
      color: '#000',
      fontWeight: '600',
  },
  deleteActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: 'rgba(255,59,48,0.1)',
      borderRadius: 8,
      marginTop: 20,
      marginBottom: 10,
      gap: 8,
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
      marginTop: 20,
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

export default Tasks;