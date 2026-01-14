import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator, Platform } from 'react-native';
import BottomNav from './components/BottomNav';
import { ViewState, UserProfile, PlayerProfile, Task, Habit, Quest } from './types';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Focus from './pages/Focus';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setUser(null);
        setPlayer(null);
        setCurrentView(ViewState.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

      // 2. Player
      const { data: playerData } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();

      if (playerData) {
        setPlayer(playerData);
      } else {
        const defaultPlayer = {
            user_id: userId,
            experience_points: 0,
            level: 1,
            avatar_type: 'novice',
            credits: 0,
            total_quests_completed: 0
        };
        const { data: newPlayer } = await supabase.from('player_profiles').insert(defaultPlayer).select().single();
        if (newPlayer) setPlayer(newPlayer);
        else setPlayer(defaultPlayer as any);
      }

      // 3. Tasks
      const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (tasksData) setTasks(tasksData);

      // 4. Habits
      const { data: habitsData } = await supabase.from('habits').select('*').eq('user_id', userId);
      if (habitsData) setHabits(habitsData);

      // 5. Quests
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

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
    if (!error && newStatus && player) {
        const xpGain = 50;
        const newXp = player.experience_points + xpGain;
        const newLevel = Math.floor(newXp / 1000) + 1;
        const { data: updatedPlayer } = await supabase
            .from('player_profiles')
            .update({ experience_points: newXp, level: newLevel, credits: player.credits + 5 })
            .eq('id', player.id)
            .select()
            .single();
        if (updatedPlayer) setPlayer(updatedPlayer);
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
      const { data } = await supabase.from('tasks').insert(newTaskPayload).select().single();
      if (data) setTasks(prev => [data, ...prev]);
  };

  const deleteTask = async (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('tasks').delete().eq('id', id);
  }

  const incrementHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit || !player) return;
      const newStreak = habit.streak + 1;
      const now = new Date().toISOString();
      setHabits(prev => prev.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: now } : h));
      await supabase.from('habits').update({ streak: newStreak, last_completed_at: now }).eq('id', id);
      const xpGain = 30;
      const { data: updatedPlayer } = await supabase
        .from('player_profiles')
        .update({ experience_points: player.experience_points + xpGain })
        .eq('id', player.id)
        .select()
        .single();
      if (updatedPlayer) setPlayer(updatedPlayer);
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
        return <Focus />;
      case ViewState.PROFILE:
        return <Profile user={user} player={player} logout={handleLogout} />;
      default:
        return <Dashboard user={user} player={player} quests={quests} setView={setCurrentView} />;
    }
  };

  // Apple Design: Light mode defaults (except Focus mode which is OLED black)
  const isFocusMode = currentView === ViewState.FOCUS;
  const backgroundColor = isFocusMode ? '#000000' : '#F2F2F7';
  
  // Status Bar Style
  const statusBarStyle = isFocusMode ? "light-content" : "dark-content";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }}>
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor={backgroundColor} // Android Only: Matches app background
        translucent={false} // Keeping opaque for standard safe-area behavior implies better consistency here without extra deps
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