import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { PlayerProfile, UserProfile, Task, Habit, Goal, ViewState, FocusSession, Announcement } from '../types';
import { Check, Flame, Plus, Play, ChevronRight, Zap, Target, Cloud, CloudOff, RefreshCw, Menu, Megaphone, X as CloseIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, LinearTransition, Layout } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { computeProductivityScore } from '../services/productivity';
import { getActiveAnnouncements } from '../services/admin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface DashboardProps {
  user: UserProfile;
  player: PlayerProfile;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  focusSessions: FocusSession[];
  toggleHabit: (id: string) => void;
  toggleTask: (id: string) => void;
  openFocus: () => void;
  openProfile: () => void;
  setView: (view: ViewState) => void;
  isDarkMode?: boolean;
  syncStatus?: 'SYNCED' | 'SYNCING' | 'OFFLINE_PENDING';
  openMenu: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, player, tasks, habits, goals, focusSessions = [], toggleHabit, toggleTask, openFocus, openProfile, setView, isDarkMode = true, syncStatus = 'SYNCED', openMenu }) => {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [closedAnnouncements, setClosedAnnouncements] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetchAnnouncements();
    loadClosedAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
        const data = await getActiveAnnouncements();
        setAnnouncements(data);
    } catch (e) {
        console.error(e);
    }
  };

  const loadClosedAnnouncements = async () => {
    const closed = await AsyncStorage.getItem('closed_announcements');
    if (closed) setClosedAnnouncements(JSON.parse(closed));
  };

  const handleCloseAnnouncement = async (id: string) => {
    const newClosed = [...closedAnnouncements, id];
    setClosedAnnouncements(newClosed);
    await AsyncStorage.setItem('closed_announcements', JSON.stringify(newClosed));
  };

  const visibleAnnouncements = announcements.filter(a => !closedAnnouncements.includes(a.id));
  
  const colors = {
      bg: isDarkMode ? '#000000' : '#F2F2F7',
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#007AFF',
      success: '#34C759',
      danger: '#FF3B30',
      orange: '#FF9500',
  };

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getFullYear() === d2.getFullYear();
  };

  const today = new Date();
  const dayOfWeek = today.getDay(); 
  
  const firstName = user.display_name?.split(' ')[0] || 'Voyageur';
  
  // Greeting Logic
  const hour = today.getHours();
  let greeting = 'Bonjour';
  if (hour >= 18) greeting = 'Bonsoir';
  else if (hour >= 12) greeting = 'Bon après-midi';

  // --- LOGIC SCORE & DATA ---
  
  // 1. Habits (Scheduled Today)
  const todaysHabits = useMemo(() => habits.filter(h => {
      if (h.is_archived) return false; 
      if (!h.days_of_week || h.days_of_week.length === 0) return true; 
      return h.days_of_week.includes(dayOfWeek);
  }), [habits, dayOfWeek]);
  
  const sortedHabits = [...todaysHabits].sort((a, b) => {
      const aDone = a.last_completed_at && isSameDay(new Date(a.last_completed_at), today);
      const bDone = b.last_completed_at && isSameDay(new Date(b.last_completed_at), today);
      if (aDone === bDone) return (a.sort_order || 0) - (b.sort_order || 0);
      return aDone ? 1 : -1;
  });

  // 2. Tasks & Goals
  const activeTasks = tasks.filter(t => !t.completed).slice(0, 4);
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const completedGoalsCount = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;

  const productivityScore = useMemo(() => {
      return computeProductivityScore({
          tasks,
          habits,
          goals,
          focusSessions,
          referenceDate: today,
      });
  }, [tasks, habits, goals, focusSessions, today]);

  // Autres stats
  const averageStreak = habits.length > 0 ? habits.reduce((acc, h) => acc + h.streak, 0) / habits.length : 0;

  // SVG Calculations for Score Ring
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (productivityScore / 100) * circumference;

  const handleNav = useCallback((view: ViewState) => {
      requestAnimationFrame(() => {
          setView(view);
      });
  }, [setView]);

  const handleToggleHabit = (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleHabit(id);
  }

  const handleToggleTask = (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toggleTask(id);
  }

  const renderSyncIcon = () => {
      if (syncStatus === 'SYNCING') return <ActivityIndicator size="small" color={colors.textSub} />;
      if (syncStatus === 'OFFLINE_PENDING') return <CloudOff size={18} color={colors.orange} />;
      return <Cloud size={18} color={colors.success} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* HEADER - Safe Area Padding + Standard Flex Row */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, paddingBottom: 10, backgroundColor: colors.bg }]}>
          <View style={styles.headerLeft}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2}}>
                  <Text style={[styles.greetingSub, {color: colors.textSub}]}>
                      {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                  </Text>
                  {renderSyncIcon()}
              </View>
              <Text style={[styles.greetingTitle, { color: colors.text }]}>{greeting}, {firstName}</Text>
          </View>
          
          <TouchableOpacity 
              onPress={() => {
                  Haptics.selectionAsync();
                  openProfile();
              }} 
              style={styles.avatarTouchArea}
              activeOpacity={0.6}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}} // Zone tactile très large
          >
              <Image 
                  source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                  style={styles.avatar} 
                  transition={200}
              />
          </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent]} 
        showsVerticalScrollIndicator={false}
      >
        
        {visibleAnnouncements.map((a) => (
            <Animated.View
                key={a.id}
                entering={FadeIn}
                layout={Layout.springify()}
                style={[styles.announcementBanner, { backgroundColor: colors.accent }]}
            >
                <Megaphone size={18} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={styles.announcementText}>{a.message}</Text>
                <TouchableOpacity onPress={() => handleCloseAnnouncement(a.id)} style={styles.announcementClose}>
                    <CloseIcon size={16} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>
        ))}

        {/* HERO SECTION: BENTO GRID */}
        <View style={styles.bentoGrid}>
            
            {/* LARGE HERO: PRODUCTIVITY */}
            <TouchableOpacity 
                style={[styles.bentoHero, { backgroundColor: colors.cardBg }]}
                activeOpacity={0.9}
                onPress={() => handleNav(ViewState.EVOLUTION)}
            >
                <LinearGradient
                    colors={isDarkMode ? ['#1E3A8A', '#000000'] : ['#E0E7FF', '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.heroContent}>
                    <View>
                        <Text style={[styles.heroLabel, { color: isDarkMode ? '#BFDBFE' : '#6366F1' }]}>SCORE DE PRODUCTIVITÉ</Text>
                        <Text style={[styles.heroValue, { color: isDarkMode ? '#FFF' : '#111' }]}>{productivityScore}</Text>
                        <Text style={[styles.heroSub, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>Performance globale</Text>
                    </View>
                    <View style={styles.ringContainer}>
                         <Svg width={size} height={size} style={{position: 'absolute'}}>
                            <Circle 
                                cx={size / 2} cy={size / 2} r={radius} 
                                stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"} 
                                strokeWidth={strokeWidth}
                                fill="transparent"
                            />
                            <Circle 
                                cx={size / 2} cy={size / 2} r={radius} 
                                stroke={isDarkMode ? "#60A5FA" : "#6366F1"} 
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                rotation="-90"
                                origin={`${size / 2}, ${size/2}`}
                            />
                         </Svg>
                         <Target size={24} color={isDarkMode ? '#FFF' : '#000'} />
                    </View>
                </View>
            </TouchableOpacity>

            <View style={styles.bentoRow}>
                {/* SMALL: STREAK */}
                <View style={[styles.bentoSmall, { backgroundColor: colors.cardBg }]}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                        <Flame size={20} color={colors.orange} fill={colors.orange} />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(averageStreak)}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSub }]}>Streak Moy.</Text>
                    </View>
                </View>

                {/* SMALL: FOCUS ACTION */}
                <TouchableOpacity 
                    style={[styles.bentoSmall, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF' }]}
                    onPress={openFocus}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                        <Zap size={20} color={colors.success} fill={colors.success} />
                    </View>
                     <View>
                        <Text style={[styles.statValue, { color: colors.text }]}>Focus</Text>
                        <Text style={[styles.statLabel, { color: colors.textSub }]}>Démarrer</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>

        {/* HABITS SECTION */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.sectionContainer}>
            <TouchableOpacity 
                style={styles.sectionHeaderBtn} 
                onPress={() => handleNav(ViewState.HABITS)}
                activeOpacity={0.6}
            >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Habitudes</Text>
                <View style={styles.seeAllContainer}>
                    <Text style={[styles.seeAllText, { color: colors.textSub }]}>Tout voir</Text>
                    <ChevronRight size={16} color={colors.textSub} />
                </View>
            </TouchableOpacity>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitScroll}>
                {sortedHabits.length === 0 && (
                    <Text style={{color: colors.textSub, fontStyle: 'italic', paddingLeft: 4}}>Rien de prévu aujourd'hui.</Text>
                )}
                {sortedHabits.map((habit) => {
                    const isDone = habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), today);
                    return (
                        <TouchableOpacity 
                            key={habit.id} 
                            style={[
                                styles.habitCard, 
                                { backgroundColor: colors.cardBg },
                                isDone && { opacity: 0.6 }
                            ]} 
                            onPress={() => handleToggleHabit(habit.id)}
                            activeOpacity={0.6}
                        >
                            <View style={[styles.habitIcon, { backgroundColor: isDone ? colors.success : (isDarkMode ? '#333' : '#F2F2F7') }]}>
                                {isDone ? <Check size={16} color="#FFF" strokeWidth={3} /> : <Flame size={16} color={colors.textSub} />}
                            </View>
                            <Text style={[styles.habitTitle, { color: colors.text }, isDone && styles.textMuted]} numberOfLines={2}>
                                {habit.title}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
                <TouchableOpacity style={[styles.addHabitCard, { borderColor: colors.border }]} onPress={() => handleNav(ViewState.HABITS)}>
                    <Plus size={24} color={colors.textSub} />
                </TouchableOpacity>
            </ScrollView>
        </Animated.View>

        {/* TASKS LIST */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.sectionContainer}>
            <TouchableOpacity 
                style={styles.sectionHeaderBtn} 
                onPress={() => handleNav(ViewState.TASKS)}
                activeOpacity={0.6}
            >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tâches Prioritaires</Text>
                <View style={styles.seeAllContainer}>
                    <Text style={[styles.seeAllText, { color: colors.textSub }]}>Tout voir</Text>
                    <ChevronRight size={16} color={colors.textSub} />
                </View>
            </TouchableOpacity>

            <View style={[styles.taskList, { backgroundColor: colors.cardBg }]}>
                {activeTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, {color: colors.textSub}]}>Tout est fait pour l'instant.</Text>
                    </View>
                ) : (
                    activeTasks.map((task, index) => (
                        <TouchableOpacity 
                            key={task.id}
                            style={[styles.taskRow, index < activeTasks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
                            onPress={() => handleToggleTask(task.id)}
                            activeOpacity={0.6}
                        >
                            <View style={[styles.checkbox, { borderColor: colors.textSub }]}>
                                {task.completed && <Check size={12} color="#FFF" strokeWidth={3} />}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                            </View>
                            <View style={[styles.priorityDot, { backgroundColor: task.priority === 'high' ? colors.danger : (task.priority === 'medium' ? colors.orange : 'transparent') }]} />
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerLeft: {
      flex: 1,
  },
  greetingSub: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
  },
  greetingTitle: {
      fontSize: 24,
      fontWeight: '700',
  },
  avatarTouchArea: {
      padding: 5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  scrollContent: {
    paddingBottom: 130, 
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  announcementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  announcementText: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  announcementClose: {
    padding: 4,
    marginLeft: 8,
  },
  
  // BENTO GRID
  bentoGrid: {
      marginBottom: 30,
      gap: 12,
  },
  bentoHero: {
      height: 140,
      borderRadius: 24,
      overflow: 'hidden',
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
  },
  heroContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  heroLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 6,
  },
  heroValue: {
      fontSize: 42,
      fontWeight: '800',
      marginBottom: 4,
  },
  heroSub: {
      fontSize: 14,
      fontWeight: '500',
  },
  ringContainer: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
  },
  bentoRow: {
      flexDirection: 'row',
      gap: 12,
  },
  bentoSmall: {
      flex: 1,
      height: 100,
      borderRadius: 24,
      padding: 16,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
  },
  iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
  },
  statValue: {
      fontSize: 18,
      fontWeight: '700',
  },
  statLabel: {
      fontSize: 12,
      fontWeight: '500',
  },

  // SECTIONS
  sectionContainer: {
      marginBottom: 30,
  },
  sectionHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
      paddingHorizontal: 4,
      paddingVertical: 4,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
  },
  seeAllContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
  },
  seeAllText: {
      fontSize: 13,
      fontWeight: '500',
  },
  
  // HABITS
  habitScroll: {
      gap: 12,
      paddingRight: 20,
  },
  habitCard: {
      width: 110,
      height: 110,
      borderRadius: 20,
      padding: 14,
      justifyContent: 'space-between',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  habitIcon: {
      width: 32,
      height: 32,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },
  habitTitle: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 18,
  },
  textMuted: {
      textDecorationLine: 'line-through',
  },
  addHabitCard: {
      width: 60,
      height: 110,
      borderRadius: 20,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
  },

  // TASKS
  taskList: {
      borderRadius: 24,
      paddingVertical: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
  },
  checkbox: {
      width: 22,
      height: 22,
      borderRadius: 8,
      borderWidth: 1.5,
      marginRight: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  taskText: {
      fontSize: 15,
      fontWeight: '500',
  },
  priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 10,
  },
  emptyState: {
      padding: 20,
      alignItems: 'center',
  },
  emptyText: {
      fontStyle: 'italic',
  }
});

export default Dashboard;
