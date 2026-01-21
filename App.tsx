import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator, Modal, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import { ViewState, UserProfile, PlayerProfile, Task, Habit, Goal, Quest } from './types';
import Dashboard from './pages/Dashboard';
import Growth from './pages/Growth';
import CyberKnight from './pages/CyberKnight';
import Focus from './pages/Focus';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Goals from './pages/Goals';
import Journal from './pages/Journal';
import ReflectionPage from './pages/Reflection';
import CalendarPage from './pages/CalendarPage';
import Auth from './pages/Auth';
import { supabase } from './services/supabase';
import { Trophy, Bell } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

// Configuration Notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.AUTH);
  const [profileVisible, setProfileVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  
  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings & Theme
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userSettings, setUserSettings] = useState<any>(null);

  // Focus specific prop logic
  const [startFocusMinutes, setStartFocusMinutes] = useState<number | null>(null);

  // Level Up State
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

  // --- NOTIFICATION SYSTEM (In-App & Local) ---
  useEffect(() => {
      registerForPushNotificationsAsync();
      
      const interval = setInterval(() => {
          checkNotifications();
      }, 60000);
      return () => clearInterval(interval);
  }, [tasks]);

  const registerForPushNotificationsAsync = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
  };

  const checkNotifications = async () => {
      if (userSettings && !userSettings.notifications_enabled) return;

      const now = new Date();
      
      tasks.forEach(task => {
          if (!task.completed && task.due_date) {
              const due = new Date(task.due_date);
              const diff = due.getTime() - now.getTime();
              // Alert 30 mins before
              if (diff > 0 && diff < 30 * 60 * 1000) {
                  Notifications.scheduleNotificationAsync({
                      content: {
                          title: "Rappel Tâche 📅",
                          body: `"${task.title}" arrive à échéance dans moins de 30 min !`,
                      },
                      trigger: null, // Send immediately
                  });
              }
          }
      });
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
        setupRealtimeSubscription(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
        setupRealtimeSubscription(session.user.id);
      } else {
        setUser(null);
        setPlayer(null);
        setCurrentView(ViewState.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- REALTIME ---
  const setupRealtimeSubscription = (userId: string) => {
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => fetchTasks(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks', filter: `user_id=eq.${userId}` }, () => fetchTasks(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => fetchHabits(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions', filter: `user_id=eq.${userId}` }, () => fetchHabits(userId)) 
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` }, () => fetchGoals(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings', filter: `id=eq.${userId}` }, () => fetchSettings(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_profiles', filter: `user_id=eq.${userId}` }, () => fetchPlayer(userId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // --- FETCHERS ---
  const fetchTasks = async (userId: string) => {
    const { data } = await supabase
        .from('tasks')
        .select('*, subtasks(*)')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
    
    if (data) {
        const sortedData = data.map(t => ({
            ...t,
            subtasks: t.subtasks?.sort((a: any, b: any) => a.sort_order - b.sort_order)
        }));
        setTasks(sortedData);
    }
  };

  const fetchGoals = async (userId: string) => {
    const { data } = await supabase
        .from('goals')
        .select('*, subobjectives(*)')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });
    
    if (data) {
         const sortedData = data.map(g => ({
            ...g,
            subobjectives: g.subobjectives?.sort((a: any, b: any) => a.sort_order - b.sort_order)
        }));
        setGoals(sortedData);
    }
  };

  const fetchHabits = async (userId: string) => {
    const { data } = await supabase.from('habits').select('*').eq('user_id', userId).order('sort_order').order('created_at', { ascending: true });
    if (data) setHabits(data);
  };

  const fetchQuests = async (userId: string) => {
      const { data } = await supabase.from('quests').select('*').eq('user_id', userId).eq('completed', false);
      if (data) setQuests(data);
  };

  const fetchSettings = async (userId: string) => {
      const { data } = await supabase.from('user_settings').select('*').eq('id', userId).single();
      if (data) {
          setUserSettings(data);
          setIsDarkMode(data.theme === 'dark');
      }
  };

  const fetchPlayer = async (userId: string) => {
    const { data } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
    if (data) {
        if (prevLevelRef.current !== null && data.level > prevLevelRef.current) {
            setShowLevelUp(true);
        }
        prevLevelRef.current = data.level;
        setPlayer(data);
    }
  };

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      if (userData) setUser(userData);
      
      await Promise.all([
          fetchPlayer(userId),
          fetchSettings(userId),
          fetchTasks(userId),
          fetchHabits(userId),
          fetchGoals(userId),
          fetchQuests(userId)
      ]);

      setCurrentView(ViewState.TODAY);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setProfileVisible(false);
    setSidebarVisible(false);
    await supabase.auth.signOut();
  };

  // --- ACTIONS (PASSED TO AI & UI) ---
  const aiAddTask = async (title: string, priority: string) => {
      const max = tasks.length > 0 ? Math.max(...tasks.map(x=>x.sort_order)) : 0;
      await supabase.from('tasks').insert({
          user_id: user?.id,
          title,
          priority: priority as any,
          completed: false,
          sort_order: max + 1
      });
      fetchTasks(user!.id);
  };

  const aiAddHabit = async (title: string) => {
      const max = habits.length > 0 ? Math.max(...habits.map(x=>x.sort_order || 0)) : 0;
      await supabase.from('habits').insert({
          user_id: user?.id,
          title,
          frequency: 'daily',
          target: 1,
          streak: 0,
          sort_order: max + 1
      });
      fetchHabits(user!.id);
  };

  const aiAddGoal = async (title: string) => {
      const max = goals.length > 0 ? Math.max(...goals.map(x=>x.sort_order)) : 0;
      await supabase.from('goals').insert({
          user_id: user?.id,
          title,
          completed: false,
          sort_order: max + 1
      });
      fetchGoals(user!.id);
  };

  const aiStartFocus = (minutes: number) => {
      setCurrentView(ViewState.FOCUS_MODE);
  };

  // --- TOGGLES WITH OPTIMISTIC UPDATES ---
  const toggleHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit || !player || !user) return;

      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();
      const isAlreadyDone = habit.last_completed_at && habit.last_completed_at.startsWith(today);

      // Optimistic Update
      const newHabits = habits.map(h => {
          if (h.id === id) {
              if (isAlreadyDone) {
                  // Undo
                  return { ...h, streak: Math.max(0, h.streak - 1), last_completed_at: null }; // UI trick: null makes it undone
              } else {
                  // Do
                  return { ...h, streak: h.streak + 1, last_completed_at: nowIso };
              }
          }
          return h;
      });
      setHabits(newHabits);

      if (isAlreadyDone) {
          // DELETE COMPLETION
          await supabase.from('habit_completions')
            .delete()
            .eq('habit_id', id)
            .eq('completed_date', today);
          
          await supabase.from('habits')
            .update({ streak: Math.max(0, habit.streak - 1), last_completed_at: null }) // We can't easily know previous last_completed_at without query, so null is safer visually or handle logic deeper
            .eq('id', id);
            
          // On pourrait retirer de l'XP ici, mais c'est punitif. On laisse l'XP acquise.
      } else {
          // ADD COMPLETION
          await supabase.from('habit_completions').insert({
              habit_id: id,
              user_id: user.id,
              completed_date: today
          });
          
          await supabase.from('habits')
            .update({ streak: habit.streak + 1, last_completed_at: nowIso })
            .eq('id', id);
          
          const { addXp, REWARDS } = await import('./services/gamification');
          await addXp(user.id, REWARDS.HABIT, player);
      }
      
      // Refresh to ensure server sync state (especially for correct previous date if undone)
      setTimeout(() => fetchHabits(user.id), 500); 
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const newStatus = !task.completed;
    
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));

    await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
    
    if (newStatus && player && user) {
        const { addXp, REWARDS } = await import('./services/gamification');
        const reward = task.priority === 'high' ? REWARDS.TASK_HIGH : REWARDS.TASK_MEDIUM;
        await addXp(user.id, reward, player);
    }
  };

  const toggleGoal = async (id: string) => {
     const goal = goals.find(g => g.id === id);
     if (!goal) return;
     
     const newStatus = !goal.completed;
     
     // Optimistic Update
     setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: newStatus } : g));

     await supabase.from('goals').update({ completed: newStatus }).eq('id', id);
     
     if (newStatus && player && user) {
         const { addXp, REWARDS } = await import('./services/gamification');
         await addXp(user.id, REWARDS.GOAL, player);
     }
  };

  // --- RENDER ---
  const renderView = () => {
    if (loading) return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }}>
            <ActivityIndicator size="large" color={isDarkMode ? '#FFF' : '#000'} />
        </View>
    );

    if (!session || !user || !player) return <Auth onLogin={() => fetchData(session?.user?.id)} />;

    const commonProps = { isDarkMode };

    switch (currentView) {
      case ViewState.TODAY:
        return (
            <Dashboard 
                user={user} player={player} tasks={tasks} habits={habits}
                toggleHabit={toggleHabit} toggleTask={toggleTask}
                openFocus={() => setCurrentView(ViewState.FOCUS_MODE)}
                openMenu={() => setSidebarVisible(true)}
                openProfile={() => setProfileVisible(true)}
                setView={setCurrentView}
                {...commonProps}
            />
        );
      case ViewState.TASKS: 
          return (
            <Tasks 
                tasks={tasks} goals={goals} 
                toggleTask={toggleTask} 
                addTask={async (t, p, g) => {}} 
                deleteTask={async (id) => await supabase.from('tasks').delete().eq('id', id)} 
                userId={user.id} 
                refreshTasks={() => fetchTasks(user.id)} 
                openMenu={() => setSidebarVisible(true)}
                {...commonProps}
            />
          );
      case ViewState.HABITS: 
          return (
            <Habits 
                habits={habits} goals={goals} 
                incrementHabit={toggleHabit} 
                userId={user.id} 
                refreshHabits={() => fetchHabits(user.id)}
                openMenu={() => setSidebarVisible(true)}
                {...commonProps}
            />
          );
      case ViewState.GOALS:
          return (
             <Goals 
                goals={goals} 
                toggleGoal={toggleGoal}
                addGoal={aiAddGoal}
                deleteGoal={async (id) => await supabase.from('goals').delete().eq('id', id)}
                userId={user.id}
                refreshGoals={() => fetchGoals(user.id)}
                openMenu={() => setSidebarVisible(true)}
                {...commonProps}
             />
          );
      case ViewState.GROWTH:
        return (
            <Growth 
                player={player} user={user} tasks={tasks} 
                openMenu={() => setSidebarVisible(true)} 
                openProfile={() => setProfileVisible(true)}
                onAddTask={aiAddTask}
                onAddHabit={aiAddHabit}
                onAddGoal={aiAddGoal}
                onStartFocus={aiStartFocus}
                {...commonProps}
            />
        );
      case ViewState.CYBER_KNIGHT:
        return <CyberKnight player={player} user={user} quests={quests} openMenu={() => setSidebarVisible(true)} openProfile={() => setProfileVisible(true)} {...commonProps} />;
      case ViewState.REFLECTION:
        return <ReflectionPage userId={user.id} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.CALENDAR:
        return <CalendarPage tasks={tasks} habits={habits} toggleTask={toggleTask} toggleHabit={toggleHabit} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.FOCUS_MODE:
        return <Focus onExit={() => setCurrentView(ViewState.TODAY)} tasks={tasks} isDarkMode={isDarkMode} />;
      case ViewState.JOURNAL:
        return <Journal userId={user.id} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      default:
        return (
            <Dashboard 
                user={user} player={player} tasks={tasks} habits={habits}
                toggleHabit={toggleHabit} toggleTask={toggleTask}
                openFocus={() => setCurrentView(ViewState.FOCUS_MODE)}
                openMenu={() => setSidebarVisible(true)}
                openProfile={() => setProfileVisible(true)}
                setView={setCurrentView}
                {...commonProps}
            />
        );
    }
  };

  const isFocusMode = currentView === ViewState.FOCUS_MODE;
  const bgStyle = { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' };

  return (
    <SafeAreaProvider>
        <SafeAreaView style={[{ flex: 1 }, bgStyle]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#000000" : "#F2F2F7"} />
        <View style={{ flex: 1 }}>
            {renderView()}
            
            <Sidebar 
                visible={sidebarVisible} 
                onClose={() => setSidebarVisible(false)}
                user={user}
                setView={setCurrentView}
                currentView={currentView}
                onLogout={handleLogout}
            />

            {user && player && (
                <Profile 
                    visible={profileVisible} 
                    onClose={() => { setProfileVisible(false); fetchSettings(user.id); }} 
                    user={user} player={player} logout={handleLogout} 
                />
            )}

            {session && user && !isFocusMode && (
                <BottomNav currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} />
            )}

            {/* LEVEL UP MODAL */}
            <Modal visible={showLevelUp} transparent animationType="fade">
                <View style={styles.levelUpOverlay}>
                    <View style={styles.levelUpCard}>
                        <Trophy size={60} color="#FACC15" style={{marginBottom: 20}} />
                        <Text style={styles.levelUpTitle}>NIVEAU SUPÉRIEUR !</Text>
                        <Text style={styles.levelUpSub}>
                            Félicitations, vous avez atteint le niveau <Text style={{color: '#C4B5FD', fontWeight: 'bold'}}>{player?.level}</Text>.
                        </Text>
                        <TouchableOpacity style={styles.claimBtn} onPress={() => setShowLevelUp(false)}>
                            <Text style={styles.claimBtnText}>CONTINUER</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
        </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    levelUpOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelUpCard: {
        width: '80%',
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C4B5FD',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    levelUpTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    levelUpSub: {
        color: '#DDD',
        textAlign: 'center',
        marginBottom: 30,
        fontSize: 16,
    },
    claimBtn: {
        backgroundColor: '#C4B5FD',
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 30,
    },
    claimBtnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default App;