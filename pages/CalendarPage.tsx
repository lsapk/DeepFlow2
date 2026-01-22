import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, LayoutAnimation } from 'react-native';
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, Globe, Menu, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Task, Habit, CalendarEvent } from '../types';
import * as Google from 'expo-auth-session/providers/google';
import { generateCoaching } from '../services/ai';
import { playMenuClick } from '../services/sound';

interface CalendarPageProps {
    tasks: Task[];
    habits: Habit[];
    toggleTask: (id: string) => void;
    toggleHabit: (id: string) => void;
    openMenu?: () => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ tasks, habits, toggleTask, toggleHabit, openMenu }) => {
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock loading
        setTimeout(() => setLoading(false), 800);
    }, []);

    useEffect(() => {
        generateDailyEvents();
    }, [selectedDate, tasks, habits]);

    const changeMonth = (months: number) => {
        playMenuClick();
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + months);
        setCurrentMonth(newDate);
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const generateDailyEvents = () => {
        const events: CalendarEvent[] = [];
        const dayOfWeek = selectedDate.getDay();

        // Habits
        habits.forEach(habit => {
            const isForToday = !habit.days_of_week || habit.days_of_week.length === 0 || habit.days_of_week.includes(dayOfWeek);
            if (isForToday && !habit.is_archived) {
                const isToday = isSameDay(selectedDate, new Date());
                const isCompleted = isToday && habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), new Date());
                events.push({
                    id: habit.id,
                    title: habit.title,
                    is_all_day: true,
                    type: 'habit',
                    status: isCompleted ? 'completed' : 'pending',
                    meta: habit
                });
            }
        });

        // Tasks
        tasks.forEach(task => {
            if (task.due_date && isSameDay(new Date(task.due_date), selectedDate)) {
                events.push({
                    id: task.id,
                    title: task.title,
                    is_all_day: true, 
                    type: 'task',
                    status: task.completed ? 'completed' : 'pending',
                    meta: task
                });
            }
        });

        setDayEvents(events);
    };

    // --- GRID LOGIC ---
    const getDaysArray = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        const emptyDaysStart = firstDay.getDay(); 
        
        for(let i = 0; i < emptyDaysStart; i++) days.push(null);
        for(let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        
        return days;
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: 20 }]}>
                 <View style={{height: 50, marginBottom: 20, backgroundColor: '#333', borderRadius: 10, width: '100%', opacity: 0.3}} />
                 <View style={{height: 300, backgroundColor: '#333', borderRadius: 20, opacity: 0.3}} />
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={openMenu} style={styles.iconBtn}><Menu size={24} color="#FFF" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Calendrier</Text>
                <View style={{width: 40}} />
            </View>

            <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}><ChevronLeft size={24} color="#FFF" /></TouchableOpacity>
                <Text style={styles.monthTitle}>{currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}><ChevronRight size={24} color="#FFF" /></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.gridContainer}>
                    <View style={styles.weekRow}>
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d,i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}
                    </View>
                    <View style={styles.daysGrid}>
                        {getDaysArray().map((date, index) => {
                            if (!date) return <View key={index} style={styles.dayCell} />;
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            return (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]} 
                                    onPress={() => { playMenuClick(); setSelectedDate(date); }}
                                >
                                    <Text style={[styles.dayNum, isSelected && { color: '#000', fontWeight: '700' }, isToday && !isSelected && { color: '#007AFF' }]}>{date.getDate()}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={styles.eventsList}>
                    <Text style={styles.selectedDateTitle}>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                    {dayEvents.length === 0 ? (
                        <Text style={styles.emptyText}>Rien de prévu.</Text>
                    ) : (
                        dayEvents.map((event, index) => (
                            <TouchableOpacity key={index} style={styles.eventCard} activeOpacity={0.8} onPress={() => {
                                if (event.type === 'task') toggleTask(event.id);
                                if (event.type === 'habit') toggleHabit(event.id);
                            }}>
                                <View style={[styles.timeStrip, { backgroundColor: event.type === 'habit' ? '#FF9500' : '#C4B5FD' }]} />
                                <View style={styles.eventContent}>
                                    <View style={styles.eventHeader}>
                                        <Text style={[styles.eventTitle, event.status === 'completed' && styles.textDone]}>{event.title}</Text>
                                        {event.status === 'completed' ? <CheckCircle2 size={18} color="#4ADE80" /> : <Circle size={18} color="#444" />}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    navBtn: { padding: 8 },
    monthTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    scrollContent: { paddingBottom: 100 },
    gridContainer: { marginHorizontal: 20, backgroundColor: '#171717', borderRadius: 20, padding: 10, marginBottom: 20 },
    weekRow: { flexDirection: 'row', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 8 },
    weekDayText: { flex: 1, textAlign: 'center', color: '#888', fontSize: 12, fontWeight: '600' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderRadius: 12 },
    dayCellSelected: { backgroundColor: '#FFF' },
    dayCellToday: { borderWidth: 1, borderColor: '#007AFF' },
    dayNum: { color: '#FFF', fontSize: 15, fontWeight: '500' },
    eventsList: { paddingHorizontal: 20 },
    selectedDateTitle: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
    emptyText: { color: '#666', fontStyle: 'italic' },
    eventCard: { flexDirection: 'row', backgroundColor: '#171717', borderRadius: 12, overflow: 'hidden', marginBottom: 12, minHeight: 60, borderWidth: 1, borderColor: '#262626' },
    timeStrip: { width: 6, height: '100%' },
    eventContent: { flex: 1, padding: 12, justifyContent: 'center' },
    eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    eventTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
    textDone: { color: '#666', textDecorationLine: 'line-through' }
});

export default CalendarPage;