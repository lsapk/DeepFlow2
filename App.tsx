import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';
import { ViewState, UserProfile, PlayerProfile, Task, Habit, Quest, Goal } from './types';
import Dashboard from './pages/Dashboard';
import Growth from './pages/Growth';
import Explore from './pages/Explore';
import Focus from './pages/Focus';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { supabase } from './services/supabase';

// NATIVE APP ENTRY POINT
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.AUTH);
  const [profileVisible, setProfileVisible] = useState(false);
  
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Auth Check
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // Realtime Subscription Logic
  const setupRealtimeSubscription = (userId: string) => {
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => fetchTasks(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => fetchHabits(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` }, () => fetchGoals(userId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Fetch helpers
  const fetchTasks = async (userId: string) => {
    const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', userId).order('sort_order').order('created_at', { ascending: false });
    if (tasksData) setTasks(tasksData);
  };

  const fetchGoals = async (userId: string) => {
    const { data: goalsData } = await supabase.from('goals').select('*, subobjectives(*)').eq('user_id', userId).order('sort_order');
    if (goalsData) setGoals(goalsData);
  };

  const fetchHabits = async (userId: string) => {
    const { data } = await supabase.from('habits').select('*').eq('user_id', userId).order('sort_order').order('created_at', { ascending: true });
    if (data) setHabits(data);
  };

  const fetchPlayer = async (userId: string) => {
    const { data } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
    if (data) setPlayer(data);
  };

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      
      if (userData) {
          setUser(userData);
      } else {
          // Fallback or create profile logic
      }

      await fetchPlayer(userId);
      await fetchTasks(userId);
      await fetchHabits(userId);
      await fetchGoals(userId);

      setCurrentView(ViewState.TODAY);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setProfileVisible(false);
    await supabase.auth.signOut();
  };

  // --- ACTIONS (Simplified) ---
  const incrementHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit || !player) return;
      const newStreak = habit.streak + 1;
      const now = new Date().toISOString();
      // Optimistic update
      setHabits(prev => prev.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: now } : h));
      await supabase.from('habits').update({ streak: newStreak, last_completed_at: now }).eq('id', id);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));
    await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
  };

  const renderView = () => {
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#FFF" />
            </View>
        )
    }

    if (!session || !user || !player) return <Auth onLogin={() => {}} />;

    switch (currentView) {
      case ViewState.TODAY:
        return (
            <Dashboard 
                user={user} player={player} tasks={tasks} habits={habits}
                incrementHabit={incrementHabit} toggleTask={toggleTask}
                openFocus={() => setCurrentView(ViewState.FOCUS_MODE)}
                openProfile={() => setProfileVisible(true)}
            />
        );
      case ViewState.GROWTH:
        return <Growth goals={goals} userId={user.id} />;
      case ViewState.EXPLORE:
        return <Explore />;
      case ViewState.FOCUS_MODE:
        return <Focus onExit={() => setCurrentView(ViewState.TODAY)} />;
      default:
        return <Dashboard 
            user={user} player={player} tasks={tasks} habits={habits}
            incrementHabit={incrementHabit} toggleTask={toggleTask}
            openFocus={() => setCurrentView(ViewState.FOCUS_MODE)}
            openProfile={() => setProfileVisible(true)}
        />;
    }
  };

  const isFocusMode = currentView === ViewState.FOCUS_MODE;

  return (
    <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar 
            barStyle="light-content" 
            backgroundColor="#000000" 
        />
        <View style={{ flex: 1 }}>
            {renderView()}
            
            {/* Modal Profil */}
            {user && player && (
                <Profile 
                    visible={profileVisible} 
                    onClose={() => setProfileVisible(false)} 
                    user={user} 
                    player={player} 
                    logout={handleLogout} 
                />
            )}

            {session && user && !isFocusMode && (
                <BottomNav currentView={currentView} setView={setCurrentView} />
            )}
        </View>
        </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;