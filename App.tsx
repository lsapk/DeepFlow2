import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import { ViewState, UserProfile, PlayerProfile, Task, Habit, Goal } from './types';
import Dashboard from './pages/Dashboard';
import Growth from './pages/Growth';
import Explore from './pages/Explore';
import Focus from './pages/Focus';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Journal from './pages/Journal';
import Auth from './pages/Auth';
import { supabase } from './services/supabase';

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
  const [loading, setLoading] = useState(true);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subobjectives', filter: `user_id=eq.${userId}` }, () => fetchGoals(userId))
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

  const fetchPlayer = async (userId: string) => {
    const { data } = await supabase.from('player_profiles').select('*').eq('user_id', userId).single();
    if (data) setPlayer(data);
  };

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      if (userData) setUser(userData);
      
      await Promise.all([
          fetchPlayer(userId),
          fetchTasks(userId),
          fetchHabits(userId),
          fetchGoals(userId)
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

  // --- ACTIONS ---
  
  const toggleHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit || !player || !user) return;

      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      
      // Check if completed today
      const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toISOString().split('T')[0] === todayDate;

      if (isCompletedToday) {
          // UNCHECK LOGIC
          const newStreak = Math.max(0, habit.streak - 1);
          
          // Optimistic
          setHabits(prev => prev.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: null } : h));

          // DB Updates
          await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completed_date', todayDate);
          await supabase.from('habits').update({ streak: newStreak, last_completed_at: null }).eq('id', id); // Note: last_completed_at logic is simplified here, ideally should find prev completion
          
          // XP Revert
          const newXp = Math.max(0, player.experience_points - 20);
          await supabase.from('player_profiles').update({ experience_points: newXp }).eq('id', player.id);

      } else {
          // CHECK LOGIC
          const newStreak = habit.streak + 1;
          const nowIso = now.toISOString();

          // Optimistic
          setHabits(prev => prev.map(h => h.id === id ? { ...h, streak: newStreak, last_completed_at: nowIso } : h));

          // DB Updates
          await supabase.from('habits').update({ streak: newStreak, last_completed_at: nowIso }).eq('id', id);
          await supabase.from('habit_completions').insert({
              habit_id: id,
              user_id: user.id,
              completed_date: todayDate
          });
          
          // XP Add
          const newXp = player.experience_points + 20;
          await supabase.from('player_profiles').update({ experience_points: newXp }).eq('id', player.id);
      }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const newStatus = !task.completed;
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));
    await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);

    if (newStatus && player) {
        const newXp = player.experience_points + 50;
        await supabase.from('player_profiles').update({ experience_points: newXp }).eq('id', player.id);
    }
  };

  const addTask = async (title: string, priority: Task['priority'], goalId?: string) => {
      if (!user) return;
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) : 0;
      
      const { error } = await supabase.from('tasks').insert({
          user_id: user.id,
          title,
          priority,
          completed: false,
          sort_order: maxOrder + 1,
          linked_goal_id: goalId || null
      });
      if (!error) fetchTasks(user.id);
  };

  const deleteTask = async (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('tasks').delete().eq('id', id);
  };

  // --- RENDER ---
  const renderView = () => {
    if (loading) return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#FFF" />
        </View>
    );

    if (!session || !user || !player) return <Auth onLogin={() => fetchData(session?.user?.id)} />;

    switch (currentView) {
      case ViewState.TODAY:
        return (
            <Dashboard 
                user={user} player={player} tasks={tasks} habits={habits}
                toggleHabit={toggleHabit} toggleTask={toggleTask}
                openFocus={() => setCurrentView(ViewState.FOCUS_MODE)}
                openMenu={() => setSidebarVisible(true)}
                setView={setCurrentView}
            />
        );
      case ViewState.TASKS: 
          return <Tasks tasks={tasks} goals={goals} toggleTask={toggleTask} addTask={addTask} deleteTask={deleteTask} userId={user.id} refreshTasks={() => fetchTasks(user.id)} />;
      case ViewState.HABITS: 
          return <Habits habits={habits} goals={goals} incrementHabit={toggleHabit} userId={user.id} refreshHabits={() => fetchHabits(user.id)} />;
      case ViewState.GROWTH:
        return <Growth goals={goals} userId={user.id} setView={setCurrentView} />;
      case ViewState.EXPLORE:
        return <Explore player={player} />;
      case ViewState.FOCUS_MODE:
        return <Focus onExit={() => setCurrentView(ViewState.TODAY)} />;
      case ViewState.JOURNAL:
        return <Journal userId={user.id} />;
      default:
        return <Dashboard 
            user={user} player={player} tasks={tasks} habits={habits}
            toggleHabit={toggleHabit} toggleTask={toggleTask}
            openFocus={() => setCurrentView(ViewState.FOCUS_MODE)}
            openMenu={() => setSidebarVisible(true)}
            setView={setCurrentView}
        />;
    }
  };

  const isFocusMode = currentView === ViewState.FOCUS_MODE;

  return (
    <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
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
                    onClose={() => setProfileVisible(false)} 
                    user={user} player={player} logout={handleLogout} 
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