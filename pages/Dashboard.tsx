import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { UserProfile, Task, Habit, Goal, ViewState, FocusSession, Announcement, JournalEntry, Reflection } from '../types';
import { Check, Flame, Plus, Play, ChevronRight, Zap, Target, Cloud, CloudOff, RefreshCw, Menu, Megaphone, X as CloseIcon, Info, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, LinearTransition, Layout } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Theme } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { PageContainer } from '../components/PageContainer';
import { computeProductivityScore } from '../services/productivity';
import { getActiveAnnouncements } from '../services/admin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface DashboardProps {
  user: UserProfile;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  focusSessions: FocusSession[];
  journalEntries?: JournalEntry[];
  reflections?: Reflection[];
  productivityScore?: number;
  toggleHabit: (id: string) => void;
  toggleTask: (id: string) => void;
  openFocus: () => void;
  openProfile: () => void;
  setView: (view: ViewState) => void;
  isDarkMode?: boolean;
  syncStatus?: 'SYNCED' | 'SYNCING' | 'OFFLINE_PENDING';
  openMenu: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, tasks, habits, goals, focusSessions = [], journalEntries = [], reflections = [], productivityScore: initialProductivityScore, toggleHabit, toggleTask, openFocus, openProfile, setView, isDarkMode = true, syncStatus = 'SYNCED', openMenu }) => {
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
      ...Theme.colors,
      textSub: Theme.colors.textSecondary,
      orange: Theme.colors.warning
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

  const productivityScore = initialProductivityScore ?? 0;

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
    <PageContainer style={styles.container}>
      
      {/* HEADER - Safe Area Padding + Standard Flex Row */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, paddingBottom: 10 }]}>
          <View style={styles.headerLeft}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2}}>
                  <Text style={[styles.greetingSub, {color: colors.textSecondary}]}>
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
                style={[styles.announcementBanner, { backgroundColor: a.announcement_type === 'alert' ? '#FF3B30' : (a.announcement_type === 'update' ? '#34C759' : '#007AFF') }]}
            >
                {a.announcement_type === 'alert' ? <AlertTriangle size={18} color="#FFF" style={{ marginRight: 10 }} /> : (a.announcement_type === 'update' ? <Plus size={18} color="#FFF" style={{ marginRight: 10 }} /> : <Info size={18} color="#FFF" style={{ marginRight: 10 }} />)}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.announcementText, { fontWeight: '800' }]}>{a.title}</Text>
                    <Text style={[styles.announcementText, { fontSize: 12, opacity: 0.9 }]}>{a.content}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCloseAnnouncement(a.id)} style={styles.announcementClose}>
                    <CloseIcon size={16} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>
        ))}

        {/* HERO SECTION: BENTO GRID */}
        <View style={styles.bentoGrid}>
            
            {/* LARGE HERO: PRODUCTIVITY */}
            <Animated.View entering={FadeInDown.duration(600).delay(100).springify()}>
            <GlassCard
                style={styles.bentoHero}
            >
                <LinearGradient
                    colors={[Theme.colors.violet + '40', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.heroContent}>
                    <View>
                        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>SCORE DE PRODUCTIVITÉ</Text>
                        <Text style={[styles.heroValue, { color: colors.text }]}>{productivityScore}</Text>
                        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>Performance globale</Text>
                    </View>
                    <View style={styles.ringContainer}>
                         <Svg width={size} height={size} style={{position: 'absolute'}}>
                            <Circle 
                                cx={size / 2} cy={size / 2} r={radius} 
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth={strokeWidth}
                                fill="transparent"
                            />
                            <Circle 
                                cx={size / 2} cy={size / 2} r={radius} 
                                stroke={colors.violet}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                rotation="-90"
                                origin={`${size / 2}, ${size/2}`}
                            />
                         </Svg>
                         <Target size={24} color={colors.text} />
                    </View>
                </View>
            </GlassCard>
            </Animated.View>

            <View style={styles.bentoRow}>
                {/* SMALL: STREAK */}
                <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={{ flex: 1 }}>
                <GlassCard style={styles.bentoSmall}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
                        <Flame size={20} color={colors.warning} fill={colors.warning} />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(averageStreak)}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak Moy.</Text>
                    </View>
                </GlassCard>
                </Animated.View>

                {/* SMALL: FOCUS ACTION */}
                <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={{ flex: 1 }}>
                <TouchableOpacity 
                    style={{ flex: 1 }}
                    onPress={openFocus}
                    activeOpacity={0.7}
                >
                  <GlassCard style={styles.bentoSmall}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                        <Zap size={20} color={colors.success} fill={colors.success} />
                    </View>
                     <View>
                        <Text style={[styles.statValue, { color: colors.text }]}>Focus</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Démarrer</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
                </Animated.View>
            </View>
        </View>

        {/* HABITS SECTION */}
        <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.sectionContainer}>
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
                    <Text style={{color: colors.textSecondary, fontStyle: 'italic', paddingLeft: 4}}>Rien de prévu aujourd'hui.</Text>
                )}
                {sortedHabits.map((habit) => {
                    const isDone = habit.last_completed_at && isSameDay(new Date(habit.last_completed_at), today);
                    return (
                        <TouchableOpacity 
                            key={habit.id} 
                            onPress={() => handleToggleHabit(habit.id)}
                            activeOpacity={0.6}
                        >
                          <GlassCard
                              style={[
                                  styles.habitCard,
                                  isDone && { opacity: 0.6 }
                              ]}
                          >
                            <View style={[styles.habitIcon, { backgroundColor: isDone ? colors.success : 'rgba(255,255,255,0.1)' }]}>
                                {isDone ? <Check size={16} color="#FFF" strokeWidth={3} /> : <Flame size={16} color={colors.textSecondary} />}
                            </View>
                            <Text style={[styles.habitTitle, { color: colors.text }, isDone && styles.textMuted]} numberOfLines={2}>
                                {habit.title}
                            </Text>
                          </GlassCard>
                        </TouchableOpacity>
                    )
                })}
                <TouchableOpacity style={[styles.addHabitCard, { borderColor: colors.border }]} onPress={() => handleNav(ViewState.HABITS)}>
                    <Plus size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            </ScrollView>
        </Animated.View>

        {/* TASKS LIST */}
        <Animated.View entering={FadeInDown.duration(600).delay(500).springify()} style={styles.sectionContainer}>
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

            <GlassCard style={styles.taskList}>
                {activeTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, {color: colors.textSecondary}]}>Tout est fait pour l'instant.</Text>
                    </View>
                ) : (
                    activeTasks.map((task, index) => (
                        <TouchableOpacity 
                            key={task.id}
                            style={[styles.taskRow, index < activeTasks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
                            onPress={() => handleToggleTask(task.id)}
                            activeOpacity={0.6}
                        >
                            <View style={[styles.checkbox, { borderColor: colors.textSecondary }]}>
                                {task.completed && <Check size={12} color="#FFF" strokeWidth={3} />}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                            </View>
                            <View style={[styles.priorityDot, { backgroundColor: task.priority === 'high' ? colors.danger : (task.priority === 'medium' ? colors.orange : 'transparent') }]} />
                        </TouchableOpacity>
                    ))
                )}
            </GlassCard>
        </Animated.View>

      </ScrollView>
    </PageContainer>
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
