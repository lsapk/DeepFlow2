import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Tasks from './Tasks';
import Habits from './Habits';
import Goals from './Goals';
import { Task, Habit, Goal } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PlanningProps {
    tasks: Task[];
    habits: Habit[];
    goals: Goal[];
    toggleTask: (id: string) => void;
    addTask: (title: string, priority: any, goalId?: string, dueDate?: string, description?: string) => void;
    deleteTask: (id: string) => void;
    createSubtask: (taskId: string, title: string) => void;
    toggleSubtask: (subId: string, taskId: string) => void;
    deleteSubtask: (subId: string, taskId: string) => void;
    toggleHabit: (id: string) => void;
    createHabit: (habitData: any) => void;
    archiveHabit: (habit: Habit) => void;
    deleteHabit: (id: string) => void;
    toggleGoal: (id: string) => void;
    addGoal: (title: string) => void;
    deleteGoal: (id: string) => void;
    createSubObjective: (goalId: string, title: string) => void;
    toggleSubObjective: (subId: string, goalId: string) => void;
    deleteSubObjective: (subId: string, goalId: string) => void;
    userId: string;
    refreshGoals: () => void;
    refreshTasks: () => void;
    refreshHabits: () => void;
    openMenu: () => void;
    isDarkMode?: boolean;
}

const Planning: React.FC<PlanningProps> = (props) => {
    const [view, setView] = useState<'TASKS' | 'HABITS' | 'GOALS'>('TASKS');
    const { isDarkMode } = props;
    const insets = useSafeAreaInsets();

    const colors = {
        bg: isDarkMode ? '#000000' : '#F2F2F7',
        text: isDarkMode ? '#FFFFFF' : '#000000',
        segmentBg: isDarkMode ? '#1C1C1E' : '#E5E5EA',
        segmentActive: isDarkMode ? '#636366' : '#FFFFFF',
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 10 }]}>
            {/* Top Navigation Segment */}
            <View style={styles.segmentContainer}>
                <View style={[styles.segment, { backgroundColor: colors.segmentBg }]}>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'TASKS' && { backgroundColor: colors.segmentActive }]}
                        onPress={() => setView('TASKS')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'TASKS' ? '700' : '500' }]}>Tâches</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, view === 'HABITS' && { backgroundColor: colors.segmentActive }]}
                        onPress={() => setView('HABITS')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'HABITS' ? '700' : '500' }]}>Habitudes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'GOALS' && { backgroundColor: colors.segmentActive }]} 
                        onPress={() => setView('GOALS')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'GOALS' ? '700' : '500' }]}>Objectifs</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{flex: 1}}>
                {view === 'TASKS' ? (
                    <Tasks
                        tasks={props.tasks} 
                        goals={props.goals}
                        toggleTask={props.toggleTask} 
                        addTask={props.addTask}
                        deleteTask={props.deleteTask}
                        createSubtask={props.createSubtask}
                        toggleSubtask={props.toggleSubtask}
                        deleteSubtask={props.deleteSubtask}
                        userId={props.userId}
                        refreshTasks={props.refreshTasks}
                        openMenu={() => {}}
                        isDarkMode={props.isDarkMode}
                        noPadding={true}
                    />
                ) : view === 'HABITS' ? (
                    <Habits
                        habits={props.habits}
                        goals={props.goals}
                        incrementHabit={props.toggleHabit}
                        userId={props.userId}
                        createHabit={props.createHabit}
                        archiveHabit={props.archiveHabit}
                        deleteHabit={props.deleteHabit}
                        refreshHabits={props.refreshHabits}
                        openMenu={() => {}}
                        isDarkMode={props.isDarkMode}
                        noPadding={true}
                    />
                ) : (
                    <Goals 
                        goals={props.goals} 
                        toggleGoal={props.toggleGoal} 
                        addGoal={props.addGoal} 
                        deleteGoal={props.deleteGoal} 
                        createSubObjective={props.createSubObjective}
                        toggleSubObjective={props.toggleSubObjective}
                        deleteSubObjective={props.deleteSubObjective}
                        userId={props.userId}
                        refreshGoals={props.refreshGoals}
                        openMenu={() => {}}
                        isDarkMode={props.isDarkMode}
                        noPadding={true}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    segmentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    segment: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    segmentText: {
        fontSize: 13,
    }
});

export default Planning;