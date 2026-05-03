import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StatusBar, Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import { ViewState, UserProfile, Task, Habit, Goal, Subtask, SubObjective, FocusSession } from './types';
import Dashboard from './pages/Dashboard';
import Focus from './pages/Focus';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Goals from './pages/Goals';
import Planning from './pages/Planning';
import AI from './pages/AI';
import Introspection from './pages/Introspection';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import SkeletonDashboard from './components/SkeletonDashboard';
import { supabase } from './services/supabase';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as NavigationBar from 'expo-navigation-bar';
import { saveToCache, loadFromCache, addToQueue, processQueue, getQueueSize, CACHE_KEYS, generateId, clearCache } from './services/offline';
import { isAdmin } from './services/admin';
import { computeProductivityScore } from './services/productivity';
import Animated, { FadeIn } from 'react-native-reanimated';

// Configuration Notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.AUTH);
  const [profileVisible, setProfileVisible] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  
  // States
  const [checkingOnboarding, setCheckingOnboarding] = useState(true); 
  
  // undefined = session en cours de chargement, null = non connecté.
  const [session, setSession] = useState<any | null | undefined>(undefined);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  
  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [reflections, setReflections] = useState<any[]>([]);

  const productivityScore = useMemo(() => {
    return computeProductivityScore({
      tasks,
      habits,
      goals,
      focusSessions,
      journalEntries,
      reflections,
    });
  }, [tasks, habits, goals, focusSessions, journalEntries, reflections]);
  
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'SYNCING' | 'OFFLINE_PENDING'>('SYNCED');
  
  // Settings & Theme
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const realtimeChannel = useRef<RealtimeChannel | null>(null);
  const appState = useRef(AppState.currentState);
  const realtimeRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRealtimeRefresh = (userId: string) => {
      if (realtimeRefreshDebounceRef.current) {
          clearTimeout(realtimeRefreshDebounceRef.current);
      }
      realtimeRefreshDebounceRef.current = setTimeout(() => {
          fetchData(userId);
      }, 250);
  };

  // --- SYSTEM & OFFLINE INIT ---
  useEffect(() => {
      const initSystem = async () => {
          if (Platform.OS === 'android') {
              await NavigationBar.setBackgroundColorAsync(isDarkMode ? '#000000' : '#F2F2F7');
              await NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
          }
          await registerForPushNotificationsAsync();
      };
      
      // 1. Charger le cache immédiatement (Offline First)
      loadOfflineData().then(() => {
          setLoading(false); // Affiche l'UI avec les données en cache
          checkOnboarding(); // Puis vérifie l'auth
      });

      initSystem();

      // Listen for app coming to foreground to trigger sync
      const subscription = AppState.addEventListener('change', nextAppState => {
          if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
              if (session?.user?.id) runFullSync(session.user.id);
          }
          appState.current = nextAppState;
      });

      return () => {
          subscription.remove();
          if (realtimeRefreshDebounceRef.current) {
              clearTimeout(realtimeRefreshDebounceRef.current);
          }
      };
  }, []);

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
  };

  const loadOfflineData = async () => {
      const [cachedTasks, cachedHabits, cachedGoals, cachedUser] = await Promise.all([
          loadFromCache(CACHE_KEYS.TASKS),
          loadFromCache(CACHE_KEYS.HABITS),
          loadFromCache(CACHE_KEYS.GOALS),
          loadFromCache(CACHE_KEYS.USER)
      ]);

      if (cachedTasks) setTasks(cachedTasks);
      if (cachedHabits) setHabits(cachedHabits);
      if (cachedGoals) setGoals(cachedGoals);
      if (cachedUser) setUser(cachedUser);
      
      // Check if we have pending items from last run
      const qSize = await getQueueSize();
      if (qSize > 0) setSyncStatus('OFFLINE_PENDING');
  };

  const runFullSync = async (userId: string) => {
      setSyncStatus('SYNCING');
      try {
          // 1. Upload pending changes first (Priority to local changes)
          const remaining = await processQueue();
          
          if (remaining > 0) {
              console.warn("Queue not empty, but attempting fetch.");
          }
          
          // 2. Download fresh data
          await fetchData(userId);
          
          setSyncStatus('SYNCED');
          
      } catch (e) {
          console.log("Sync failed (likely network)", e);
          setSyncStatus('OFFLINE_PENDING');
      }
  };

  const checkOnboarding = async () => {
      try {
          const hasOnboarded = await AsyncStorage.getItem('has_onboarded');
          if (hasOnboarded === 'true') {
              setCheckingOnboarding(false);
              initAuth();
          } else {
              setCurrentView(ViewState.ONBOARDING);
              setCheckingOnboarding(false);
          }
      } catch (e) {
          console.error("Storage error", e);
          initAuth();
      }
  };

  const finishOnboarding = async () => {
      try {
          await AsyncStorage.setItem('has_onboarded', 'true');
          setCurrentView(ViewState.AUTH);
          setCheckingOnboarding(false); 
          initAuth();
      } catch (e) {
          console.error("Failed to save onboarding status", e);
          initAuth();
      }
  };

  const initAuth = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          runFullSync(session.user.id);
          setupRealtimeSubscription(session.user.id);
        } else {
          setCurrentView(ViewState.AUTH);
        }
      });
  };

  useEffect(() => {
    if (checkingOnboarding) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        runFullSync(session.user.id);
        setupRealtimeSubscription(session.user.id);
      } else {
        setUser(null);
        if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
        setCurrentView(ViewState.AUTH);
      }
    });

    return () => {
        subscription.unsubscribe();
        if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
    };
  }, [checkingOnboarding]);

  const setupRealtimeSubscription = (userId: string) => {
      if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
      const channel = supabase.channel('db_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => scheduleRealtimeRefresh(userId))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => scheduleRealtimeRefresh(userId))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions', filter: `user_id=eq.${userId}` }, () => scheduleRealtimeRefresh(userId)) // Listen for focus
          .subscribe((status) => {
              if (status === 'CHANNEL_ERROR') {
                  console.warn("Realtime channel error");
              }
          });
      realtimeChannel.current = channel;
  };

  const fetchData = async (userId: string) => {
    try {
      let { data: userData, error: userError } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      
      if (!userData && !userError) {
          const { data: authUser } = await supabase.auth.getUser();
          const email = authUser?.user?.email;
          const { data: newProfile } = await supabase.from('user_profiles').insert({
              id: userId, email: email, display_name: email?.split('@')[0] || 'Voyageur'
          }).select().single();
          userData = newProfile;
      }
      
      if (userData) {
          setUser(userData);
          saveToCache(CACHE_KEYS.USER, userData);
          isAdmin(userId).then(setUserIsAdmin);
      }

      const { data: settingsData } = await supabase.from('user_settings').select('theme').eq('id', userId).single();
      if (settingsData && settingsData.theme) setIsDarkMode(settingsData.theme === 'dark');

      const [tasksRes, habitsRes, goalsRes, focusRes, journalRes, reflectionRes] = await Promise.all([
          supabase.from('tasks').select('*, subtasks(*)').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('goals').select('*, subobjectives(*)').eq('user_id', userId),
          supabase.from('focus_sessions').select('*').eq('user_id', userId),
          supabase.from('journal_entries').select('created_at').eq('user_id', userId),
          supabase.from('daily_reflections').select('created_at').eq('user_id', userId)
      ]);

      if (tasksRes.data) {
          setTasks(tasksRes.data);
          saveToCache(CACHE_KEYS.TASKS, tasksRes.data);
      }
      if (habitsRes.data) {
          setHabits(habitsRes.data);
          saveToCache(CACHE_KEYS.HABITS, habitsRes.data);
      }
      if (goalsRes.data) {
          setGoals(goalsRes.data);
          saveToCache(CACHE_KEYS.GOALS, goalsRes.data);
      }
      if (focusRes.data) {
          setFocusSessions(focusRes.data);
      }
      if (journalRes.data) {
          setJournalEntries(journalRes.data);
      }
      if (reflectionRes.data) {
          setReflections(reflectionRes.data);
      }

      const savedSession = await AsyncStorage.getItem('active_focus_session');
      if (savedSession) {
          setCurrentView(ViewState.FOCUS_MODE);
      } else if (currentView === ViewState.AUTH && !checkingOnboarding) {
          setCurrentView(ViewState.TODAY);
      }

    } catch (error) {
      console.log("Fetch error:", error);
    }
  };

  const handleLogout = async () => {
    if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
    setProfileVisible(false);
    setIsSidebarVisible(false);
    await clearCache();
    await supabase.auth.signOut();
  };

  const queueAction = async (action: any) => {
      setSyncStatus('OFFLINE_PENDING'); 
      await addToQueue(action);
  };

  // --- CRUD ACTIONS (Same as before) ---
  const createTask = async (title: string, priority: any, goalId?: string, dueDate?: string, description?: string) => {
      if (!user) return;
      const newTask: Task = {
          id: generateId(), user_id: user.id, title, description: description || null, priority, linked_goal_id: goalId, due_date: dueDate || null, completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), synced_at: null, offline_id: generateId(), google_task_id: null, sort_order: 0, subtasks: []
      };
      
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      saveToCache(CACHE_KEYS.TASKS, updatedTasks);
      
      const { subtasks, ...taskDbPayload } = newTask;
      
      try { 
          const { error } = await supabase.from('tasks').insert(taskDbPayload); 
          if (error) throw error; 
      } catch (e) { 
          queueAction({ type: 'INSERT', table: 'tasks', payload: taskDbPayload }); 
      }
  };

  const createHabit = async (habitData: any) => {
      if (!user) return;
      const newHabit: Habit = {
          id: generateId(), user_id: user.id, title: habitData.title, streak: 0, target: habitData.target || 1, frequency: habitData.frequency || 'daily', created_at: new Date().toISOString(), ...habitData
      };
      const updatedHabits = [...habits, newHabit];
      setHabits(updatedHabits);
      saveToCache(CACHE_KEYS.HABITS, updatedHabits);
      try { const { error } = await supabase.from('habits').insert(newHabit); if (error) throw error; } catch (e) { queueAction({ type: 'INSERT', table: 'habits', payload: newHabit }); }
  };

  const createGoal = async (title: string) => {
      if (!user) return;
      const newGoal: Goal = {
          id: generateId(), user_id: user.id, title, description: null, completed: false, target_date: null, progress: 0, sort_order: 0, created_at: new Date().toISOString()
      };
      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      saveToCache(CACHE_KEYS.GOALS, updatedGoals);

      const { subobjectives, ...goalDbPayload } = newGoal;
      try { const { error } = await supabase.from('goals').insert(goalDbPayload); if (error) throw error; } catch (e) { queueAction({ type: 'INSERT', table: 'goals', payload: goalDbPayload }); }
  };

  const toggleTask = async (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const isCompleting = !task.completed;
      const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: isCompleting } : t);
      setTasks(updatedTasks);
      saveToCache(CACHE_KEYS.TASKS, updatedTasks);

      try { const { error } = await supabase.from('tasks').update({ completed: isCompleting, synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error; } catch (e) { queueAction({ type: 'UPDATE', table: 'tasks', payload: { id, completed: isCompleting, synced_at: new Date().toISOString(), updated_at: new Date().toISOString() } }); }
  };

  const toggleHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;
      const now = new Date();

      const getLocalDateString = (date: Date) => {
          const offset = date.getTimezoneOffset();
          const localDate = new Date(date.getTime() - (offset * 60 * 1000));
          return localDate.toISOString().split('T')[0];
      };

      const todayStr = getLocalDateString(now);
      const lastCompletedStr = habit.last_completed_at ? getLocalDateString(new Date(habit.last_completed_at)) : null;

      const isDoneToday = lastCompletedStr === todayStr;

      if (isDoneToday) {
          // UNCHECK
          const newStreak = Math.max(0, habit.streak - 1);
          const updatedHabits = habits.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: null } : h);
          setHabits(updatedHabits);
          saveToCache(CACHE_KEYS.HABITS, updatedHabits);

          try {
              await supabase.from('habits').update({ streak: newStreak, last_completed_at: null }).eq('id', id);
              await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completed_date', todayStr);
          } catch (e) {
              queueAction({ type: 'UPDATE', table: 'habits', payload: { id, streak: newStreak, last_completed_at: null } });
              // Note: deletion by complex filter not fully supported in offline queue yet, but we'll try to find a way or leave it for online
          }
      } else {
          // CHECK
          const newStreak = habit.streak + 1;
          const updatedHabits = habits.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: now.toISOString() } : h);
          setHabits(updatedHabits);
          saveToCache(CACHE_KEYS.HABITS, updatedHabits);

          try {
              await supabase.from('habits').update({ streak: newStreak, last_completed_at: now.toISOString() }).eq('id', id);
              await supabase.from('habit_completions').insert({ user_id: user?.id, habit_id: id, completed_date: todayStr });
          } catch (e) {
              queueAction({ type: 'UPDATE', table: 'habits', payload: { id, streak: newStreak, last_completed_at: now.toISOString() } });
              queueAction({ type: 'INSERT', table: 'habit_completions', payload: { user_id: user?.id, habit_id: id, completed_date: todayStr } });
          }
      }
  };

  const deleteTask = async (id: string) => {
      const updatedTasks = tasks.filter(t => t.id !== id);
      setTasks(updatedTasks);
      saveToCache(CACHE_KEYS.TASKS, updatedTasks);
      try { await supabase.from('tasks').delete().eq('id', id); } catch (e) { queueAction({ type: 'DELETE', table: 'tasks', payload: { id } }); }
  };

  const deleteHabit = async (id: string) => {
      const updatedHabits = habits.filter(h => h.id !== id);
      setHabits(updatedHabits);
      saveToCache(CACHE_KEYS.HABITS, updatedHabits);
      try { await supabase.from('habits').delete().eq('id', id); } catch (e) { queueAction({ type: 'DELETE', table: 'habits', payload: { id } }); }
  };

  const archiveHabit = async (habit: Habit) => {
      const isArchiving = !habit.is_archived;
      const updatedHabits = habits.map(h => h.id === habit.id ? { ...h, is_archived: isArchiving } : h);
      setHabits(updatedHabits);
      saveToCache(CACHE_KEYS.HABITS, updatedHabits);
      try {
          await supabase.from('habits').update({ is_archived: isArchiving }).eq('id', habit.id);
      } catch (e) {
          queueAction({ type: 'UPDATE', table: 'habits', payload: { id: habit.id, is_archived: isArchiving } });
      }
  };

  // ... (Other CRUD actions: createSubtask, toggleSubtask, deleteSubtask, deleteGoal, createSubObjective, etc. kept same) ...
  const createSubtask = async (taskId: string, title: string) => { if (!user) return; const newSub: Subtask = { id: generateId(), parent_task_id: taskId, user_id: user.id, title: title, description: null, priority: 'medium', completed: false, sort_order: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), newSub] } : t); setTasks(updatedTasks); saveToCache(CACHE_KEYS.TASKS, updatedTasks); try { await supabase.from('subtasks').insert(newSub); } catch (e) { queueAction({ type: 'INSERT', table: 'subtasks', payload: newSub }); } };
  const toggleSubtask = async (subId: string, taskId: string) => { const task = tasks.find(t => t.id === taskId); const sub = task?.subtasks?.find(s => s.id === subId); if (sub) { const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks?.map(s => s.id === subId ? { ...s, completed: !s.completed } : s) } : t); setTasks(updatedTasks); saveToCache(CACHE_KEYS.TASKS, updatedTasks); try { await supabase.from('subtasks').update({ completed: !sub.completed }).eq('id', subId); } catch (e) { queueAction({ type: 'UPDATE', table: 'subtasks', payload: { id: subId, completed: !sub.completed } }); } } };
  const deleteSubtask = async (subId: string, taskId: string) => { const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks?.filter(s => s.id !== subId) } : t); setTasks(updatedTasks); saveToCache(CACHE_KEYS.TASKS, updatedTasks); try { await supabase.from('subtasks').delete().eq('id', subId); } catch (e) { queueAction({ type: 'DELETE', table: 'subtasks', payload: { id: subId } }); } };
  const deleteGoal = async (id: string) => { const updatedGoals = goals.filter(g => g.id !== id); setGoals(updatedGoals); saveToCache(CACHE_KEYS.GOALS, updatedGoals); try { await supabase.from('goals').delete().eq('id', id); } catch (e) { queueAction({ type: 'DELETE', table: 'goals', payload: { id } }); } };
  const createSubObjective = async (goalId: string, title: string) => { if (!user) return; const newSub: SubObjective = { id: generateId(), parent_goal_id: goalId, user_id: user.id, title, completed: false, sort_order: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; const updatedGoals = goals.map(g => g.id === goalId ? { ...g, subobjectives: [...(g.subobjectives || []), newSub] } : g); setGoals(updatedGoals); saveToCache(CACHE_KEYS.GOALS, updatedGoals); try { await supabase.from('subobjectives').insert(newSub); } catch (e) { queueAction({ type: 'INSERT', table: 'subobjectives', payload: newSub }); } };
  const toggleSubObjective = async (subId: string, goalId: string) => { const goal = goals.find(g => g.id === goalId); const sub = goal?.subobjectives?.find(s => s.id === subId); if (sub) { const updatedGoals = goals.map(g => g.id === goalId ? { ...g, subobjectives: g.subobjectives?.map(s => s.id === subId ? { ...s, completed: !s.completed } : s) } : g); setGoals(updatedGoals); saveToCache(CACHE_KEYS.GOALS, updatedGoals); try { await supabase.from('subobjectives').update({ completed: !sub.completed }).eq('id', subId); } catch (e) { queueAction({ type: 'UPDATE', table: 'subobjectives', payload: { id: subId, completed: !sub.completed } }); } } };
  const deleteSubObjective = async (subId: string, goalId: string) => { const updatedGoals = goals.map(g => g.id === goalId ? { ...g, subobjectives: g.subobjectives?.filter(s => s.id !== subId) } : g); setGoals(updatedGoals); saveToCache(CACHE_KEYS.GOALS, updatedGoals); try { await supabase.from('subobjectives').delete().eq('id', subId); } catch (e) { queueAction({ type: 'DELETE', table: 'subobjectives', payload: { id: subId } }); } };
  const deleteJournalEntry = async (id: string) => { try { await supabase.from('journal_entries').delete().eq('id', id); } catch(e) { console.error("Delete journal error", e); } };
  const deleteReflection = async (id: string) => { try { await supabase.from('daily_reflections').delete().eq('id', id); } catch(e) { console.error("Delete reflection error", e); } };
  const aiStartFocus = (m: number) => setCurrentView(ViewState.FOCUS_MODE);

  const renderContent = () => {
    if (checkingOnboarding || loading) return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }}>
            <SkeletonDashboard />
        </View>
    );

    if (currentView === ViewState.ONBOARDING) return <Onboarding onFinish={finishOnboarding} />;
    if (session === undefined) return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }}>
            <SkeletonDashboard />
        </View>
    );

    if (!session || !user) return <Auth onLogin={() => fetchData(session?.user?.id)} />;

    const commonProps = { isDarkMode };
    const openMenuHandler = () => setIsSidebarVisible(true);
    
    let Content = null;

    switch (currentView) {
      case ViewState.TODAY:
        Content = <Dashboard user={user} tasks={tasks} habits={habits} goals={goals} focusSessions={focusSessions} journalEntries={journalEntries} reflections={reflections} productivityScore={productivityScore} toggleHabit={toggleHabit} toggleTask={toggleTask} openFocus={() => setCurrentView(ViewState.FOCUS_MODE)} openProfile={() => setProfileVisible(true)} setView={setCurrentView} syncStatus={syncStatus} openMenu={openMenuHandler} {...commonProps} />;
        break;
      case ViewState.PLANNING:
        Content = <Planning
          tasks={tasks}
          habits={habits}
          goals={goals}
          toggleTask={toggleTask}
          addTask={createTask}
          deleteTask={deleteTask}
          createSubtask={createSubtask}
          toggleSubtask={toggleSubtask}
          deleteSubtask={deleteSubtask}
          toggleHabit={toggleHabit}
          createHabit={createHabit}
          archiveHabit={archiveHabit}
          deleteHabit={deleteHabit}
          toggleGoal={()=>{}}
          addGoal={createGoal}
          deleteGoal={deleteGoal}
          createSubObjective={createSubObjective}
          toggleSubObjective={toggleSubObjective}
          deleteSubObjective={deleteSubObjective}
          userId={user.id}
          refreshGoals={() => fetchData(user.id)}
          refreshTasks={() => fetchData(user.id)}
          refreshHabits={() => fetchData(user.id)}
          openMenu={openMenuHandler}
          isDarkMode={isDarkMode}
        />;
        break;
      case ViewState.INTROSPECTION:
        Content = <Introspection userId={user.id} openMenu={openMenuHandler} isDarkMode={isDarkMode} deleteJournalEntry={deleteJournalEntry} deleteReflection={deleteReflection} />;
        break;
      case ViewState.ADMIN:
        Content = <Admin />;
        break;
      case ViewState.TASKS: 
          Content = <Tasks tasks={tasks} goals={goals} toggleTask={toggleTask} addTask={createTask} deleteTask={deleteTask} createSubtask={createSubtask} toggleSubtask={toggleSubtask} deleteSubtask={deleteSubtask} userId={user.id} refreshTasks={() => fetchData(user.id)} openMenu={openMenuHandler} {...commonProps} />;
          break;
      case ViewState.HABITS: 
          Content = <Habits habits={habits} goals={goals} incrementHabit={toggleHabit} userId={user.id} createHabit={createHabit} archiveHabit={archiveHabit} deleteHabit={deleteHabit} refreshHabits={() => fetchData(user.id)} openMenu={openMenuHandler} {...commonProps} />;
          break;
      case ViewState.GOALS:
          Content = <Goals goals={goals} toggleGoal={()=>{}} addGoal={createGoal} deleteGoal={deleteGoal} createSubObjective={createSubObjective} toggleSubObjective={toggleSubObjective} deleteSubObjective={deleteSubObjective} userId={user.id} refreshGoals={() => fetchData(user.id)} openMenu={openMenuHandler} isDarkMode={isDarkMode} />;
          break;
      case ViewState.FOCUS_MODE:
        Content = <Focus onExit={() => setCurrentView(ViewState.TODAY)} tasks={tasks} isDarkMode={isDarkMode} openMenu={openMenuHandler} />;
        break;
      case ViewState.JOURNAL:
        Content = <Introspection userId={user.id} openMenu={openMenuHandler} isDarkMode={isDarkMode} deleteJournalEntry={deleteJournalEntry} deleteReflection={deleteReflection} />;
        break;
      case ViewState.REFLECTION:
        Content = <Introspection userId={user.id} openMenu={openMenuHandler} isDarkMode={isDarkMode} deleteJournalEntry={deleteJournalEntry} deleteReflection={deleteReflection} />;
        break;
      case ViewState.AI:
        Content = <AI
          user={user}
          tasks={tasks}
          habits={habits}
          goals={goals}
          focusSessions={focusSessions}
          journalEntries={journalEntries}
          reflections={reflections}
          productivityScore={productivityScore}
          isDarkMode={isDarkMode}
          onActionGenerated={(action) => {
              if (action.action === 'CREATE_TASK') createTask(action.data.title, action.data.priority);
              if (action.action === 'CREATE_HABIT') createHabit(action.data);
              if (action.action === 'CREATE_GOAL') createGoal(action.data.title);
          }}
        />;
        break;
      default:
        Content = <Dashboard user={user} tasks={tasks} habits={habits} goals={goals} focusSessions={focusSessions} toggleHabit={toggleHabit} toggleTask={toggleTask} openFocus={() => setCurrentView(ViewState.FOCUS_MODE)} openProfile={() => setProfileVisible(true)} setView={setCurrentView} syncStatus={syncStatus} openMenu={openMenuHandler} {...commonProps} />;
    }

    const bgStyle = { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' };

    return (
        <View style={[{ flex: 1 }, bgStyle]}>
            <StatusBar 
                barStyle={isDarkMode ? "light-content" : "dark-content"} 
                backgroundColor="transparent" 
                translucent={true} 
            />
            
            <View style={{ flex: 1 }}>
                <Animated.View 
                    key={currentView} 
                    entering={FadeIn.duration(200)}
                    style={{flex: 1}}
                >
                    {Content}
                </Animated.View>
                

                {user && (
                    <>
                        <Sidebar 
                            visible={isSidebarVisible} 
                            onClose={() => setIsSidebarVisible(false)} 
                            user={user} 
                            isAdmin={userIsAdmin}
                            setView={setCurrentView} 
                            currentView={currentView} 
                            onLogout={handleLogout}
                        />
                        <Profile 
                            visible={profileVisible} 
                            onClose={() => setProfileVisible(false)} 
                            user={user} logout={handleLogout}
                            onThemeChange={setIsDarkMode}
                            onUserUpdate={(updatedUser) => {
                                setUser(updatedUser);
                                saveToCache(CACHE_KEYS.USER, updatedUser);
                            }}
                            isAdmin={userIsAdmin}
                            setView={setCurrentView}
                        />
                        {session && (
                            <BottomNav isAdmin={userIsAdmin} currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} />
                        )}
                    </>
                )}
            </View>
        </View>
    );
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {renderContent()}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default App;
