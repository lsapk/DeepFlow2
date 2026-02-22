import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Dimensions, Modal, TextInput, Switch } from 'react-native';
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, Calendar as CalendarIcon, MapPin, Clock, AlignLeft, LogIn, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Task, Habit, CalendarEvent } from '../types';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { playMenuClick } from '../services/sound';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

// --- CONFIGURATION GOOGLE ---
// Expo n'expose côté client que les variables EXPO_PUBLIC_*
const sanitizeEnvValue = (value?: string) =>
    (value || '').replace(/\\n/g, '').trim();

const GOOGLE_CONFIG = {
    expoClientId: sanitizeEnvValue(process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID),
    webClientId: sanitizeEnvValue(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    androidClientId: sanitizeEnvValue(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
    iosClientId: sanitizeEnvValue(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
};

const appOwnership = Constants.appOwnership;
const isExpoGo = appOwnership === 'expo';

const hasGoogleClientIdForCurrentPlatform = () => {
    if (isExpoGo) return !!(GOOGLE_CONFIG.expoClientId || GOOGLE_CONFIG.webClientId);
    if (Platform.OS === 'ios') return !!GOOGLE_CONFIG.iosClientId;
    if (Platform.OS === 'android') return !!GOOGLE_CONFIG.androidClientId;
    if (Platform.OS === 'web') return !!GOOGLE_CONFIG.webClientId;
    return false;
};


interface LocalCalendarEvent {
    id: string;
    user_id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    start_time: string;
    end_time: string;
    is_all_day: boolean;
    created_at: string;
    updated_at: string;
}

const LOCAL_EVENTS_KEY = 'deepflow_custom_calendar_events';

interface CalendarPageProps {
    tasks: Task[];
    habits: Habit[];
    toggleTask: (id: string) => void;
    toggleHabit: (id: string) => void;
    openMenu: () => void;
    isDarkMode?: boolean;
    noPadding?: boolean;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ tasks, habits, toggleTask, toggleHabit, openMenu, isDarkMode = true, noPadding = false }) => {
    const insets = useSafeAreaInsets();
    
    // Theme Colors
    const colors = {
        bg: isDarkMode ? '#000000' : '#F2F2F7',
        text: isDarkMode ? '#FFFFFF' : '#000000',
        textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
        card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
        border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
        toggleBg: isDarkMode ? '#1C1C1E' : '#E5E5EA',
        toggleActive: isDarkMode ? '#3A3A3C' : '#FFFFFF',
        daySelectedBg: isDarkMode ? '#FFFFFF' : '#000000',
        daySelectedText: isDarkMode ? '#000000' : '#FFFFFF',
        weekStripItem: isDarkMode ? '#1C1C1E' : '#FFFFFF',
        agendaBg: isDarkMode ? '#171717' : '#FFFFFF',
        accent: '#007AFF',
        googleRed: '#EA4335'
    };

    // View State
    const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK'>('MONTH');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonthCursor, setCurrentMonthCursor] = useState(new Date());
    const [weekCursor, setWeekCursor] = useState(new Date());
    
    // Data State
    const [mergedEvents, setMergedEvents] = useState<CalendarEvent[]>([]);
    const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
    
    const [habitHistory, setHabitHistory] = useState<any[]>([]);
    const [customEvents, setCustomEvents] = useState<LocalCalendarEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [eventForm, setEventForm] = useState({ title: '', description: '', location: '', start: '09:00', end: '10:00', isAllDay: false });

    // Google Auth Request - Safely initialized with dummy IDs if real ones missing
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: GOOGLE_CONFIG.expoClientId || GOOGLE_CONFIG.webClientId || undefined,
        iosClientId: GOOGLE_CONFIG.iosClientId || undefined,
        androidClientId: GOOGLE_CONFIG.androidClientId || undefined,
        webClientId: GOOGLE_CONFIG.webClientId || undefined,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                setGoogleToken(authentication.accessToken);
                fetchGoogleCalendarEvents(authentication.accessToken);
            }
        } else if (response?.type === 'error') {
            console.log("Auth error", response.error);
            Alert.alert("Erreur Google", "La connexion a échoué. Vérifiez la configuration dans Google Cloud Console.");
        }
    }, [response]);

    useEffect(() => {
        fetchHabitHistory();
    }, [habits, selectedDate.getMonth()]);

    useEffect(() => {
        loadCustomEvents();
    }, []);


    const fetchHabitHistory = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Correctly format dates to YYYY-MM-DD for Supabase query
        const startOfMonth = new Date(currentMonthCursor.getFullYear(), currentMonthCursor.getMonth() - 1, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentMonthCursor.getFullYear(), currentMonthCursor.getMonth() + 2, 0).toISOString().split('T')[0];

        try {
            const { data, error } = await supabase
                .from('habit_completions')
                .select('*')
                .eq('user_id', user.id)
                .gte('completed_date', startOfMonth)
                .lte('completed_date', endOfMonth);
            
            if (error) throw error;
            if (data) setHabitHistory(data);
        } catch (e) {
            console.log("Offline habit history sync failed - using local data only");
        }
    };

    useEffect(() => {
        mergeAllEvents();
    }, [selectedDate, tasks, habits, googleEvents, habitHistory, customEvents]);


    const loadCustomEvents = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            const raw = await AsyncStorage.getItem(`${LOCAL_EVENTS_KEY}_${user.id}`);
            const local: LocalCalendarEvent[] = raw ? JSON.parse(raw) : [];
            setCustomEvents(local);

            // Sync best-effort from Supabase if table exists
            const { data } = await supabase.from('calendar_events').select('*').eq('user_id', user.id);
            if (data && Array.isArray(data) && data.length > 0) {
                const merged = [...local];
                data.forEach((r: any) => {
                    if (!merged.some(e => e.id === r.id)) {
                        merged.push({
                            id: r.id,
                            user_id: r.user_id,
                            title: r.title,
                            description: r.description,
                            location: r.location,
                            start_time: r.start_time,
                            end_time: r.end_time,
                            is_all_day: !!r.is_all_day,
                            created_at: r.created_at || new Date().toISOString(),
                            updated_at: r.updated_at || new Date().toISOString(),
                        });
                    }
                });
                setCustomEvents(merged);
                await AsyncStorage.setItem(`${LOCAL_EVENTS_KEY}_${user.id}`, JSON.stringify(merged));
            }
        } catch (e) {
            console.log('Custom events fallback local only');
        }
    };

    const persistCustomEvents = async (events: LocalCalendarEvent[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await AsyncStorage.setItem(`${LOCAL_EVENTS_KEY}_${user.id}`, JSON.stringify(events));
    };

    const openCreateEvent = () => {
        setEditingEventId(null);
        setEventForm({ title: '', description: '', location: '', start: '09:00', end: '10:00', isAllDay: false });
        setShowEventModal(true);
    };

    const openEditEvent = (event: LocalCalendarEvent) => {
        const startD = new Date(event.start_time);
        const endD = new Date(event.end_time);
        setEditingEventId(event.id);
        setEventForm({
            title: event.title,
            description: event.description || '',
            location: event.location || '',
            start: `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`,
            end: `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`,
            isAllDay: event.is_all_day,
        });
        setShowEventModal(true);
    };

    const saveCustomEvent = async () => {
        if (!eventForm.title.trim()) {
            Alert.alert('Titre requis', "Ajoutez un titre à l'événement.");
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dateStr = selectedDate.toISOString().split('T')[0];
        const startIso = eventForm.isAllDay ? `${dateStr}T00:00:00.000Z` : new Date(`${dateStr}T${eventForm.start}:00`).toISOString();
        const endIso = eventForm.isAllDay ? `${dateStr}T23:59:00.000Z` : new Date(`${dateStr}T${eventForm.end}:00`).toISOString();

        const payload: LocalCalendarEvent = {
            id: editingEventId || `local_${Date.now()}`,
            user_id: user.id,
            title: eventForm.title.trim(),
            description: eventForm.description.trim() || null,
            location: eventForm.location.trim() || null,
            start_time: startIso,
            end_time: endIso,
            is_all_day: eventForm.isAllDay,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const next = editingEventId
            ? customEvents.map(ev => ev.id === editingEventId ? payload : ev)
            : [...customEvents, payload];

        setCustomEvents(next);
        await persistCustomEvents(next);

        try {
            await supabase.from('calendar_events').upsert(payload);
        } catch {
            // local-first
        }

        setShowEventModal(false);
    };

    const deleteCustomEvent = async (id: string) => {
        const next = customEvents.filter(ev => ev.id !== id);
        setCustomEvents(next);
        await persistCustomEvents(next);
        try {
            await supabase.from('calendar_events').delete().eq('id', id);
        } catch {
            // local-first
        }
    };

    const fetchGoogleCalendarEvents = async (token: string) => {
        setIsLoadingGoogle(true);
        try {
            const startDate = new Date(currentMonthCursor.getFullYear(), currentMonthCursor.getMonth() - 1, 1).toISOString();
            const endDate = new Date(currentMonthCursor.getFullYear(), currentMonthCursor.getMonth() + 2, 0).toISOString();

            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate}&timeMax=${endDate}&singleEvents=true&orderBy=startTime`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Google API Error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            
            if (data.items) {
                const formatted: CalendarEvent[] = data.items.map((item: any) => ({
                    id: item.id,
                    title: item.summary || 'Sans titre',
                    description: item.description,
                    location: item.location,
                    start_time: item.start.dateTime || item.start.date, 
                    end_time: item.end.dateTime || item.end.date,
                    is_all_day: !!item.start.date,
                    type: 'google',
                    status: 'pending',
                    color: '#EA4335',
                    meta: item
                }));
                setGoogleEvents(formatted);
            }
        } catch (error) {
            console.log("Google Calendar Error:", error);
        } finally {
            setIsLoadingGoogle(false);
        }
    };

    const handleGoogleConnect = async () => {
        if (!hasGoogleClientIdForCurrentPlatform()) {
            const expected = isExpoGo
                ? 'EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID (ou EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en secours)'
                : Platform.OS === 'ios'
                    ? 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'
                    : Platform.OS === 'android'
                        ? 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
                        : 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID';

            Alert.alert(
                'Configuration Manquante',
                `Client ID Google manquant pour cette plateforme. Ajoute ${expected} dans le .env puis redémarre Expo avec le cache vidé.`
            );
            return;
        }

        if (googleToken) {
            fetchGoogleCalendarEvents(googleToken);
            return;
        }

        const result = await promptAsync();
        if (result?.type !== 'success' && result?.type !== 'dismiss') {
            Alert.alert('Connexion Google', 'Connexion annulée ou refusée.');
        }
    };

    const mergeAllEvents = () => {
        const events: CalendarEvent[] = [];
        const dayOfWeek = selectedDate.getDay();
        const selectedDateString = selectedDate.toISOString().split('T')[0];

        // 1. Google Events
        googleEvents.forEach(ev => {
            const evDate = new Date(ev.start_time!);
            if (isSameDay(evDate, selectedDate)) {
                events.push(ev);
            }
        });

        // 2. Local custom events
        customEvents.forEach(ev => {
            if (isSameDay(new Date(ev.start_time), selectedDate)) {
                events.push({
                    id: ev.id,
                    title: ev.title,
                    description: ev.description || undefined,
                    location: ev.location || undefined,
                    start_time: ev.start_time,
                    end_time: ev.end_time,
                    is_all_day: ev.is_all_day,
                    type: 'custom',
                    status: 'pending',
                    color: '#A78BFA',
                    meta: ev
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
                    color: '#007AFF', // Blue
                    meta: task
                });
            }
        });

        // 4. Habits
        habits.forEach(habit => {
            const isForToday = !habit.days_of_week || habit.days_of_week.length === 0 || habit.days_of_week.includes(dayOfWeek);
            
            if (isForToday && !habit.is_archived) {
                const isCompletedOnDate = habitHistory.some(h => h.habit_id === habit.id && h.completed_date === selectedDateString);
                const isCompletedTodayLive = isSameDay(selectedDate, new Date()) && habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), new Date());

                events.push({
                    id: habit.id,
                    title: habit.title,
                    is_all_day: true,
                    type: 'habit',
                    status: (isCompletedOnDate || isCompletedTodayLive) ? 'completed' : 'pending',
                    color: '#FF9500', // Orange
                    meta: habit
                });
            }
        });

        events.sort((a, b) => {
            if (a.is_all_day && !b.is_all_day) return 1;
            if (!a.is_all_day && b.is_all_day) return -1;
            if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
            return 0;
        });

        setMergedEvents(events);
    };

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
        const dayOfWeek = date.getDay();
        const dateString = date.toISOString().split('T')[0];

        const hasGoogle = googleEvents.some(ev => isSameDay(new Date(ev.start_time!), date));
        if (hasGoogle) return { has: true, color: colors.googleRed };

        const hasCustom = customEvents.some(ev => isSameDay(new Date(ev.start_time), date));
        if (hasCustom) return { has: true, color: '#A78BFA' };

        const hasTask = tasks.some(t => t.due_date && isSameDay(new Date(t.due_date), date));
        if (hasTask) return { has: true, color: colors.accent };

        const hasCompletedHabit = habitHistory.some(h => h.completed_date === dateString);
        if (hasCompletedHabit) return { has: true, color: '#34C759' };

        const hasScheduledHabit = habits.some(h => !h.is_archived && (!h.days_of_week || h.days_of_week.includes(dayOfWeek)));
        if (hasScheduledHabit) return { has: true, color: '#FF9500' };

        return { has: false, color: 'transparent' };
    };

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
                            style={[styles.dayCell, isSelected && { backgroundColor: colors.daySelectedBg }]} 
                            onPress={() => { playMenuClick(); setSelectedDate(date); }}
                        >
                            <Text style={[
                                styles.dayNum, 
                                { color: isSelected ? colors.daySelectedText : colors.text },
                                isToday && !isSelected && { color: colors.accent, fontWeight: '700' }
                            ]}>
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
        startOfWeek.setDate(weekCursor.getDate() - weekCursor.getDay());
        
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
                            style={[
                                styles.weekDayItem, 
                                { backgroundColor: colors.weekStripItem },
                                isSelected && { backgroundColor: colors.accent }
                            ]}
                            onPress={() => { playMenuClick(); setSelectedDate(date); }}
                        >
                            <Text style={[styles.weekDayName, { color: isSelected ? '#FFF' : colors.textSub }]}>
                                {['D','L','M','M','J','V','S'][date.getDay()]}
                            </Text>
                            <Text style={[
                                styles.weekDayNum, 
                                { color: isSelected ? '#FFF' : colors.text },
                                isToday && !isSelected && { color: colors.accent }
                            ]}>
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
        <View style={[styles.container, { paddingTop: noPadding ? 0 : insets.top, backgroundColor: colors.bg }]}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {viewMode === 'MONTH' 
                            ? currentMonthCursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
                            : selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
                        }
                    </Text>
                </View>
                
                <View style={styles.headerControls}>
                    <TouchableOpacity onPress={openCreateEvent} style={[styles.googleBtn, { backgroundColor: 'rgba(0, 122, 255, 0.12)' }]}><Plus size={20} color={colors.accent} /></TouchableOpacity>
                    {!googleToken && (
                        <TouchableOpacity onPress={handleGoogleConnect} style={[styles.googleBtn, { backgroundColor: hasGoogleClientIdForCurrentPlatform() ? 'rgba(234, 67, 53, 0.1)' : '#333' }]} disabled={isLoadingGoogle || !request}>
                            {isLoadingGoogle ? <ActivityIndicator size="small" color={colors.googleRed} /> : <CalendarIcon size={20} color={hasGoogleClientIdForCurrentPlatform() ? colors.googleRed : '#555'} />}
                        </TouchableOpacity>
                    )}
                    <View style={[styles.viewToggle, { backgroundColor: colors.toggleBg }]}>
                        <TouchableOpacity onPress={() => setViewMode('MONTH')} style={[styles.toggleItem, viewMode === 'MONTH' && { backgroundColor: colors.toggleActive }]}>
                            <Text style={[styles.toggleText, { color: colors.textSub }, viewMode === 'MONTH' && { color: colors.text, fontWeight: '700' }]}>Mois</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setViewMode('WEEK')} style={[styles.toggleItem, viewMode === 'WEEK' && { backgroundColor: colors.toggleActive }]}>
                            <Text style={[styles.toggleText, { color: colors.textSub }, viewMode === 'WEEK' && { color: colors.text, fontWeight: '700' }]}>Semaine</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.calendarSection}>
                <View style={styles.navRow}>
                    <TouchableOpacity onPress={() => changePeriod(-1)} style={styles.navBtn}>
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.navLabel, { color: colors.textSub }]}>
                        {viewMode === 'MONTH' ? 'Changer mois' : 'Changer semaine'}
                    </Text>
                    <TouchableOpacity onPress={() => changePeriod(1)} style={styles.navBtn}>
                        <ChevronRight size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {viewMode === 'MONTH' && (
                    <View style={styles.gridHeader}>
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d,i) => (
                            <Text key={i} style={[styles.weekDayLabel, { color: colors.textSub }]}>{d}</Text>
                        ))}
                    </View>
                )}

                {viewMode === 'MONTH' ? renderMonthGrid() : renderWeekStrip()}
            </View>

            <View style={[styles.agendaContainer, { backgroundColor: colors.agendaBg }]}>
                <View style={styles.agendaHeader}>
                    <Text style={[styles.agendaDate, { color: colors.text }]}>
                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={[styles.todayBtn, { backgroundColor: isDarkMode ? '#333' : '#E5E5EA' }]}>
                        <Text style={[styles.todayText, { color: colors.text }]}>Aujourd'hui</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.eventsList} showsVerticalScrollIndicator={false}>
                    {mergedEvents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: colors.textSub }]}>Rien de prévu pour ce jour.</Text>
                            <TouchableOpacity style={styles.addEventHint} onPress={openCreateEvent}>
                                <Text style={{color: colors.accent}}>+ Ajouter un événement</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        mergedEvents.map((event, index) => (
                            <Animated.View entering={FadeIn.delay(index * 50)} key={`${event.type}-${event.id}-${index}`}>
                                <TouchableOpacity 
                                    style={[styles.eventCard, { backgroundColor: colors.card, borderLeftColor: event.color }]} 
                                    activeOpacity={0.8} 
                                    onPress={() => {
                                        if (event.type === 'task') toggleTask(event.id);
                                        if (event.type === 'habit' && isSameDay(selectedDate, new Date())) toggleHabit(event.id);
                                        if (event.type === 'google') Alert.alert("Google Calendar", event.title);
                                        if (event.type === 'custom') {
                                            const ev = event.meta as LocalCalendarEvent;
                                            Alert.alert(
                                                event.title,
                                                'Modifier ou supprimer cet événement ?',
                                                [
                                                    { text: 'Annuler', style: 'cancel' },
                                                    { text: 'Modifier', onPress: () => openEditEvent(ev) },
                                                    { text: 'Supprimer', style: 'destructive', onPress: () => deleteCustomEvent(ev.id) }
                                                ]
                                            );
                                        }
                                    }}
                                >
                                    <View style={[styles.timeColumn, { borderRightColor: colors.border }]}>
                                        {event.is_all_day ? (
                                            <Text style={[styles.timeText, { color: colors.text }]}>Journée</Text>
                                        ) : (
                                            <>
                                                <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(event.start_time)}</Text>
                                                <Text style={[styles.endTimeText, { color: colors.textSub }]}>{formatTime(event.end_time)}</Text>
                                            </>
                                        )}
                                    </View>
                                    
                                    <View style={styles.eventContent}>
                                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <Text style={[styles.eventTitle, { color: colors.text }, event.status === 'completed' && { textDecorationLine: 'line-through', color: colors.textSub }]} numberOfLines={1}>
                                                {event.title}
                                            </Text>
                                            {event.status === 'completed' ? <CheckCircle2 size={16} color="#4ADE80" /> : null}
                                        </View>
                                        
                                        {event.location && (
                                            <View style={styles.metaRow}>
                                                <MapPin size={12} color={colors.textSub} />
                                                <Text style={[styles.metaText, { color: colors.textSub }]} numberOfLines={1}>{event.location}</Text>
                                            </View>
                                        )}
                                        
                                        {event.type === 'custom' && (
                                            <View style={[styles.googleBadge, { backgroundColor: 'rgba(167,139,250,0.2)' }]}>
                                                <Text style={[styles.googleBadgeText, { color: '#A78BFA' }]}>Local</Text>
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

            <Modal visible={showEventModal} transparent animationType="slide" onRequestClose={() => setShowEventModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{editingEventId ? 'Modifier événement' : 'Nouvel événement'}</Text>
                        <TextInput placeholder="Titre" placeholderTextColor={colors.textSub} value={eventForm.title} onChangeText={(v) => setEventForm(prev => ({ ...prev, title: v }))} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                        <TextInput placeholder="Description" placeholderTextColor={colors.textSub} value={eventForm.description} onChangeText={(v) => setEventForm(prev => ({ ...prev, description: v }))} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                        <TextInput placeholder="Lieu" placeholderTextColor={colors.textSub} value={eventForm.location} onChangeText={(v) => setEventForm(prev => ({ ...prev, location: v }))} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                        <View style={styles.rowBetween}>
                            <Text style={{ color: colors.text }}>Journée entière</Text>
                            <Switch value={eventForm.isAllDay} onValueChange={(v) => setEventForm(prev => ({ ...prev, isAllDay: v }))} />
                        </View>
                        {!eventForm.isAllDay && (
                            <View style={styles.rowBetween}>
                                <TextInput placeholder="Début HH:MM" placeholderTextColor={colors.textSub} value={eventForm.start} onChangeText={(v) => setEventForm(prev => ({ ...prev, start: v }))} style={[styles.inputHalf, { color: colors.text, borderColor: colors.border }]} />
                                <TextInput placeholder="Fin HH:MM" placeholderTextColor={colors.textSub} value={eventForm.end} onChangeText={(v) => setEventForm(prev => ({ ...prev, end: v }))} style={[styles.inputHalf, { color: colors.text, borderColor: colors.border }]} />
                            </View>
                        )}
                        <View style={styles.rowBetween}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: isDarkMode ? '#333' : '#DDD' }]} onPress={() => setShowEventModal(false)}><Text style={{ color: colors.text }}>Annuler</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={saveCustomEvent}><Text style={{ color: '#FFF', fontWeight: '700' }}>Enregistrer</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    headerControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    googleBtn: { padding: 8, borderRadius: 8 },
    viewToggle: { flexDirection: 'row', borderRadius: 8, padding: 2 },
    toggleItem: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    toggleText: { fontSize: 12, fontWeight: '600' },
    calendarSection: { paddingBottom: 10 },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 10 },
    navBtn: { padding: 4 },
    navLabel: { fontSize: 12 },
    gridHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 20 },
    weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2, borderRadius: 20 },
    dayNum: { fontSize: 15, fontWeight: '500' },
    dot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 6 },
    weekStripContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, height: 70 },
    weekDayItem: { alignItems: 'center', justifyContent: 'center', width: 45, borderRadius: 12 },
    weekDayName: { fontSize: 10, marginBottom: 4 },
    weekDayNum: { fontSize: 16, fontWeight: '700' },
    agendaContainer: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, overflow: 'hidden' },
    agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    agendaDate: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
    todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    todayText: { fontSize: 12, fontWeight: '600' },
    eventsList: { paddingHorizontal: 20 },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontStyle: 'italic', marginBottom: 10 },
    addEventHint: { marginTop: 10 },
    eventCard: { flexDirection: 'row', borderRadius: 12, marginBottom: 12, padding: 12, borderLeftWidth: 4 },
    timeColumn: { width: 50, alignItems: 'flex-start', justifyContent: 'center', borderRightWidth: 1, paddingRight: 8, marginRight: 12 },
    timeText: { fontSize: 13, fontWeight: '600' },
    endTimeText: { fontSize: 11 },
    eventContent: { flex: 1, justifyContent: 'center' },
    eventTitle: { fontSize: 15, fontWeight: '500', flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    metaText: { fontSize: 11 },
    googleBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(234, 67, 53, 0.2)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    googleBadgeText: { color: '#EA4335', fontSize: 8, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    inputHalf: { width: '48%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    modalBtn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
});

export default CalendarPage;
