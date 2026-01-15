import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator, Platform } from 'react-native';
import BottomNav from './components/BottomNav';
import { ViewState, UserProfile, PlayerProfile, Task, Habit, Quest } from './types';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Focus from './pages/Focus';
import Journal from './pages/Journal';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { supabase } from './services/supabase';

// NATIVE APP ENTRY POINT
// Ensure you have installed:
// npm install @react-native-async-storage/async-storage @supabase/supabase-js lucide-react-native react-native-svg

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.AUTH);
  
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        () => fetchTasks(userId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
        () => fetchHabits(userId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_profiles', filter: `user_id=eq.${userId}` },
        () => fetchPlayer(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Fetch helpers used by both initial load and realtime
  const fetchTasks = async (userId: string) => {
    const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setTasks(data);
  };

  const fetchHabits = async (userId: string) => {
    const { data } = await supabase.from('habits').select('*').eq('user_id', userId);
    if (data) setHabits(data);
  };

  const fetchPlayer = async (userId: string) => {
    const { data } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
    if (data) setPlayer(data);
  };

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. User
      const { data: userData } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      
      if (userData) {
          setUser(userData);
      } else {
          const authUser = session?.user || (await supabase.auth.getUser()).data.user;
          setUser({
              id: userId,
              display_name: authUser?.user_metadata?.display_name || "User",
              email: authUser?.email || "",
              photo_url: authUser?.user_metadata?.avatar_url || null,
              bio: "",
              created_at: new Date().toISOString()
          });
      }

      await fetchPlayer(userId);
      await fetchTasks(userId);
      await fetchHabits(userId);

      // 5. Quests (Global usually, or filter by user if specific)
      const { data: questsData } = await supabase.from('quests').select('*');
      if (questsData) setQuests(questsData);

      setCurrentView(ViewState.DASHBOARD);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Actions
  const toggleTask = async (id: string) => {
    // Optimistic Update
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.completed;
    
    // UI update immediately
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));

    // DB Update
    const { error } = await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
    
    // Gamification Logic (Server side trigger usually better, but here's client side logic)
    if (!error && newStatus && player) {
        const xpGain = 50;
        const newXp = player.experience_points + xpGain;
        const newLevel = Math.floor(newXp / 1000) + 1;
        await supabase
            .from('player_profiles')
            .update({ experience_points: newXp, level: newLevel, credits: player.credits + 5 })
            .eq('id', player.id);
    }
  };

  const addTask = async (title: string, priority: Task['priority']) => {
      if (!user) return;
      const newTaskPayload = {
          user_id: user.id,
          title,
          priority,
          completed: false,
          created_at: new Date().toISOString()
      };
      await supabase.from('tasks').insert(newTaskPayload);
  };

  const deleteTask = async (id: string) => {
      // Optimistic
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('tasks').delete().eq('id', id);
  }

  const incrementHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit || !player) return;
      
      const newStreak = habit.streak + 1;
      const now = new Date().toISOString();
      
      // UI update handled by realtime or optimistic
      setHabits(prev => prev.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: now } : h));

      await supabase.from('habits').update({ streak: newStreak, last_completed_at: now }).eq('id', id);
      
      const xpGain = 30;
      await supabase
        .from('player_profiles')
        .update({ experience_points: player.experience_points + xpGain })
        .eq('id', player.id);
  };

  const renderView = () => {
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        )
    }

    if (!session || !user || !player) return <Auth onLogin={() => {}} />;

    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard user={user} player={player} quests={quests} setView={setCurrentView} />;
      case ViewState.TASKS:
        return <Tasks tasks={tasks} toggleTask={toggleTask} addTask={addTask} deleteTask={deleteTask} />;
      case ViewState.HABITS:
        return <Habits habits={habits} incrementHabit={incrementHabit} />;
      case ViewState.FOCUS:
        return <Focus onExit={() => setCurrentView(ViewState.DASHBOARD)} />;
      case ViewState.JOURNAL:
        return <Journal userId={user.id} />;
      case ViewState.PROFILE:
        return <Profile user={user} player={player} logout={handleLogout} />;
      default:
        return <Dashboard user={user} player={player} quests={quests} setView={setCurrentView} />;
    }
  };

  // Apple Design: Light mode defaults (except Focus mode which is OLED black)
  const isFocusMode = currentView === ViewState.FOCUS;
  const backgroundColor = isFocusMode ? '#000000' : '#F2F2F7';
  const statusBarStyle = isFocusMode ? "light-content" : "dark-content";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor={backgroundColor} 
        translucent={false} 
      />
      <View style={{ flex: 1, backgroundColor: backgroundColor }}>
        {renderView()}
        {session && user && player && !isFocusMode && (
             <BottomNav currentView={currentView} setView={setCurrentView} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default App;