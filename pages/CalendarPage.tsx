import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, Flame, Globe, LogOut, Menu, Sparkles, Calendar as CalendarIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Task, Habit, CalendarEvent } from '../types';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { generateCoaching } from '../services/ai';

WebBrowser.maybeCompleteAuthSession();

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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
    const [currentMonth, setCurrentMonth] = useState(new Date()); // For grid navigation
    const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
    
    // Google Calendar State
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const [loadingAi, setLoadingAi] = useState(false);

    // Configuration OAuth
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: '913448608067-b0lmrcus4s7aisr0atbjettkf0qtaltl.apps.googleusercontent.com',
        iosClientId: '913448608067-b0lmrcus4s7aisr0atbjettkf0qtaltl.apps.googleusercontent.com',
        webClientId: '913448608067-b0lmrcus4s7aisr0atbjettkf0qtaltl.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                setGoogleToken(authentication.accessToken);
                fetchGoogleEvents(authentication.accessToken);
            }
        }
    }, [response]);

    useEffect(() => {
        generateDailyEvents();
    }, [selectedDate, tasks, habits, googleEvents]);

    const changeMonth = (months: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + months);
        setCurrentMonth(newDate);
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const fetchGoogleEvents = async (token: string) => {
        setLoadingGoogle(true);
        try {
            const timeMin = new Date();
            timeMin.setDate(timeMin.getDate() - 30);
            const timeMax = new Date();
            timeMax.setDate(timeMax.getDate() + 30);

            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await response.json();
            
            if (data.items) {
                const events: CalendarEvent[] = data.items.map((item: any) => {
                    let start = item.start.dateTime;
                    let end = item.end.dateTime;
                    let isAllDay = false;

                    if (!start && item.start.date) {
                        start = item.start.date;
                        isAllDay = true;
                    }
                    if (!end && item.end.date) {
                        end = item.end.date;
                    }

                    return {
                        id: item.id,
                        title: item.summary || 'Sans titre',
                        start_time: isAllDay ? undefined : new Date(start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        end_time: isAllDay ? undefined : (end ? new Date(end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : undefined),
                        is_all_day: isAllDay,
                        type: 'google',
                        status: 'pending',
                        meta: {
                            rawStart: start,
                            rawEnd: end
                        }
                    };
                });
                setGoogleEvents(events);
            }
        } catch (error) {
            console.error("Erreur Google Calendar:", error);
            Alert.alert("Erreur", "Impossible de récupérer les événements Google.");
        } finally {
            setLoadingGoogle(false);
        }
    };

    const generateDailyEvents = () => {
        const events: CalendarEvent[] = [];
        const dayOfWeek = selectedDate.getDay();

        // 1. Google Events
        if (googleEvents.length > 0) {
            const daysGoogleEvents = googleEvents.filter(ev => {
                if (ev.meta?.rawStart) {
                    const evtDate = new Date(ev.meta.rawStart);
                    return isSameDay(evtDate, selectedDate);
                }
                return false;
            });
            events.push(...daysGoogleEvents);
        }

        // 2. Habits
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

        // 3. Tasks
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

    const planWithAi = async () => {
        setLoadingAi(true);
        const context = {
            events: dayEvents.map(e => e.title).join(', '),
            date: selectedDate.toDateString()
        };
        const suggestion = await generateCoaching("Optimise ma journée basée sur mes événements actuels. Donne moi un planning textuel court.", context);
        setLoadingAi(false);
        Alert.alert("Planning IA", suggestion);
    };

    // --- GRID LOGIC ---
    const getDaysArray = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        const emptyDaysStart = firstDay.getDay(); // 0 is Sunday
        
        for(let i = 0; i < emptyDaysStart; i++) {
            days.push(null);
        }
        
        for(let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };

    const hasEventOnDay = (date: Date) => {
        // Simple check just to show a dot
        const dStr = date.toDateString();
        // Check tasks
        if (tasks.some(t => t.due_date && new Date(t.due_date).toDateString() === dStr)) return true;
        // Check google
        if (googleEvents.some(g => g.meta?.rawStart && new Date(g.meta.rawStart).toDateString() === dStr)) return true;
        return false;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={openMenu} style={styles.iconBtn}>
                     <Menu size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Calendrier</Text>
                <TouchableOpacity 
                    onPress={() => !googleToken ? promptAsync() : setGoogleToken(null)}
                    disabled={!request}
                    style={styles.googleBtn}
                >
                    {loadingGoogle ? <ActivityIndicator size="small" color="#FFF" /> : (
                        <Globe size={20} color={googleToken ? "#4285F4" : "#FFF"} />
                    )}
                </TouchableOpacity>
            </View>

            {/* MONTH NAVIGATOR */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                    <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                    {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                    <ChevronRight size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* CALENDAR GRID */}
                <View style={styles.gridContainer}>
                    <View style={styles.weekRow}>
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d,i) => (
                            <Text key={i} style={styles.weekDayText}>{d}</Text>
                        ))}
                    </View>
                    <View style={styles.daysGrid}>
                        {getDaysArray().map((date, index) => {
                            if (!date) return <View key={index} style={styles.dayCell} />;
                            
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            const hasEvent = hasEventOnDay(date);

                            return (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[
                                        styles.dayCell, 
                                        isSelected && styles.dayCellSelected,
                                        isToday && !isSelected && styles.dayCellToday
                                    ]} 
                                    onPress={() => {
                                        setSelectedDate(date);
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    }}
                                >
                                    <Text style={[
                                        styles.dayNum, 
                                        isSelected && { color: '#000', fontWeight: '700' },
                                        isToday && !isSelected && { color: '#007AFF' }
                                    ]}>{date.getDate()}</Text>
                                    {hasEvent && <View style={[styles.eventDot, isSelected && { backgroundColor: '#000' }]} />}
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                {/* AI PLANNER */}
                <TouchableOpacity style={styles.aiPlannerBtn} onPress={planWithAi} disabled={loadingAi}>
                    {loadingAi ? <ActivityIndicator color="#000" /> : (
                        <>
                            <Sparkles size={18} color="#000" />
                            <Text style={styles.aiPlannerText}>Planifier ma journée avec l'IA</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* EVENTS LIST */}
                <View style={styles.eventsList}>
                    <Text style={styles.selectedDateTitle}>
                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    
                    {dayEvents.length === 0 ? (
                        <Text style={styles.emptyText}>Rien de prévu.</Text>
                    ) : (
                        dayEvents.map((event, index) => (
                            <TouchableOpacity 
                                key={`${event.type}-${event.id}-${index}`} 
                                style={styles.eventCard}
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (event.type === 'task') toggleTask(event.id);
                                    if (event.type === 'habit') toggleHabit(event.id);
                                }}
                            >
                                <View style={[
                                    styles.timeStrip, 
                                    { backgroundColor: event.type === 'google' ? '#4285F4' : (event.type === 'habit' ? '#FF9500' : '#C4B5FD') }
                                ]} />
                                
                                <View style={styles.eventContent}>
                                    <View style={styles.eventHeader}>
                                        <Text style={[styles.eventTitle, event.status === 'completed' && styles.textDone]}>{event.title}</Text>
                                        
                                        {event.type !== 'google' ? (
                                            event.status === 'completed' 
                                                ? <CheckCircle2 size={18} color={event.type === 'habit' ? '#FF9500' : '#C4B5FD'} />
                                                : <Circle size={18} color="#444" />
                                        ) : (
                                            <Globe size={14} color="#4285F4" />
                                        )}
                                    </View>
                                    
                                    <View style={styles.eventFooter}>
                                        {event.start_time ? (
                                            <Text style={styles.eventTime}>{event.start_time} - {event.end_time}</Text>
                                        ) : (
                                            <Text style={styles.eventTime}>Toute la journée</Text>
                                        )}
                                        <Text style={styles.eventType}>
                                            {event.type === 'google' ? 'Google' : (event.type === 'habit' ? 'Habitude' : 'Tâche')}
                                        </Text>
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
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginTop: 10,
    },
    iconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#1C1C1E',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: -1,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    navBtn: {
        padding: 8,
    },
    monthTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    // GRID
    gridContainer: {
        marginHorizontal: 20,
        backgroundColor: '#171717',
        borderRadius: 20,
        padding: 10,
        marginBottom: 20,
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 8,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%', // 100% / 7
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        borderRadius: 12,
    },
    dayCellSelected: {
        backgroundColor: '#FFF',
    },
    dayCellToday: {
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    dayNum: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500',
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#C4B5FD',
        marginTop: 4,
    },
    
    // AI
    aiPlannerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C4B5FD',
        marginHorizontal: 20,
        padding: 14,
        borderRadius: 16,
        gap: 8,
        marginBottom: 20,
    },
    aiPlannerText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 15,
    },

    // EVENTS
    eventsList: {
        paddingHorizontal: 20,
    },
    selectedDateTitle: {
        color: '#888',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
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
    eventType: {
        color: '#666',
        fontSize: 11,
    }
});

export default CalendarPage;