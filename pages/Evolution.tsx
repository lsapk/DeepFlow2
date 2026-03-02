import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Growth from './Growth';
import PenguinArena from './PenguinArena';
import { PlayerProfile, UserProfile, Task, Habit, Goal, Quest, FocusSession } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EvolutionProps {
    isAdmin?: boolean;
    player: PlayerProfile;
    user: UserProfile;
    tasks: Task[];
    habits: Habit[];
    goals: Goal[];
    quests: Quest[];
    focusSessions: FocusSession[];
    productivityScore?: number;
    openMenu: () => void;
    openProfile: () => void;
    onAddTask: (title: string, priority: string) => void;
    onAddHabit: (title: string) => void;
    onAddGoal: (title: string) => void;
    onStartFocus: (minutes: number) => void;
    isDarkMode?: boolean;
}

const Evolution: React.FC<EvolutionProps> = (props) => {
    const [view, setView] = useState<'GROWTH' | 'PENGUIN_ARENA'>('GROWTH');
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
            <View style={styles.segmentContainer}>
                <View style={[styles.segment, { backgroundColor: colors.segmentBg }]}>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'GROWTH' && { backgroundColor: colors.segmentActive }]} 
                        onPress={() => setView('GROWTH')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'GROWTH' ? '700' : '500' }]}>Analyses</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'PENGUIN_ARENA' && { backgroundColor: colors.segmentActive }]}
                        onPress={() => setView('PENGUIN_ARENA')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'PENGUIN_ARENA' ? '700' : '500' }]}>Pingouin</Text>
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
                        focusSessions={props.focusSessions}
                        productivityScore={props.productivityScore}
                        openMenu={props.openMenu}
                        openProfile={props.openProfile}
                        onAddTask={props.onAddTask}
                        onAddHabit={props.onAddHabit}
                        onAddGoal={props.onAddGoal}
                        onStartFocus={props.onStartFocus}
                        isDarkMode={props.isDarkMode}
                        noPadding={true}
                    />
                ) : (
                    <PenguinArena
                        user={props.user}
                        openMenu={props.openMenu}
                        openProfile={props.openProfile}
                        isDarkMode={props.isDarkMode}
                        noPadding={true}
                        isAdmin={props.isAdmin}
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

export default Evolution;
