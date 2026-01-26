import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, Calendar as CalendarIcon, MapPin, Clock, AlignLeft, LogIn } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Task, Habit, CalendarEvent } from '../types';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { playMenuClick } from '../services/sound';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';

WebBrowser.maybeCompleteAuthSession();

// --- GOOGLE CONFIG ---
// NOTE: Remplacez ces IDs par vos propres identifiants Google Cloud Console
const GOOGLE_CONFIG = {
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
};

interface CalendarPageProps {
    tasks: Task[];
    habits: Habit[];
    toggleTask: (id: string) => void;
    toggleHabit: (id: string) => void;
    openMenu?: () => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ tasks, habits, toggleTask, toggleHabit, openMenu }) => {
    const insets = useSafeAreaInsets();
    
    // View State
    const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonthCursor, setCurrentMonthCursor] = useState(new Date()); // Pour la navigation mois
    const [weekCursor, setWeekCursor] = useState(new Date()); // Pour la navigation semaine
    
    // Data State
    const [mergedEvents, setMergedEvents] = useState<CalendarEvent[]>([]);
    const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

    // Google Auth Request
    const [request, response, promptAsync] = Google.useAuthRequest({
        iosClientId: GOOGLE_CONFIG.iosClientId,
        androidClientId: GOOGLE_CONFIG.androidClientId,
        webClientId: GOOGLE_CONFIG.webClientId,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                setGoogleToken(authentication.accessToken);
                fetchGoogleCalendarEvents(authentication.accessToken);
            }
        }
    }, [response]);

    // Data Merging Effect
    useEffect(() => {
        mergeAllEvents();
    }, [selectedDate, tasks, habits, googleEvents]);

    // Helper: Fetch Google Events
    const fetchGoogleCalendarEvents = async (token: string) => {
        setIsLoadingGoogle(true);
        try {
            // Get start/end of current view (roughly +/- 1 month to be safe)
            const startDate = new Date(currentMonthCursor.getFullYear(), currentMonthCursor.getMonth() - 1, 1).toISOString();
            const endDate = new Date(currentMonthCursor.getFullYear(), currentMonthCursor.getMonth() + 2, 0).toISOString();

            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate}&timeMax=${endDate}&singleEvents=true&orderBy=startTime`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.items) {
                const formatted: CalendarEvent[] = data.items.map((item: any) => ({
                    id: item.id,
                    title: item.summary || 'Sans titre',
                    description: item.description,
                    location: item.location,
                    start_time: item.start.dateTime || item.start.date, // Google envoie 'date' pour all-day
                    end_time: item.end.dateTime || item.end.date,
                    is_all_day: !!item.start.date,
                    type: 'google',
                    status: 'pending',
                    color: '#EA4335', // Google Red default
                    meta: item
                }));
                setGoogleEvents(formatted);
            }
        } catch (error) {
            console.error("Google Calendar Error", error);
            Alert.alert("Erreur", "Impossible de récupérer les événements Google.");
        } finally {
            setIsLoadingGoogle(false);
        }
    };

    const handleGoogleConnect = () => {
        if (googleToken) {
            fetchGoogleCalendarEvents(googleToken);
        } else {
            promptAsync();
        }
    };

    // Helper: Merge Logic
    const mergeAllEvents = () => {
        const events: CalendarEvent[] = [];
        const dayOfWeek = selectedDate.getDay();

        // 1. Google Events (Filtered by selected day)
        googleEvents.forEach(ev => {
            const evDate = new Date(ev.start_time!);
            if (isSameDay(evDate, selectedDate)) {
                events.push(ev);
            }
        });

        // 2. Tasks
        tasks.forEach(task => {
            if (task.due_date && isSameDay(new Date(task.due_date), selectedDate)) {
                events.push({
                    id: task.id,
                    title: task.title,
                    is_all_day: true, 
                    type: 'task',
                    status: task.completed ? 'completed' : 'pending',
                    color: '#007AFF', // Blue
                    meta: task
                });
            }
        });

        // 3. Habits
        habits.forEach(habit => {
            const isForToday = !habit.days_of_week || habit.days_of_week.length === 0 || habit.days_of_week.includes(dayOfWeek);
            if (isForToday && !habit.is_archived) {
                const isToday = isSameDay(selectedDate, new Date());
                const isCompleted = habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), new Date());
                // Pour les jours passés, on vérifie si c'était complété ce jour là (approximatif ici car on stocke que last_completed_at dans ce schéma simple)
                // Dans une app complète, on checkerait la table 'habit_completions'
                
                events.push({
                    id: habit.id,
                    title: habit.title,
                    is_all_day: true,
                    type: 'habit',
                    status: isCompleted && isToday ? 'completed' : 'pending',
                    color: '#FF9500', // Orange
                    meta: habit
                });
            }
        });

        // Sort: Time-based first, then Tasks/Habits
        events.sort((a, b) => {
            if (a.is_all_day && !b.is_all_day) return 1;
            if (!a.is_all_day && b.is_all_day) return -1;
            if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
            return 0;
        });

        setMergedEvents(events);
    };

    // --- NAVIGATION HELPERS ---
    const changePeriod = (delta: number) => {
        playMenuClick();
        if (viewMode === 'MONTH') {
            const newDate = new Date(currentMonthCursor);
            newDate.setMonth(newDate.getMonth() + delta);
            setCurrentMonthCursor(newDate);
        } else {
            const newDate = new Date(weekCursor);
            newDate.setDate(newDate.getDate() + (delta * 7));
            setWeekCursor(newDate);
        }
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const hasEventsOnDay = (date: Date) => {
        // Check Google
        const hasGoogle = googleEvents.some(ev => isSameDay(new Date(ev.start_time!), date));
        if (hasGoogle) return { has: true, color: '#EA4335' };

        // Check Task
        const hasTask = tasks.some(t => t.due_date && isSameDay(new Date(t.due_date), date));
        if (hasTask) return { has: true, color: '#007AFF' };

        // Check Habit (Simplified: show dot if scheduled)
        const dayOfWeek = date.getDay();
        const hasHabit = habits.some(h => !h.is_archived && (!h.days_of_week || h.days_of_week.includes(dayOfWeek)));
        if (hasHabit) return { has: true, color: '#FF9500' };

        return { has: false, color: 'transparent' };
    };

    // --- RENDERERS ---

    const renderMonthGrid = () => {
        const year = currentMonthCursor.getFullYear();
        const month = currentMonthCursor.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        const emptyDaysStart = firstDay.getDay(); 
        
        for(let i = 0; i < emptyDaysStart; i++) days.push(null);
        for(let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        
        return (
            <View style={styles.gridContainer}>
                {days.map((date, index) => {
                    if (!date) return <View key={index} style={styles.dayCell} />;
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    const eventInfo = hasEventsOnDay(date);

                    return (
                        <TouchableOpacity 
                            key={index} 
                            style={[styles.dayCell, isSelected && styles.dayCellSelected]} 
                            onPress={() => { playMenuClick(); setSelectedDate(date); }}
                        >
                            <Text style={[styles.dayNum, isSelected && { color: '#000', fontWeight: '700' }, isToday && !isSelected && { color: '#007AFF' }]}>
                                {date.getDate()}
                            </Text>
                            {eventInfo.has && !isSelected && (
                                <View style={[styles.dot, { backgroundColor: eventInfo.color }]} />
                            )}
                        </TouchableOpacity>
                    )
                })}
            </View>
        );
    };

    const renderWeekStrip = () => {
        const startOfWeek = new Date(weekCursor);
        startOfWeek.setDate(weekCursor.getDate() - weekCursor.getDay()); // Sunday start
        
        const weekDays = [];
        for(let i=0; i<7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            weekDays.push(d);
        }

        return (
            <View style={styles.weekStripContainer}>
                {weekDays.map((date, index) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    const eventInfo = hasEventsOnDay(date);

                    return (
                        <TouchableOpacity 
                            key={index} 
                            style={[styles.weekDayItem, isSelected && styles.weekDaySelected]}
                            onPress={() => { playMenuClick(); setSelectedDate(date); }}
                        >
                            <Text style={[styles.weekDayName, isSelected && {color: '#FFF'}]}>
                                {['D','L','M','M','J','V','S'][date.getDay()]}
                            </Text>
                            <Text style={[styles.weekDayNum, isSelected && {color: '#FFF'}, isToday && !isSelected && {color: '#007AFF'}]}>
                                {date.getDate()}
                            </Text>
                            {eventInfo.has && !isSelected && (
                                <View style={[styles.dot, { marginTop: 4, backgroundColor: eventInfo.color }]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* TOP BAR */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>
                        {viewMode === 'MONTH' 
                            ? currentMonthCursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
                            : selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
                        }
                    </Text>
                </View>
                
                <View style={styles.headerControls}>
                    {!googleToken && (
                        <TouchableOpacity onPress={handleGoogleConnect} style={styles.googleBtn} disabled={isLoadingGoogle}>
                            {isLoadingGoogle ? <ActivityIndicator size="small" color="#EA4335" /> : <CalendarIcon size={20} color="#EA4335" />}
                        </TouchableOpacity>
                    )}
                    <View style={styles.viewToggle}>
                        <TouchableOpacity onPress={() => setViewMode('MONTH')} style={[styles.toggleItem, viewMode === 'MONTH' && styles.toggleActive]}>
                            <Text style={[styles.toggleText, viewMode === 'MONTH' && styles.toggleTextActive]}>Mois</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setViewMode('WEEK')} style={[styles.toggleItem, viewMode === 'WEEK' && styles.toggleActive]}>
                            <Text style={[styles.toggleText, viewMode === 'WEEK' && styles.toggleTextActive]}>Semaine</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* NAVIGATION & CALENDAR */}
            <View style={styles.calendarSection}>
                <View style={styles.navRow}>
                    <TouchableOpacity onPress={() => changePeriod(-1)} style={styles.navBtn}><ChevronLeft size={24} color="#FFF" /></TouchableOpacity>
                    <Text style={styles.navLabel}>
                        {viewMode === 'MONTH' ? 'Changer mois' : 'Changer semaine'}
                    </Text>
                    <TouchableOpacity onPress={() => changePeriod(1)} style={styles.navBtn}><ChevronRight size={24} color="#FFF" /></TouchableOpacity>
                </View>

                {viewMode === 'MONTH' && (
                    <View style={styles.gridHeader}>
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d,i) => <Text key={i} style={styles.weekDayLabel}>{d}</Text>)}
                    </View>
                )}

                {viewMode === 'MONTH' ? renderMonthGrid() : renderWeekStrip()}
            </View>

            {/* AGENDA LIST */}
            <View style={styles.agendaContainer}>
                <View style={styles.agendaHeader}>
                    <Text style={styles.agendaDate}>
                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.todayBtn}>
                        <Text style={styles.todayText}>Aujourd'hui</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.eventsList} showsVerticalScrollIndicator={false}>
                    {mergedEvents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Rien de prévu pour ce jour.</Text>
                            <TouchableOpacity style={styles.addEventHint}>
                                <Text style={{color: '#007AFF'}}>+ Ajouter un objectif</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        mergedEvents.map((event, index) => (
                            <Animated.View entering={FadeIn.delay(index * 50)} key={`${event.type}-${event.id}-${index}`}>
                                <TouchableOpacity 
                                    style={[styles.eventCard, { borderLeftColor: event.color }]} 
                                    activeOpacity={0.8} 
                                    onPress={() => {
                                        if (event.type === 'task') toggleTask(event.id);
                                        if (event.type === 'habit') toggleHabit(event.id);
                                        if (event.type === 'google') Alert.alert("Google Calendar", event.title);
                                    }}
                                >
                                    <View style={styles.timeColumn}>
                                        {event.is_all_day ? (
                                            <Text style={styles.timeText}>Journée</Text>
                                        ) : (
                                            <>
                                                <Text style={styles.timeText}>{formatTime(event.start_time)}</Text>
                                                <Text style={styles.endTimeText}>{formatTime(event.end_time)}</Text>
                                            </>
                                        )}
                                    </View>
                                    
                                    <View style={styles.eventContent}>
                                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <Text style={[styles.eventTitle, event.status === 'completed' && styles.textDone]} numberOfLines={1}>{event.title}</Text>
                                            {event.status === 'completed' ? <CheckCircle2 size={16} color="#4ADE80" /> : null}
                                        </View>
                                        
                                        {event.location && (
                                            <View style={styles.metaRow}>
                                                <MapPin size={12} color="#888" />
                                                <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
                                            </View>
                                        )}
                                        
                                        {event.type === 'google' && (
                                            <View style={styles.googleBadge}>
                                                <Text style={styles.googleBadgeText}>G-Cal</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))
                    )}
                    <View style={{height: 100}} />
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    
    // Header
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 10,
    },
    headerLeft: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
    headerControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    googleBtn: {
        padding: 8,
        backgroundColor: 'rgba(234, 67, 53, 0.1)',
        borderRadius: 8,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E',
        borderRadius: 8,
        padding: 2,
    },
    toggleItem: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    toggleActive: {
        backgroundColor: '#3A3A3C',
    },
    toggleText: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#FFF',
    },

    // Calendar Section
    calendarSection: {
        paddingBottom: 10,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    navBtn: { padding: 4 },
    navLabel: { color: '#666', fontSize: 12 },
    
    gridHeader: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingHorizontal: 20,
    },
    weekDayLabel: {
        flex: 1,
        textAlign: 'center',
        color: '#666',
        fontSize: 11,
        fontWeight: '600',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
        borderRadius: 20,
    },
    dayCellSelected: {
        backgroundColor: '#FFF',
    },
    dayNum: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        bottom: 6,
    },

    // Week Strip
    weekStripContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        height: 70,
    },
    weekDayItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 45,
        borderRadius: 12,
        backgroundColor: '#1C1C1E',
    },
    weekDaySelected: {
        backgroundColor: '#007AFF',
    },
    weekDayName: {
        color: '#8E8E93',
        fontSize: 10,
        marginBottom: 4,
    },
    weekDayNum: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },

    // Agenda
    agendaContainer: {
        flex: 1,
        backgroundColor: '#171717',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        overflow: 'hidden',
    },
    agendaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    agendaDate: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    todayBtn: {
        backgroundColor: '#333',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    todayText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    eventsList: {
        paddingHorizontal: 20,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#666',
        fontStyle: 'italic',
        marginBottom: 10,
    },
    addEventHint: {
        marginTop: 10,
    },
    eventCard: {
        flexDirection: 'row',
        backgroundColor: '#000',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        borderLeftWidth: 4,
    },
    timeColumn: {
        width: 50,
        alignItems: 'flex-start',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#262626',
        paddingRight: 8,
        marginRight: 12,
    },
    timeText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    endTimeText: {
        color: '#666',
        fontSize: 11,
    },
    eventContent: {
        flex: 1,
        justifyContent: 'center',
    },
    eventTitle: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    textDone: {
        textDecorationLine: 'line-through',
        color: '#666',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    metaText: {
        color: '#888',
        fontSize: 11,
    },
    googleBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(234, 67, 53, 0.2)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    googleBadgeText: {
        color: '#EA4335',
        fontSize: 8,
        fontWeight: '700',
    },
});

export default CalendarPage;