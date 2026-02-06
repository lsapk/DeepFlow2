import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import CalendarPage from './CalendarPage';
import Goals from './Goals';
import { Task, Habit, Goal } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PlanningProps {
    tasks: Task[];
    habits: Habit[];
    goals: Goal[];
    toggleTask: (id: string) => void;
    toggleHabit: (id: string) => void;
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
}

const Planning: React.FC<PlanningProps> = (props) => {
    const [view, setView] = useState<'CALENDAR' | 'GOALS'>('CALENDAR');
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
                        style={[styles.segmentBtn, view === 'CALENDAR' && { backgroundColor: colors.segmentActive }]} 
                        onPress={() => setView('CALENDAR')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'CALENDAR' ? '700' : '500' }]}>Calendrier</Text>
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
                {view === 'CALENDAR' ? (
                    <CalendarPage 
                        tasks={props.tasks} 
                        habits={props.habits} 
                        toggleTask={props.toggleTask} 
                        toggleHabit={props.toggleHabit} 
                        openMenu={() => {}} 
                        isDarkMode={props.isDarkMode}
                        noPadding={true} // New prop to prevent double padding
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
                        noPadding={true} // New prop
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