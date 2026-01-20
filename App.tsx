import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator, Modal, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { Trophy } from 'lucide-react-native';

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

  // Level Up State
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quests', filter: `user_id=eq.${userId}` }, () => fetchQuests(userId))
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

  // --- ACTIONS ---
  const toggleHabit = async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit || !player || !user) return;

      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      const isCompletedToday = habit.last_completed_at && new Date(habit.last_completed_at).toISOString().split('T')[0] === todayDate;

      if (!isCompletedToday) {
          const newStreak = habit.streak + 1;
          const nowIso = now.toISOString();
          await supabase.from('habits').update({ streak: newStreak, last_completed_at: nowIso }).eq('id', id);
          await supabase.from('habit_completions').insert({
              habit_id: id,
              user_id: user.id,
              completed_date: todayDate
          });
          
          const { addXp, REWARDS } = await import('./services/gamification');
          await addXp(user.id, REWARDS.HABIT, player);
      }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.completed;
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
     await supabase.from('goals').update({ completed: newStatus }).eq('id', id);
     
     if (newStatus && player && user) {
         const { addXp, REWARDS } = await import('./services/gamification');
         await addXp(user.id, REWARDS.GOAL, player);
     }
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
                openProfile={() => setProfileVisible(true)}
                setView={setCurrentView}
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
            />
          );
      case ViewState.GOALS:
          return (
             <Goals 
                goals={goals} 
                toggleGoal={toggleGoal}
                addGoal={async (title) => {
                    const max = goals.length > 0 ? Math.max(...goals.map(x=>x.sort_order)) : 0;
                    await supabase.from('goals').insert({
                         user_id: user.id, title, completed: false, sort_order: max+1, progress: 0
                    });
                }}
                deleteGoal={async (id) => await supabase.from('goals').delete().eq('id', id)}
                userId={user.id}
                refreshGoals={() => fetchGoals(user.id)}
                openMenu={() => setSidebarVisible(true)}
             />
          );
      case ViewState.GROWTH:
        return <Growth player={player} user={user} tasks={tasks} openMenu={() => setSidebarVisible(true)} openProfile={() => setProfileVisible(true)} />;
      case ViewState.CYBER_KNIGHT:
        return <CyberKnight player={player} user={user} quests={quests} openMenu={() => setSidebarVisible(true)} openProfile={() => setProfileVisible(true)} />;
      case ViewState.REFLECTION:
        return <ReflectionPage userId={user.id} openMenu={() => setSidebarVisible(true)} />;
      case ViewState.CALENDAR:
        return <CalendarPage tasks={tasks} habits={habits} toggleTask={toggleTask} toggleHabit={toggleHabit} openMenu={() => setSidebarVisible(true)} />;
      case ViewState.FOCUS_MODE:
        return <Focus onExit={() => setCurrentView(ViewState.TODAY)} tasks={tasks} />;
      case ViewState.JOURNAL:
        return <Journal userId={user.id} />;
      default:
        return (
            <Dashboard 
                user={user} player={player} tasks={tasks} habits={habits}
                toggleHabit={toggleHabit} toggleTask={toggleTask}
                openFocus={() => setCurrentView(ViewState.FOCUS_MODE)}
                openMenu={() => setSidebarVisible(true)}
                openProfile={() => setProfileVisible(true)}
                setView={setCurrentView}
            />
        );
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
        backgroundColor: '#171717',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C4B5FD',
        shadowColor: '#C4B5FD',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    levelUpTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 10,
        textAlign: 'center',
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