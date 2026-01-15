import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';
import { ViewState, UserProfile, PlayerProfile, Task, Habit, Quest, Goal } from './types';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Focus from './pages/Focus';
import Journal from './pages/Journal';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Goals from './pages/Goals';
import { supabase } from './services/supabase';

// NATIVE APP ENTRY POINT
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.AUTH);
  
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks', filter: `user_id=eq.${userId}` }, () => fetchTasks(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` }, () => fetchGoals(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subobjectives', filter: `user_id=eq.${userId}` }, () => fetchGoals(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => fetchHabits(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_profiles', filter: `user_id=eq.${userId}` }, () => fetchPlayer(userId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Fetch helpers
  const fetchTasks = async (userId: string) => {
    const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', userId).order('sort_order').order('created_at', { ascending: false });
    const { data: subtasksData } = await supabase.from('subtasks').select('*').eq('user_id', userId).order('sort_order');

    if (tasksData) {
        const mergedTasks = tasksData.map(t => ({
            ...t,
            subtasks: subtasksData ? subtasksData.filter(s => s.parent_task_id === t.id) : [],
            isExpanded: false
        }));
        setTasks(mergedTasks);
    }
  };

  const fetchGoals = async (userId: string) => {
    const { data: goalsData } = await supabase.from('goals').select('*').eq('user_id', userId).order('sort_order').order('created_at', { ascending: false });
    const { data: subobjectivesData } = await supabase.from('subobjectives').select('*').eq('user_id', userId).order('sort_order');

    if (goalsData) {
        const mergedGoals = goalsData.map(g => ({
            ...g,
            subobjectives: subobjectivesData ? subobjectivesData.filter(s => s.parent_goal_id === g.id) : [],
            isExpanded: false
        }));
        setGoals(mergedGoals);
    }
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
      await fetchGoals(userId);

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

  // --- ACTIONS ---

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.completed;
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
    
    if (!error && newStatus && player) {
        const xpGain = 50;
        await supabase.from('player_profiles').update({ experience_points: player.experience_points + xpGain }).eq('id', player.id);
    }
  };

  const addTask = async (title: string, priority: Task['priority']) => {
      if (!user) return;
      await supabase.from('tasks').insert({
          user_id: user.id,
          title,
          priority,
          completed: false,
          created_at: new Date().toISOString(),
          sort_order: 0 
      });
      fetchTasks(user.id);
  };

  const deleteTask = async (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('subtasks').delete().eq('parent_task_id', id);
      await supabase.from('tasks').delete().eq('id', id);
  }

  const toggleGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newStatus = !goal.completed;
    
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: newStatus } : g));
    await supabase.from('goals').update({ completed: newStatus }).eq('id', id);
  };

  const addGoal = async (title: string) => {
      if (!user) return;
      await supabase.from('goals').insert({
          user_id: user.id,
          title,
          completed: false,
          created_at: new Date().toISOString(),
          sort_order: 0
      });
      fetchGoals(user.id);
  };

  const deleteGoal = async (id: string) => {
      setGoals(prev => prev.filter(g => g.id !== id));
      await supabase.from('subobjectives').delete().eq('parent_goal_id', id);
      await supabase.from('goals').delete().eq('id', id);
  };

  const incrementHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit || !player) return;
      const newStreak = habit.streak + 1;
      const now = new Date().toISOString();
      setHabits(prev => prev.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: now } : h));
      await supabase.from('habits').update({ streak: newStreak, last_completed_at: now }).eq('id', id);
       
      const xpGain = 30;
      await supabase.from('player_profiles').update({ experience_points: player.experience_points + xpGain }).eq('id', player.id);
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
        return <Dashboard user={user} player={player} quests={quests} tasks={tasks} habits={habits} setView={setCurrentView} />;
      case ViewState.TASKS:
        return (
            <Tasks tasks={tasks} toggleTask={toggleTask} addTask={addTask} deleteTask={deleteTask} userId={user.id} refreshTasks={() => fetchTasks(user.id)} />
        );
      case ViewState.HABITS:
        return (
            <Habits habits={habits} incrementHabit={incrementHabit} userId={user.id} refreshHabits={() => fetchHabits(user.id)} />
        );
      case ViewState.GOALS:
        return (
            <Goals goals={goals} toggleGoal={toggleGoal} addGoal={addGoal} deleteGoal={deleteGoal} userId={user.id} refreshGoals={() => fetchGoals(user.id)} />
        );
      case ViewState.FOCUS:
        return <Focus onExit={() => setCurrentView(ViewState.DASHBOARD)} />;
      case ViewState.JOURNAL:
        return <Journal userId={user.id} />;
      case ViewState.PROFILE:
        return <Profile user={user} player={player} logout={handleLogout} />;
      // Placeholders for now
      case ViewState.IA:
        return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Module IA à venir</Text></View>;
      case ViewState.CYBER_KNIGHT:
        return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Module Cyber Knight à venir</Text></View>;
      default:
        return <Dashboard user={user} player={player} quests={quests} tasks={tasks} habits={habits} setView={setCurrentView} />;
    }
  };

  const isFocusMode = currentView === ViewState.FOCUS;
  const backgroundColor = isFocusMode ? '#000000' : '#F2F2F7';
  const statusBarStyle = isFocusMode ? "light-content" : "dark-content";

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
};

export default App;