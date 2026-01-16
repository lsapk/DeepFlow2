import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, LayoutAnimation, UIManager, Modal, Alert } from 'react-native';
import { Task, Subtask } from '../types';
import { Plus, Check, Trash2, ChevronDown, ChevronUp, X, ArrowUp, ArrowDown } from 'lucide-react-native';
import { supabase } from '../services/supabase';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface TasksProps {
  tasks: Task[];
  toggleTask: (id: string) => void;
  addTask: (title: string, priority: Task['priority']) => void;
  deleteTask: (id: string) => void;
  userId: string;
  refreshTasks: () => void;
}

const Tasks: React.FC<TasksProps> = ({ tasks, toggleTask, addTask, deleteTask, userId, refreshTasks }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleAdd = () => {
    if (newTaskTitle.trim()) {
      addTask(newTaskTitle, newPriority);
      setNewTaskTitle('');
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
      setEditTitle(task.title);
      setEditModalVisible(true);
  };

  const handleUpdateTask = async () => {
      if (!selectedTask) return;
      await supabase.from('tasks').update({ title: editTitle }).eq('id', selectedTask.id);
      refreshTasks();
      setEditModalVisible(false);
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <Text style={styles.largeTitle}>Tâches</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        style={styles.keyboardAvoid}
      >
        <View style={styles.inputContainer}>
            <TextInput
            style={styles.textInput}
            placeholder="Nouvelle tâche..."
            placeholderTextColor="#666"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            />
            <View style={styles.inputRow}>
                <View style={styles.priorityGroup}>
                    {(['low', 'medium', 'high'] as const).map(p => (
                    <TouchableOpacity
                        key={p}
                        onPress={() => setNewPriority(p)}
                        style={[
                            styles.priorityPill,
                            newPriority === p ? styles.pillActive : styles.pillInactive
                        ]}
                    >
                        <Text style={[
                            styles.priorityText,
                            newPriority === p ? styles.priorityTextActive : styles.priorityTextInactive
                        ]}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                    </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity 
                    onPress={handleAdd}
                    disabled={!newTaskTitle.trim()}
                    style={styles.addButton}
                >
                    <Plus size={24} color={!newTaskTitle.trim() ? '#666' : '#FFF'} />
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>

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

      {/* EDIT MODAL */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Modifier</Text>
                      <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                          <X size={24} color="#FFF" />
                      </TouchableOpacity>
                  </View>

                  <TextInput 
                      style={styles.modalInput} 
                      value={editTitle} 
                      onChangeText={setEditTitle} 
                      color="#FFF"
                  />

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

                  <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateTask}>
                      <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </TouchableOpacity>
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
                </View>
            </TouchableOpacity>
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
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  keyboardAvoid: {
    zIndex: 10,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  textInput: {
    fontSize: 17,
    color: '#FFF',
    marginBottom: 16,
    paddingVertical: 0,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pillInactive: {
    backgroundColor: '#333',
  },
  pillActive: {
      backgroundColor: '#FFF',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityTextInactive: { color: '#888' },
  priorityTextActive: { color: '#000' },
  addButton: {
    padding: 4,
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
  deleteActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: 'rgba(255,59,48,0.1)',
      borderRadius: 8,
      marginBottom: 20,
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
  },
  saveBtnText: {
      color: 'black',
      fontWeight: '600',
      fontSize: 16,
  }
});

export default Tasks;