import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, Flame, Globe, LogOut, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Task, Habit, CalendarEvent } from '../types';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

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
    const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
    
    // Google Calendar State
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
    const [loadingGoogle, setLoadingGoogle] = useState(false);

    // Configuration OAuth
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: '913448608067-asdhst6j70ucnkj147c7s8tuj12jgmg2.apps.googleusercontent.com',
        iosClientId: '913448608067-asdhst6j70ucnkj147c7s8tuj12jgmg2.apps.googleusercontent.com',
        webClientId: '913448608067-asdhst6j70ucnkj147c7s8tuj12jgmg2.apps.googleusercontent.com',
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

                    // Gestion des événements journée entière
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

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                    {openMenu && (
                        <TouchableOpacity style={styles.syncBtn} onPress={openMenu}>
                            <Menu size={24} color="#FFF" />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>Calendrier</Text>
                </View>
                
                {/* Google Sync Button */}
                <TouchableOpacity 
                    style={[styles.syncBtn, googleToken && styles.syncBtnActive]}
                    onPress={() => !googleToken ? promptAsync() : setGoogleToken(null)}
                    disabled={!request}
                >
                    {loadingGoogle ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                         googleToken ? (
                             <LogOut size={20} color="#EF4444" /> // Disconnect icon if connected
                         ) : (
                            <Globe size={20} color="#FFF" />
                         )
                    )}
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

            {!googleToken && (
                <TouchableOpacity style={styles.googlePromo} onPress={() => promptAsync()} disabled={!request}>
                    <Text style={styles.googlePromoText}>Connecter Google Calendar</Text>
                </TouchableOpacity>
            )}

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
                            activeOpacity={event.type === 'google' ? 1 : 0.7}
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
                                    
                                    <View style={[styles.tagBadge, event.type === 'google' && { backgroundColor: 'rgba(66, 133, 244, 0.2)' }]}>
                                        {event.type === 'habit' && <Flame size={10} color="#FFF" style={{marginRight:4}} />}
                                        <Text style={[styles.tagText, event.type === 'google' && { color: '#4285F4' }]}>
                                            {event.type === 'google' ? 'Google' : (event.type === 'habit' ? 'Habitude' : 'Tâche')}
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
    syncBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#171717',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    syncBtnActive: {
        borderColor: '#EF4444', // Red border to indicate logout option
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
    googlePromo: {
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 10,
        backgroundColor: 'rgba(66, 133, 244, 0.1)',
        borderRadius: 8,
        alignItems: 'center',
    },
    googlePromoText: {
        color: '#4285F4',
        fontSize: 12,
        fontWeight: '600',
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