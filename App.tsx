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
  
  // Level Up State
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

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
      } else {
        setUser(null);
        setPlayer(null);
        setCurrentView(ViewState.AUTH);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

      setCurrentView(ViewState.TODAY);

    } catch (error) {
      console.error("CRITICAL FETCH ERROR:", error);
      Alert.alert("Erreur", "Problème de connexion aux données.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setProfileVisible(false);
    setSidebarVisible(false);
    await supabase.auth.signOut();
  };

  // --- PLACEHOLDERS FOR ACTIONS ---
  const aiAddTask = async (title: string, priority: string) => {};
  const aiAddHabit = async (title: string) => {};
  const aiAddGoal = async (title: string) => {};
  const aiStartFocus = (minutes: number) => setCurrentView(ViewState.FOCUS_MODE);
  
  const toggleHabit = async (id: string) => {
     const habit = habits.find(h => h.id === id);
     if(habit) {
         // Vérifier si déjà complété aujourd'hui (Local Time)
         const today = new Date();
         const lastCompleted = habit.last_completed_at ? new Date(habit.last_completed_at) : null;
         
         const isDoneToday = lastCompleted && 
             lastCompleted.getDate() === today.getDate() &&
             lastCompleted.getMonth() === today.getMonth() &&
             lastCompleted.getFullYear() === today.getFullYear();

         if (isDoneToday) {
             // Si déjà fait, on ne fait rien pour l'instant (éviter le spam de clic), 
             // ou on pourrait implémenter le "undo" si besoin.
             // Pour l'instant on retourne juste pour éviter l'incrémentation infinie.
             return; 
         }

         const newStreak = (habit.streak || 0) + 1;
         const nowISO = new Date().toISOString();

         // Optimistic Update
         setHabits(prev => prev.map(h => h.id === id ? {...h, streak: newStreak, last_completed_at: nowISO} : h));
         
         // DB Update
         await supabase.from('habits').update({ 
             streak: newStreak, 
             last_completed_at: nowISO 
         }).eq('id', id);
     }
  };
  
  const toggleTask = async (id: string) => {
     const task = tasks.find(t => t.id === id);
     if(task) {
         const newVal = !task.completed;
         setTasks(prev => prev.map(t => t.id === id ? {...t, completed: newVal} : t));
         await supabase.from('tasks').update({ completed: newVal }).eq('id', id);
     }
  };
  
  const toggleGoal = async (id: string) => {
      const goal = goals.find(g => g.id === id);
      if(goal) {
          const newVal = !goal.completed;
          setGoals(prev => prev.map(g => g.id === id ? {...g, completed: newVal} : g));
          await supabase.from('goals').update({ completed: newVal }).eq('id', id);
      }
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
          return <Tasks tasks={tasks} goals={goals} toggleTask={toggleTask} addTask={aiAddTask} deleteTask={async(id)=>{}} userId={user.id} refreshTasks={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.HABITS: 
          return <Habits habits={habits} goals={goals} incrementHabit={toggleHabit} userId={user.id} refreshHabits={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.GOALS:
          return <Goals goals={goals} toggleGoal={toggleGoal} addGoal={aiAddGoal} deleteGoal={async()=>{}} userId={user.id} refreshGoals={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
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