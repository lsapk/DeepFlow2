import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, View, Modal, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import Onboarding from './pages/Onboarding';
import SkeletonDashboard from './components/SkeletonDashboard';
import { supabase } from './services/supabase';
import { Trophy } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { addXp, REWARDS } from './services/gamification';

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
  
  // Realtime Subscription Ref
  const realtimeChannel = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
      registerForPushNotificationsAsync();
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

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
      try {
          const hasOnboarded = await AsyncStorage.getItem('has_onboarded');
          if (!hasOnboarded) {
              setCurrentView(ViewState.ONBOARDING);
              setLoading(false);
          } else {
              initAuth();
          }
      } catch (e) {
          console.error("Storage error", e);
          initAuth();
      }
  };

  const finishOnboarding = async () => {
      await AsyncStorage.setItem('has_onboarded', 'true');
      initAuth();
  };

  const initAuth = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchData(session.user.id);
          setupRealtimeSubscription(session.user.id);
        } else {
          setCurrentView(ViewState.AUTH);
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
        setupRealtimeSubscription(session.user.id);
      } else {
        setUser(null);
        setPlayer(null);
        if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
        setCurrentView(ViewState.AUTH);
        setLoading(false);
      }
    });

    return () => {
        subscription.unsubscribe();
        if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
    };
  }, []);

  // --- REALTIME SYNC ---
  const setupRealtimeSubscription = (userId: string) => {
      if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);

      const channel = supabase.channel('db_changes')
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
              (payload) => {
                  if (payload.eventType === 'INSERT') setTasks(prev => [payload.new as Task, ...prev]);
                  if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t));
                  if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
              (payload) => {
                  if (payload.eventType === 'INSERT') setHabits(prev => [...prev, payload.new as Habit]);
                  if (payload.eventType === 'UPDATE') setHabits(prev => prev.map(h => h.id === payload.new.id ? payload.new as Habit : h));
                  if (payload.eventType === 'DELETE') setHabits(prev => prev.filter(h => h.id !== payload.old.id));
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
              (payload) => {
                  if (payload.eventType === 'INSERT') setGoals(prev => [...prev, payload.new as Goal]);
                  if (payload.eventType === 'UPDATE') setGoals(prev => prev.map(g => g.id === payload.new.id ? payload.new as Goal : g));
                  if (payload.eventType === 'DELETE') setGoals(prev => prev.filter(g => g.id !== payload.old.id));
              }
          )
          // Ajout écoute habit_completions pour synchro parfaite avec le web
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'habit_completions', filter: `user_id=eq.${userId}` },
              () => {
                  // Si une completion change (coché sur web), on recharge les habitudes pour avoir le bon last_completed_at et streak
                  refreshHabits(userId);
              }
          )
          .subscribe();

      realtimeChannel.current = channel;
  };

  const refreshHabits = async (userId: string) => {
      const { data } = await supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true });
      if (data) setHabits(data);
  };

  // --- FETCHERS ---
  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. User Profile
      let { data: userData, error: userError } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      
      // Auto-create profile if missing
      if (!userData) {
          const { data: authUser } = await supabase.auth.getUser();
          const email = authUser?.user?.email;
          const { data: newProfile } = await supabase.from('user_profiles').insert({
              id: userId,
              email: email,
              display_name: email?.split('@')[0] || 'Voyageur'
          }).select().single();
          userData = newProfile;
      }
      setUser(userData);

      // 2. Player Profile
      let { data: playerData } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
      if (!playerData) {
          const { data: newPlayer } = await supabase.from('player_profiles').insert({
              user_id: userId,
              level: 1,
              experience_points: 0,
              credits: 0,
              avatar_type: 'novice'
          }).select().single();
          playerData = newPlayer;
      }
      setPlayer(playerData);

      // 3. Load Data in parallel
      const [tasksRes, habitsRes, goalsRes] = await Promise.all([
          supabase.from('tasks').select('*, subtasks(*)').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('goals').select('*, subobjectives(*)').eq('user_id', userId)
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (habitsRes.data) setHabits(habitsRes.data);
      if (goalsRes.data) setGoals(goalsRes.data);

      if (currentView === ViewState.AUTH) {
          setCurrentView(ViewState.TODAY);
      }

    } catch (error) {
      console.error("CRITICAL FETCH ERROR:", error);
      Alert.alert("Erreur", "Problème de connexion aux données.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
    setProfileVisible(false);
    setSidebarVisible(false);
    await supabase.auth.signOut();
  };

  // --- ACTIONS (Optimistic Update + DB Call) ---
  const aiAddTask = async (title: string, priority: string) => {
      // Logic handled in component mostly, or we could lift state here
  };
  const aiAddHabit = async (title: string) => {};
  const aiAddGoal = async (title: string) => {};
  const aiStartFocus = (minutes: number) => setCurrentView(ViewState.FOCUS_MODE);
  
  const toggleHabit = async (id: string) => {
     const habit = habits.find(h => h.id === id);
     if(habit && user) {
         const todayDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD strict
         
         // Vérification si déjà fait aujourd'hui basée sur la date ISO
         const lastCompletedDate = habit.last_completed_at ? habit.last_completed_at.split('T')[0] : null;
         const isDoneToday = lastCompletedDate === todayDate;

         let newStreak = habit.streak || 0;
         let newLastCompletedAt = habit.last_completed_at;

         if (isDoneToday) {
             // ACTION: DÉCOCHER (UNDO)
             newStreak = Math.max(0, newStreak - 1);
             
             // On met la date à hier pour simuler l'état "pas fait aujourd'hui" dans habits
             // ou null si le streak retombe à 0 (optionnel)
             const yesterday = new Date();
             yesterday.setDate(yesterday.getDate() - 1);
             newLastCompletedAt = yesterday.toISOString(); 

             // 1. Optimistic Update Local
             setHabits(prev => prev.map(h => h.id === id ? {...h, streak: newStreak, last_completed_at: newLastCompletedAt} : h));
             
             // 2. SUPABASE : Supprimer l'entrée dans habit_completions (CRITIQUE pour le Web)
             await supabase.from('habit_completions')
                .delete()
                .eq('habit_id', id)
                .eq('completed_date', todayDate);

             // 3. SUPABASE : Mettre à jour la table habits
             await supabase.from('habits').update({ 
                 streak: newStreak, 
                 last_completed_at: newLastCompletedAt 
             }).eq('id', id);

         } else {
             // ACTION: COCHER (DONE)
             newStreak = newStreak + 1;
             newLastCompletedAt = new Date().toISOString();

             // 1. Optimistic Update Local
             setHabits(prev => prev.map(h => h.id === id ? {...h, streak: newStreak, last_completed_at: newLastCompletedAt} : h));
             
             // 2. SUPABASE : Insérer dans habit_completions (CRITIQUE pour le Web)
             await supabase.from('habit_completions')
                .insert({
                    habit_id: id,
                    user_id: user.id,
                    completed_date: todayDate
                });

             // 3. SUPABASE : Mettre à jour habits
             await supabase.from('habits').update({ 
                 streak: newStreak, 
                 last_completed_at: newLastCompletedAt 
             }).eq('id', id);

             // XP Reward
             if(player) await addXp(user.id, REWARDS.HABIT, player);
         }
     }
  };
  
  const toggleTask = async (id: string) => {
     const task = tasks.find(t => t.id === id);
     if(task && user && player) {
         const newVal = !task.completed;
         // Optimistic
         setTasks(prev => prev.map(t => t.id === id ? {...t, completed: newVal} : t));
         // DB
         await supabase.from('tasks').update({ completed: newVal }).eq('id', id);
         
         // XP Reward if completing
         if(newVal) {
             const reward = task.priority === 'high' ? REWARDS.TASK_HIGH : (task.priority === 'medium' ? REWARDS.TASK_MEDIUM : REWARDS.TASK_LOW);
             await addXp(user.id, reward, player);
         }
     }
  };

  const deleteTask = async (id: string) => {
      // Optimistic Update
      setTasks(prev => prev.filter(t => t.id !== id));
      
      // DB: IMPORTANT - Supprimer les sous-tâches d'abord pour éviter l'erreur de contrainte Foreign Key
      await supabase.from('subtasks').delete().eq('parent_task_id', id);
      // Ensuite supprimer la tâche
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      
      if(error) {
          console.error("Delete task error", error);
          // Revert optimistic if needed (optionnel)
      }
  };
  
  const toggleGoal = async (id: string) => {
      const goal = goals.find(g => g.id === id);
      if(goal) {
          const newVal = !goal.completed;
          // Optimistic
          setGoals(prev => prev.map(g => g.id === id ? {...g, completed: newVal} : g));
          // DB
          await supabase.from('goals').update({ completed: newVal }).eq('id', id);
          
          if(newVal && user && player) {
              await addXp(user.id, REWARDS.GOAL, player);
          }
      }
  };

  const deleteGoal = async (id: string) => {
      setGoals(prev => prev.filter(g => g.id !== id));
      // Delete subobjectives first
      await supabase.from('subobjectives').delete().eq('parent_goal_id', id);
      await supabase.from('goals').delete().eq('id', id);
  };

  const renderView = () => {
    if (loading) return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }}>
            <SkeletonDashboard />
        </View>
    );

    if (currentView === ViewState.ONBOARDING) return <Onboarding onFinish={finishOnboarding} />;
    if (!session || !user || !player) return <Auth onLogin={() => fetchData(session?.user?.id)} />;

    const commonProps = { isDarkMode };

    switch (currentView) {
      case ViewState.TODAY:
        return <Dashboard user={user} player={player} tasks={tasks} habits={habits} toggleHabit={toggleHabit} toggleTask={toggleTask} openFocus={() => setCurrentView(ViewState.FOCUS_MODE)} openMenu={() => setSidebarVisible(true)} openProfile={() => setProfileVisible(true)} setView={setCurrentView} {...commonProps} />;
      case ViewState.TASKS: 
          return <Tasks tasks={tasks} goals={goals} toggleTask={toggleTask} addTask={aiAddTask} deleteTask={deleteTask} userId={user.id} refreshTasks={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.HABITS: 
          return <Habits habits={habits} goals={goals} incrementHabit={toggleHabit} userId={user.id} refreshHabits={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.GOALS:
          return <Goals goals={goals} toggleGoal={toggleGoal} addGoal={aiAddGoal} deleteGoal={deleteGoal} userId={user.id} refreshGoals={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.GROWTH:
        return <Growth player={player} user={user} tasks={tasks} habits={habits} goals={goals} openMenu={() => setSidebarVisible(true)} openProfile={() => setProfileVisible(true)} onAddTask={aiAddTask} onAddHabit={aiAddHabit} onAddGoal={aiAddGoal} onStartFocus={aiStartFocus} {...commonProps} />;
      case ViewState.CYBER_KNIGHT:
        return <CyberKnight player={player} user={user} quests={quests} openMenu={() => setSidebarVisible(true)} openProfile={() => setProfileVisible(true)} {...commonProps} />;
      case ViewState.REFLECTION:
        return <ReflectionPage userId={user.id} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.CALENDAR:
        return <CalendarPage tasks={tasks} habits={habits} toggleTask={toggleTask} toggleHabit={toggleHabit} openMenu={() => setSidebarVisible(true)} />;
      case ViewState.FOCUS_MODE:
        return <Focus onExit={() => setCurrentView(ViewState.TODAY)} tasks={tasks} isDarkMode={isDarkMode} openMenu={() => setSidebarVisible(true)} />;
      case ViewState.JOURNAL:
        return <Journal userId={user.id} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      default:
        return <Dashboard user={user} player={player} tasks={tasks} habits={habits} toggleHabit={toggleHabit} toggleTask={toggleTask} openFocus={() => setCurrentView(ViewState.FOCUS_MODE)} openMenu={() => setSidebarVisible(true)} openProfile={() => setProfileVisible(true)} setView={setCurrentView} {...commonProps} />;
    }
  };

  const bgStyle = { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' };

  return (
    <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[{ flex: 1 }, bgStyle]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#000000" : "#F2F2F7"} />
            <View style={{ flex: 1 }}>
                {renderView()}
                
                {currentView !== ViewState.ONBOARDING && (
                    <Sidebar 
                        visible={sidebarVisible} 
                        onClose={() => setSidebarVisible(false)}
                        user={user}
                        setView={setCurrentView}
                        currentView={currentView}
                        onLogout={handleLogout}
                    />
                )}

                {currentView !== ViewState.ONBOARDING && user && player && (
                    <Profile 
                        visible={profileVisible} 
                        onClose={() => setProfileVisible(false)} 
                        user={user} player={player} logout={handleLogout} 
                    />
                )}

                {currentView !== ViewState.ONBOARDING && session && user && currentView !== ViewState.FOCUS_MODE && (
                    <BottomNav currentView={currentView} setView={setCurrentView} />
                )}
            </View>
            </SafeAreaView>
        </GestureHandlerRootView>
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
});

export default App;