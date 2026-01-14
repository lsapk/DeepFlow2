import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Task } from '../types';
import { Plus, Check, Trash2, Calendar, Flag } from 'lucide-react-native';

interface TasksProps {
  tasks: Task[];
  toggleTask: (id: string) => void;
  addTask: (title: string, priority: Task['priority']) => void;
  deleteTask: (id: string) => void;
}

const Tasks: React.FC<TasksProps> = ({ tasks, toggleTask, addTask, deleteTask }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');

  const handleAdd = () => {
    if (newTaskTitle.trim()) {
      addTask(newTaskTitle, newPriority);
      setNewTaskTitle('');
    }
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <Text style={styles.largeTitle}>Tasks</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        style={styles.keyboardAvoid}
      >
        <View style={styles.inputContainer}>
            <TextInput
            style={styles.textInput}
            placeholder="New Reminder"
            placeholderTextColor="#8E8E93"
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
                            newPriority === p ? styles[`pill${p}`] : styles.pillInactive
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
                    <Text style={[styles.addText, !newTaskTitle.trim() && { color: '#C7C7CC' }]}>Add</Text>
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listGroup}>
            {activeTasks.length === 0 && (
                <Text style={styles.emptyText}>No tasks due.</Text>
            )}
            {activeTasks.map((task, index) => (
                <View key={task.id}>
                    <TaskItem task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
                    {index < activeTasks.length - 1 && <View style={styles.separator} />}
                </View>
            ))}
        </View>

        {completedTasks.length > 0 && (
             <View style={styles.completedGroup}>
                <Text style={styles.groupHeader}>Completed</Text>
                <View style={styles.listGroup}>
                    {completedTasks.map((task, index) => (
                        <View key={task.id}>
                            <TaskItem task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
                            {index < completedTasks.length - 1 && <View style={styles.separator} />}
                        </View>
                    ))}
                </View>
            </View>
        )}
      </ScrollView>
    </View>
  );
};

interface TaskItemProps {
    task: Task;
    onToggle: () => void;
    onDelete: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete }) => {
    const priorityColors = {
        low: '#34C759',    // System Green
        medium: '#FF9500', // System Orange
        high: '#FF3B30'    // System Red
    };

    return (
        <View style={styles.taskItem}>
            <TouchableOpacity 
                onPress={onToggle}
                style={[
                    styles.checkbox,
                    task.completed && { backgroundColor: '#007AFF', borderColor: '#007AFF' }
                ]}
            >
                {task.completed && <Check size={14} color="white" strokeWidth={4} />}
            </TouchableOpacity>
            
            <View style={styles.taskContent}>
                <Text 
                    style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]} 
                >
                    {task.title}
                </Text>
                <View style={styles.metaRow}>
                    <Text style={[styles.priorityLabel, { color: priorityColors[task.priority] }]}>
                        {task.priority === 'high' ? '!!! ' : task.priority === 'medium' ? '!! ' : '! '}
                        {task.priority}
                    </Text>
                    {task.due_date && (
                         <Text style={styles.dateLabel}>
                            • {new Date(task.due_date).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </View>

            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Trash2 size={18} color="#C7C7CC" />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.37,
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
  priorityGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillInactive: {
    backgroundColor: '#F2F2F7',
  },
  pilllow: { backgroundColor: '#E0F8E5' },
  pillmedium: { backgroundColor: '#FFF5E0' },
  pillhigh: { backgroundColor: '#FFEBEA' },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityTextInactive: { color: '#8E8E93' },
  priorityTextActive: { color: '#000000' },
  addButton: {
    padding: 4,
  },
  addText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 48, // Aligned with text start
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    marginBottom: 2,
  },
  taskTitleCompleted: {
    color: '#8E8E93',
  },
  metaRow: {
    flexDirection: 'row',
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  deleteButton: {
    padding: 8,
  },
});

export default Tasks;