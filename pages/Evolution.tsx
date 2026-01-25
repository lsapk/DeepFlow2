import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Growth from './Growth';
import CyberKnight from './CyberKnight';
import { PlayerProfile, UserProfile, Task, Habit, Goal, Quest } from '../types';

interface EvolutionProps {
    player: PlayerProfile;
    user: UserProfile;
    tasks: Task[];
    habits: Habit[];
    goals: Goal[];
    quests: Quest[];
    openMenu: () => void;
    openProfile: () => void;
    onAddTask: (title: string, priority: string) => void;
    onAddHabit: (title: string) => void;
    onAddGoal: (title: string) => void;
    onStartFocus: (minutes: number) => void;
    isDarkMode?: boolean;
}

const Evolution: React.FC<EvolutionProps> = (props) => {
    const [view, setView] = useState<'GROWTH' | 'CYBER_KNIGHT'>('GROWTH');
    const { isDarkMode } = props;

    const colors = {
        bg: isDarkMode ? '#000000' : '#F2F2F7',
        text: isDarkMode ? '#FFFFFF' : '#000000',
        segmentBg: isDarkMode ? '#1C1C1E' : '#E5E5EA',
        segmentActive: isDarkMode ? '#636366' : '#FFFFFF',
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <View style={styles.segmentContainer}>
                <View style={[styles.segment, { backgroundColor: colors.segmentBg }]}>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'GROWTH' && { backgroundColor: colors.segmentActive }]} 
                        onPress={() => setView('GROWTH')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'GROWTH' ? '700' : '500' }]}>Analyses</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'CYBER_KNIGHT' && { backgroundColor: colors.segmentActive }]} 
                        onPress={() => setView('CYBER_KNIGHT')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'CYBER_KNIGHT' ? '700' : '500' }]}>Avatar</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{flex: 1}}>
                {view === 'GROWTH' ? (
                    <Growth 
                        player={props.player}
                        user={props.user}
                        tasks={props.tasks}
                        habits={props.habits}
                        goals={props.goals}
                        openMenu={() => {}}
                        openProfile={props.openProfile}
                        onAddTask={props.onAddTask}
                        onAddHabit={props.onAddHabit}
                        onAddGoal={props.onAddGoal}
                        onStartFocus={props.onStartFocus}
                        isDarkMode={props.isDarkMode}
                    />
                ) : (
                    <CyberKnight 
                        player={props.player}
                        user={props.user}
                        quests={props.quests}
                        openMenu={() => {}}
                        openProfile={props.openProfile}
                        isDarkMode={props.isDarkMode}
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
        paddingTop: 10,
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

export default Evolution;