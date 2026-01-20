import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, Plus, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, Circle, Flame } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Task, Habit, CalendarEvent } from '../types';

interface CalendarPageProps {
    tasks: Task[];
    habits: Habit[];
    toggleTask: (id: string) => void;
    toggleHabit: (id: string) => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ tasks, habits, toggleTask, toggleHabit }) => {
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        generateDailyEvents();
    }, [selectedDate, tasks, habits]);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const generateDailyEvents = () => {
        const events: CalendarEvent[] = [];
        const dayOfWeek = selectedDate.getDay(); // 0-6

        // 1. Habits for this day
        habits.forEach(habit => {
            // Check if habit is for today (if days_of_week is null/empty, assume daily)
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

        // 2. Tasks for this day
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

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calendrier</Text>
                <TouchableOpacity style={styles.iconBtn}>
                    <Plus size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Date Navigator */}
            <View style={styles.dateNav}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
                    <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.dateText}>
                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <Text style={styles.yearText}>{selectedDate.getFullYear()}</Text>
                </View>
                <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
                    <ChevronRight size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {dayEvents.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Rien de prévu pour ce jour.</Text>
                    </View>
                ) : (
                    dayEvents.map((event, index) => (
                        <TouchableOpacity 
                            key={`${event.type}-${event.id}-${index}`} 
                            style={styles.eventCard}
                            activeOpacity={0.7}
                            onPress={() => {
                                if (event.type === 'task') toggleTask(event.id);
                                if (event.type === 'habit') toggleHabit(event.id);
                            }}
                        >
                            <View style={[
                                styles.timeStrip, 
                                { backgroundColor: (event.type === 'habit' ? '#FF9500' : '#C4B5FD') }
                            ]} />
                            
                            <View style={styles.eventContent}>
                                <View style={styles.eventHeader}>
                                    <Text style={[styles.eventTitle, event.status === 'completed' && styles.textDone]}>{event.title}</Text>
                                    {event.status === 'completed' 
                                        ? <CheckCircle2 size={18} color={event.type === 'habit' ? '#FF9500' : '#C4B5FD'} />
                                        : <Circle size={18} color="#444" />
                                    }
                                </View>
                                
                                <View style={styles.eventFooter}>
                                    {event.start_time ? (
                                        <Text style={styles.eventTime}>{event.start_time} - {event.end_time}</Text>
                                    ) : (
                                        <Text style={styles.eventTime}>Toute la journée</Text>
                                    )}
                                    
                                    <View style={styles.tagBadge}>
                                        {event.type === 'habit' && <Flame size={10} color="#FFF" style={{marginRight:4}} />}
                                        <Text style={styles.tagText}>
                                            {event.type === 'habit' ? 'Habitude' : 'Tâche'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                
                {/* Timeline visual filler */}
                <View style={styles.timelineContainer}>
                    {[8,9,10,11,12,13,14,15,16,17,18,19,20].map(hour => (
                        <View key={hour} style={styles.hourRow}>
                            <Text style={styles.hourText}>{hour}:00</Text>
                            <View style={styles.hourLine} />
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
    },
    iconBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#171717',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
        backgroundColor: '#111',
        marginHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
    },
    navBtn: {
        padding: 8,
    },
    dateText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    yearText: {
        color: '#666',
        fontSize: 12,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontStyle: 'italic',
    },
    eventCard: {
        flexDirection: 'row',
        backgroundColor: '#171717',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        minHeight: 70,
        borderWidth: 1,
        borderColor: '#262626',
    },
    timeStrip: {
        width: 6,
        height: '100%',
    },
    eventContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    eventTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    textDone: {
        color: '#666',
        textDecorationLine: 'line-through',
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventTime: {
        color: '#888',
        fontSize: 13,
    },
    tagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tagText: {
        color: '#CCC',
        fontSize: 10,
        fontWeight: '600',
    },
    timelineContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    hourRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
    },
    hourText: {
        color: '#444',
        width: 40,
        fontSize: 12,
    },
    hourLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#222',
    }
});

export default CalendarPage;