
import React, { useState, useEffect, useRef } from 'react';
import { View, StatusBar, Platform, Alert, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomNav from './components/BottomNav';
import LevelUpModal from './components/LevelUpModal';
import { ViewState, UserProfile, PlayerProfile, Task, Habit, Goal, Quest, Subtask, SubObjective } from './types';
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
import Planning from './pages/Planning';
import Introspection from './pages/Introspection';
import Evolution from './pages/Evolution';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import SkeletonDashboard from './components/SkeletonDashboard';
import { supabase } from './services/supabase';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as NavigationBar from 'expo-navigation-bar';
import { saveToCache, loadFromCache, addToQueue, processQueue, getQueueSize, CACHE_KEYS, generateId } from './services/offline';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

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
  
  // States
  const [checkingOnboarding, setCheckingOnboarding] = useState(true); 
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const previousLevelRef = useRef<number>(1);
  
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  
  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'SYNCING' | 'OFFLINE_PENDING'>('SYNCED');
  
  // Settings & Theme
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const realtimeChannel = useRef<RealtimeChannel | null>(null);
  const appState = useRef(AppState.currentState);

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
              console.log('App has come to the foreground! Syncing...');
              if (session?.user?.id) runFullSync(session.user.id);
          }
          appState.current = nextAppState;
      });

      return () => {
          subscription.remove();
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
  };

  const loadOfflineData = async () => {
      const [cachedTasks, cachedHabits, cachedGoals, cachedUser, cachedPlayer] = await Promise.all([
          loadFromCache(CACHE_KEYS.TASKS),
          loadFromCache(CACHE_KEYS.HABITS),
          loadFromCache(CACHE_KEYS.GOALS),
          loadFromCache(CACHE_KEYS.USER),
          loadFromCache(CACHE_KEYS.PLAYER)
      ]);

      if (cachedTasks) setTasks(cachedTasks);
      if (cachedHabits) setHabits(cachedHabits);
      if (cachedGoals) setGoals(cachedGoals);
      if (cachedUser) setUser(cachedUser);
      if (cachedPlayer) setPlayer(cachedPlayer);
      
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
              // CRUCIAL: If we still have pending items, we are likely offline or have sync issues.
              // We DO NOT fetch fresh data to avoid overwriting local optimistic updates with stale server data.
              // We trust local state.
              setSyncStatus('OFFLINE_PENDING');
              return; 
          }
          
          // 2. Then download fresh data only if queue is clear
          await fetchData(userId);
          setSyncStatus('SYNCED');
          
      } catch (e) {
          console.warn("Sync failed (Offline)", e);
          setSyncStatus('OFFLINE_PENDING');
      }
  };

  const checkOnboarding = async () => {
      try {
          const hasOnboarded = await AsyncStorage.getItem('has_onboarded');
          if (hasOnboarded === 'true') {
              // Si déjà onboardé, on passe direct à l'auth
              setCheckingOnboarding(false);
              initAuth();
          } else {
              // Sinon, on affiche l'onboarding
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
          // Forcer l'affichage Auth immédiatement
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
        setPlayer(null);
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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => fetchData(userId))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => fetchData(userId))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'player_profiles', filter: `user_id=eq.${userId}` }, (payload) => {
                  if (payload.eventType === 'UPDATE') {
                      const newP = payload.new as PlayerProfile;
                      setPlayer(prev => {
                          if (prev && newP.level > prev.level) {
                              previousLevelRef.current = prev.level;
                              setLevelUpVisible(true);
                          }
                          return newP;
                      });
                      saveToCache(CACHE_KEYS.PLAYER, newP);
                  }
          })
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                  // Connected
              } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                  // Handle disconnect gracefully
                  console.log("Realtime disconnected - Offline mode active");
              }
          });
      realtimeChannel.current = channel;
  };

  const fetchData = async (userId: string) => {
    try {
      let { data: userData, error: userError } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      if (userError) throw userError;

      if (!userData) {
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
      }

      let { data: playerData } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
      if (!playerData) {
          const { data: newPlayer } = await supabase.from('player_profiles').insert({
              user_id: userId, level: 1, experience_points: 0, credits: 0, avatar_type: 'novice'
          }).select().single();
          playerData = newPlayer;
      }
      
      if (playerData) {
          setPlayer(playerData);
          saveToCache(CACHE_KEYS.PLAYER, playerData);
          previousLevelRef.current = playerData.level; 
      }

      const { data: settingsData } = await supabase.from('user_settings').select('theme').eq('id', userId).single();
      if (settingsData && settingsData.theme) setIsDarkMode(settingsData.theme === 'dark');

      const [tasksRes, habitsRes, goalsRes] = await Promise.all([
          supabase.from('tasks').select('*, subtasks(*)').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('goals').select('*, subobjectives(*)').eq('user_id', userId)
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (habitsRes.error) throw habitsRes.error;
      if (goalsRes.error) throw goalsRes.error;

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

      // Restore active focus session if exists
      const savedSession = await AsyncStorage.getItem('active_focus_session');
      if (savedSession) {
          setCurrentView(ViewState.FOCUS_MODE);
      } else if (currentView === ViewState.AUTH && !checkingOnboarding) {
          setCurrentView(ViewState.TODAY);
      }

    } catch (error) {
      console.log("Fetch error (likely offline):", error);
      setSyncStatus('OFFLINE_PENDING');
      // Do NOT clear state here. We keep the cached version.
    }
  };

  const handleLogout = async () => {
    if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
    setProfileVisible(false);
    await supabase.auth.signOut();
  };

  const queueAction = async (action: any) => {
      setSyncStatus('OFFLINE_PENDING'); // Visual feedback immediate
      await addToQueue(action);
      // Optional: Try to process queue immediately if network might be back
      // processQueue().then(r => r === 0 && setSyncStatus('SYNCED')); 
  };

  // --- CRUD ACTIONS (Rest unchanged for brevity, keeping existing logic) ---
  const createTask = async (title: string, priority: any, goalId?: string, dueDate?: string) => {
      if (!user) return;
      const newTask: Task = {
          id: generateId(),
          user_id: user.id,
          title,
          description: null,
          priority,
          linked_goal_id: goalId,
          due_date: dueDate || null,
          completed: false,
          created_at: new Date().toISOString(),
          sort_order: 0,
          subtasks: []
      };
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      saveToCache(CACHE_KEYS.TASKS, updatedTasks);
      try { const { error } = await supabase.from('tasks').insert(newTask); if (error) throw error; } catch (e) { queueAction({ type: 'INSERT', table: 'tasks', payload: newTask }); }
  };

  const createHabit = async (habitData: any) => {
      if (!user) return;
      const newHabit: Habit = {
          id: generateId(),
          user_id: user.id,
          title: habitData.title,
          streak: 0,
          target: habitData.target || 1,
          frequency: habitData.frequency || 'daily',
          created_at: new Date().toISOString(),
          ...habitData
      };
      const updatedHabits = [...habits, newHabit];
      setHabits(updatedHabits);
      saveToCache(CACHE_KEYS.HABITS, updatedHabits);
      try { const { error } = await supabase.from('habits').insert(newHabit); if (error) throw error; } catch (e) { queueAction({ type: 'INSERT', table: 'habits', payload: newHabit }); }
  };

  const createGoal = async (title: string) => {
      if (!user) return;
      const newGoal: Goal = {
          id: generateId(),
          user_id: user.id,
          title,
          description: null,
          completed: false,
          target_date: null,
          progress: 0,
          sort_order: 0,
          created_at: new Date().toISOString()
      };
      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      saveToCache(CACHE_KEYS.GOALS, updatedGoals);
      try { const { error } = await supabase.from('goals').insert(newGoal); if (error) throw error; } catch (e) { queueAction({ type: 'INSERT', table: 'goals', payload: newGoal }); }
  };

  const toggleTask = async (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      setTasks(updatedTasks);
      saveToCache(CACHE_KEYS.TASKS, updatedTasks);
      try { const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id); if (error) throw error; } catch (e) { queueAction({ type: 'UPDATE', table: 'tasks', payload: { id, completed: !task.completed } }); }
  };

  const toggleHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const lastCompleted = habit.last_completed_at ? new Date(habit.last_completed_at).toISOString().split('T')[0] : null;
      if (lastCompleted === todayStr) return; 
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

  const createSubtask = async (taskId: string, title: string) => {
      if (!user) return;
      const newSub: Subtask = { id: generateId(), parent_task_id: taskId, user_id: user.id, title: title, completed: false, sort_order: 0, created_at: new Date().toISOString() };
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), newSub] } : t);
      setTasks(updatedTasks);
      saveToCache(CACHE_KEYS.TASKS, updatedTasks);
      try { await supabase.from('subtasks').insert(newSub); } catch (e) { queueAction({ type: 'INSERT', table: 'subtasks', payload: newSub }); }
  };

  const toggleSubtask = async (subId: string, taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      const sub = task?.subtasks?.find(s => s.id === subId);
      if (sub) {
          const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks?.map(s => s.id === subId ? { ...s, completed: !s.completed } : s) } : t);
          setTasks(updatedTasks);
          saveToCache(CACHE_KEYS.TASKS, updatedTasks);
          try { await supabase.from('subtasks').update({ completed: !sub.completed }).eq('id', subId); } catch (e) { queueAction({ type: 'UPDATE', table: 'subtasks', payload: { id: subId, completed: !sub.completed } }); }
      }
  };

  const deleteSubtask = async (subId: string, taskId: string) => {
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks?.filter(s => s.id !== subId) } : t);
      setTasks(updatedTasks);
      saveToCache(CACHE_KEYS.TASKS, updatedTasks);
      try { await supabase.from('subtasks').delete().eq('id', subId); } catch (e) { queueAction({ type: 'DELETE', table: 'subtasks', payload: { id: subId } }); }
  };

  const deleteGoal = async (id: string) => {
      const updatedGoals = goals.filter(g => g.id !== id);
      setGoals(updatedGoals);
      saveToCache(CACHE_KEYS.GOALS, updatedGoals);
      try { await supabase.from('goals').delete().eq('id', id); } catch (e) { queueAction({ type: 'DELETE', table: 'goals', payload: { id } }); }
  };

  const createSubObjective = async (goalId: string, title: string) => {
      if (!user) return;
      const newSub: SubObjective = { id: generateId(), parent_goal_id: goalId, user_id: user.id, title, completed: false, sort_order: 0, created_at: new Date().toISOString() };
      const updatedGoals = goals.map(g => g.id === goalId ? { ...g, subobjectives: [...(g.subobjectives || []), newSub] } : g);
      setGoals(updatedGoals);
      saveToCache(CACHE_KEYS.GOALS, updatedGoals);
      try { await supabase.from('subobjectives').insert(newSub); } catch (e) { queueAction({ type: 'INSERT', table: 'subobjectives', payload: newSub }); }
  };

  const toggleSubObjective = async (subId: string, goalId: string) => {
      const goal = goals.find(g => g.id === goalId);
      const sub = goal?.subobjectives?.find(s => s.id === subId);
      if (sub) {
          const updatedGoals = goals.map(g => g.id === goalId ? { ...g, subobjectives: g.subobjectives?.map(s => s.id === subId ? { ...s, completed: !s.completed } : s) } : g);
          setGoals(updatedGoals);
          saveToCache(CACHE_KEYS.GOALS, updatedGoals);
          try { await supabase.from('subobjectives').update({ completed: !sub.completed }).eq('id', subId); } catch (e) { queueAction({ type: 'UPDATE', table: 'subobjectives', payload: { id: subId, completed: !sub.completed } }); }
      }
  };

  const deleteSubObjective = async (subId: string, goalId: string) => {
      const updatedGoals = goals.map(g => g.id === goalId ? { ...g, subobjectives: g.subobjectives?.filter(s => s.id !== subId) } : g);
      setGoals(updatedGoals);
      saveToCache(CACHE_KEYS.GOALS, updatedGoals);
      try { await supabase.from('subobjectives').delete().eq('id', subId); } catch (e) { queueAction({ type: 'DELETE', table: 'subobjectives', payload: { id: subId } }); }
  };

  const deleteJournalEntry = async (id: string) => { try { await supabase.from('journal_entries').delete().eq('id', id); } catch(e) { console.error("Delete journal error", e); } };
  const deleteReflection = async (id: string) => { try { await supabase.from('daily_reflections').delete().eq('id', id); } catch(e) { console.error("Delete reflection error", e); } };
  const aiStartFocus = (m: number) => setCurrentView(ViewState.FOCUS_MODE);

  const renderView = () => {
    if (checkingOnboarding || loading) return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }}>
            <SkeletonDashboard />
        </View>
    );

    if (currentView === ViewState.ONBOARDING) return <Onboarding onFinish={finishOnboarding} />;
    if (!session || !user || !player) return <Auth onLogin={() => fetchData(session?.user?.id)} />;

    const commonProps = { isDarkMode };
    
    // Contenu rendu dans un Wrapper Animé pour la transition
    let Content = null;

    switch (currentView) {
      case ViewState.TODAY:
        Content = <Dashboard user={user} player={player} tasks={tasks} habits={habits} toggleHabit={toggleHabit} toggleTask={toggleTask} openFocus={() => setCurrentView(ViewState.FOCUS_MODE)} openProfile={() => setProfileVisible(true)} setView={setCurrentView} syncStatus={syncStatus} {...commonProps} />;
        break;
      case ViewState.PLANNING:
        Content = <Planning tasks={tasks} habits={habits} goals={goals} toggleTask={toggleTask} toggleHabit={toggleHabit} toggleGoal={()=>{}} addGoal={createGoal} deleteGoal={deleteGoal} createSubObjective={createSubObjective} toggleSubObjective={toggleSubObjective} deleteSubObjective={deleteSubObjective} userId={user.id} refreshGoals={() => fetchData(user.id)} openMenu={()=>{}} isDarkMode={isDarkMode} />;
        break;
      case ViewState.INTROSPECTION:
        Content = <Introspection userId={user.id} openMenu={() => {}} isDarkMode={isDarkMode} deleteJournalEntry={deleteJournalEntry} deleteReflection={deleteReflection} />;
        break;
      case ViewState.EVOLUTION:
        Content = <Evolution player={player} user={user} tasks={tasks} habits={habits} goals={goals} quests={quests} openMenu={() => {}} openProfile={() => setProfileVisible(true)} onAddTask={createTask} onAddHabit={(t) => createHabit({title: t})} onAddGoal={createGoal} onStartFocus={aiStartFocus} isDarkMode={isDarkMode} />;
        break;
      case ViewState.TASKS: 
          Content = <Tasks tasks={tasks} goals={goals} toggleTask={toggleTask} addTask={createTask} deleteTask={deleteTask} createSubtask={createSubtask} toggleSubtask={toggleSubtask} deleteSubtask={deleteSubtask} userId={user.id} refreshTasks={() => fetchData(user.id)} openMenu={() => {}} {...commonProps} />;
          break;
      case ViewState.HABITS: 
          Content = <Habits habits={habits} goals={goals} incrementHabit={toggleHabit} userId={user.id} createHabit={createHabit} archiveHabit={(h) => {}} deleteHabit={deleteHabit} refreshHabits={() => fetchData(user.id)} openMenu={() => {}} {...commonProps} />;
          break;
      case ViewState.GOALS:
          Content = <Planning tasks={tasks} habits={habits} goals={goals} toggleTask={toggleTask} toggleHabit={toggleHabit} toggleGoal={()=>{}} addGoal={createGoal} deleteGoal={deleteGoal} createSubObjective={createSubObjective} toggleSubObjective={toggleSubObjective} deleteSubObjective={deleteSubObjective} userId={user.id} refreshGoals={() => fetchData(user.id)} openMenu={() => {}} isDarkMode={isDarkMode} />; 
          break;
      case ViewState.FOCUS_MODE:
        Content = <Focus onExit={() => setCurrentView(ViewState.TODAY)} tasks={tasks} isDarkMode={isDarkMode} openMenu={() => {}} />;
        break;
      case ViewState.CALENDAR:
        Content = <Planning tasks={tasks} habits={habits} goals={goals} toggleTask={toggleTask} toggleHabit={toggleHabit} toggleGoal={()=>{}} addGoal={createGoal} deleteGoal={deleteGoal} createSubObjective={createSubObjective} toggleSubObjective={toggleSubObjective} deleteSubObjective={deleteSubObjective} userId={user.id} refreshGoals={() => fetchData(user.id)} openMenu={() => {}} isDarkMode={isDarkMode} />;
        break;
      case ViewState.JOURNAL:
        Content = <Introspection userId={user.id} openMenu={() => {}} isDarkMode={isDarkMode} deleteJournalEntry={deleteJournalEntry} deleteReflection={deleteReflection} />;
        break;
      case ViewState.REFLECTION:
        Content = <Introspection userId={user.id} openMenu={() => {}} isDarkMode={isDarkMode} deleteJournalEntry={deleteJournalEntry} deleteReflection={deleteReflection} />;
        break;
      default:
        Content = <Dashboard user={user} player={player} tasks={tasks} habits={habits} toggleHabit={toggleHabit} toggleTask={toggleTask} openFocus={() => setCurrentView(ViewState.FOCUS_MODE)} openProfile={() => setProfileVisible(true)} setView={setCurrentView} syncStatus={syncStatus} {...commonProps} />;
    }

    return (
        <Animated.View 
            key={currentView} // Clé unique force le re-render et l'animation
            entering={FadeIn.duration(200)}
            style={{flex: 1}}
        >
            {Content}
        </Animated.View>
    );
  };

  const bgStyle = { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' };

  return (
    <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[{ flex: 1 }, bgStyle]}>
                <StatusBar 
                    barStyle={isDarkMode ? "light-content" : "dark-content"} 
                    backgroundColor="transparent" 
                    translucent={true} 
                />
                
                <View style={{ flex: 1 }}>
                    {renderView()}
                    
                    {player && (
                        <LevelUpModal visible={levelUpVisible} newLevel={player.level} onClose={() => setLevelUpVisible(false)} />
                    )}

                    {currentView !== ViewState.ONBOARDING && user && player && (
                        <Profile 
                            visible={profileVisible} 
                            onClose={() => setProfileVisible(false)} 
                            user={user} player={player} logout={handleLogout} 
                            onThemeChange={setIsDarkMode}
                        />
                    )}

                    {currentView !== ViewState.ONBOARDING && session && user && (
                        <BottomNav currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} />
                    )}
                </View>
            </View>
        </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default App;
