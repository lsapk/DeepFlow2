import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, View, Modal, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
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
  
  // Level Up State
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
                  if (payload.eventType === 'INSERT') {
                      setTasks(prev => {
                          if (prev.find(t => t.id === payload.new.id)) return prev;
                          return [payload.new as Task, ...prev];
                      });
                  }
                  if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t));
                  if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
              (payload) => {
                  if (payload.eventType === 'INSERT') {
                      setHabits(prev => {
                          if (prev.find(h => h.id === payload.new.id)) return prev;
                          return [...prev, payload.new as Habit];
                      });
                  }
                  if (payload.eventType === 'UPDATE') setHabits(prev => prev.map(h => h.id === payload.new.id ? payload.new as Habit : h));
                  if (payload.eventType === 'DELETE') setHabits(prev => prev.filter(h => h.id !== payload.old.id));
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'player_profiles', filter: `user_id=eq.${userId}` },
              (payload) => {
                  if (payload.eventType === 'UPDATE') {
                      const newP = payload.new as PlayerProfile;
                      setPlayer(prev => {
                          // Check for level up
                          if (prev && newP.level > prev.level) {
                              previousLevelRef.current = prev.level;
                              setLevelUpVisible(true);
                          }
                          return newP;
                      });
                  }
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'habit_completions', filter: `user_id=eq.${userId}` },
              () => {
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

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      let { data: userData } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
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
      
      if (playerData) {
          setPlayer(playerData);
          previousLevelRef.current = playerData.level; // Init prev level
      }

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

  // --- OPTIMISTIC CREATION ACTIONS ---
  
  const createTask = async (title: string, priority: 'low'|'medium'|'high', goalId?: string, dueDate?: string) => {
      if (!user) return;
      const tempId = crypto.randomUUID();
      const newTask: Task = {
          id: tempId,
          user_id: user.id,
          title,
          priority,
          completed: false,
          created_at: new Date().toISOString(),
          linked_goal_id: goalId || null,
          due_date: dueDate || null,
          sort_order: 0,
          description: null,
          subtasks: []
      };

      setTasks(prev => [newTask, ...prev]);

      const { data, error } = await supabase.from('tasks').insert({
          user_id: user.id,
          title,
          priority,
          completed: false,
          linked_goal_id: goalId || null,
          due_date: dueDate || null
      }).select().single();

      if (error) {
          setTasks(prev => prev.filter(t => t.id !== tempId));
          Alert.alert("Erreur", "Impossible de créer la tâche.");
      } else if (data) {
          setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
      }
  };

  const createHabit = async (habitData: Partial<Habit>) => {
      if (!user) return;
      const tempId = crypto.randomUUID();
      const newHabit: Habit = {
          id: tempId,
          user_id: user.id,
          title: habitData.title || 'Nouvelle habitude',
          frequency: habitData.frequency || 'daily',
          target: habitData.target || 1,
          streak: 0,
          is_archived: false,
          created_at: new Date().toISOString(),
          last_completed_at: null,
          category: habitData.category || null,
          description: habitData.description || null,
          days_of_week: habitData.days_of_week || null,
          linked_goal_id: habitData.linked_goal_id || null
      };

      setHabits(prev => [...prev, newHabit]);

      const { data, error } = await supabase.from('habits').insert({
          ...habitData,
          user_id: user.id,
          streak: 0,
          is_archived: false,
      }).select().single();

      if (error) {
          setHabits(prev => prev.filter(h => h.id !== tempId));
          Alert.alert("Erreur", "Impossible de créer l'habitude.");
      } else if (data) {
          setHabits(prev => prev.map(h => h.id === tempId ? data : h));
      }
  };

  const createGoal = async (title: string) => {
      if (!user) return;
      const tempId = crypto.randomUUID();
      const newGoal: Goal = {
          id: tempId,
          user_id: user.id,
          title,
          completed: false,
          progress: 0,
          created_at: new Date().toISOString(),
          description: null,
          target_date: null,
          sort_order: 0,
          subobjectives: []
      };

      setGoals(prev => [...prev, newGoal]);

      const { data, error } = await supabase.from('goals').insert({
          user_id: user.id,
          title,
          completed: false,
          progress: 0
      }).select().single();

      if (error) {
          setGoals(prev => prev.filter(g => g.id !== tempId));
          Alert.alert("Erreur", "Impossible de créer l'objectif.");
      } else if (data) {
          setGoals(prev => prev.map(g => g.id === tempId ? data : g));
      }
  };

  const aiStartFocus = (minutes: number) => setCurrentView(ViewState.FOCUS_MODE);
  
  const toggleHabit = async (id: string) => {
     const habit = habits.find(h => h.id === id);
     if(habit && user) {
         const todayDate = new Date().toISOString().split('T')[0];
         const lastCompletedDate = habit.last_completed_at ? habit.last_completed_at.split('T')[0] : null;
         const isDoneToday = lastCompletedDate === todayDate;

         let newStreak = habit.streak || 0;
         let newLastCompletedAt = habit.last_completed_at;

         if (isDoneToday) {
             newStreak = Math.max(0, newStreak - 1);
             const yesterday = new Date();
             yesterday.setDate(yesterday.getDate() - 1);
             newLastCompletedAt = yesterday.toISOString(); 

             setHabits(prev => prev.map(h => h.id === id ? {...h, streak: newStreak, last_completed_at: newLastCompletedAt} : h));
             
             const { error } = await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completed_date', todayDate);
             if (error) {
                 // Revert logic needed here in robust app, but for simplicity we rely on next fetch
             } else {
                 await supabase.from('habits').update({ streak: newStreak, last_completed_at: newLastCompletedAt }).eq('id', id);
             }

         } else {
             newStreak = newStreak + 1;
             newLastCompletedAt = new Date().toISOString();

             setHabits(prev => prev.map(h => h.id === id ? {...h, streak: newStreak, last_completed_at: newLastCompletedAt} : h));
             
             const { error } = await supabase.from('habit_completions').insert({ habit_id: id, user_id: user.id, completed_date: todayDate });
             
             if(error) {
                 setHabits(prev => prev.map(h => h.id === id ? habit : h)); // Revert
                 Alert.alert("Erreur", "Erreur de connexion");
             } else {
                 await supabase.from('habits').update({ streak: newStreak, last_completed_at: newLastCompletedAt }).eq('id', id);
                 if(player) await addXp(user.id, REWARDS.HABIT, player);
             }
         }
     }
  };

  // --- SUBTASKS OPTIMISTIC ---
  const createSubtask = async (taskId: string, title: string) => {
      if(!user) return;
      const tempId = crypto.randomUUID();
      const newSub: Subtask = {
          id: tempId,
          parent_task_id: taskId,
          user_id: user.id,
          title,
          completed: false,
          sort_order: 0,
          created_at: new Date().toISOString()
      };

      setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
              return { ...t, subtasks: [...(t.subtasks || []), newSub] };
          }
          return t;
      }));

      const { data, error } = await supabase.from('subtasks').insert({
          parent_task_id: taskId,
          user_id: user.id,
          title,
          completed: false
      }).select().single();

      if (error) {
          setTasks(prev => prev.map(t => {
               if(t.id === taskId) return { ...t, subtasks: t.subtasks?.filter(s => s.id !== tempId) };
               return t;
          }));
          Alert.alert("Erreur", "Échec création sous-tâche");
      } else {
          // Replace ID
          setTasks(prev => prev.map(t => {
              if (t.id === taskId) {
                  return { ...t, subtasks: t.subtasks?.map(s => s.id === tempId ? data : s) };
              }
              return t;
          }));
      }
  };

  const toggleSubtask = async (subtaskId: string, taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      const sub = task?.subtasks?.find(s => s.id === subtaskId);
      if(!sub) return;
      
      const newVal = !sub.completed;

      setTasks(prev => prev.map(t => {
          if(t.id === taskId) {
              return { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? {...s, completed: newVal} : s) };
          }
          return t;
      }));

      const { error } = await supabase.from('subtasks').update({ completed: newVal }).eq('id', subtaskId);
      if(error) {
          // Revert
          setTasks(prev => prev.map(t => {
              if(t.id === taskId) {
                  return { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? {...s, completed: !newVal} : s) };
              }
              return t;
          }));
          Alert.alert("Erreur", "Impossible de mettre à jour la sous-tâche.");
      }
  };

  const deleteSubtask = async (subtaskId: string, taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      const sub = task?.subtasks?.find(s => s.id === subtaskId);
      if(!sub) return;

      setTasks(prev => prev.map(t => {
          if(t.id === taskId) {
              return { ...t, subtasks: t.subtasks?.filter(s => s.id !== subtaskId) };
          }
          return t;
      }));

      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
      if(error) {
          setTasks(prev => prev.map(t => {
               if(t.id === taskId) return { ...t, subtasks: [...(t.subtasks || []), sub] }; // Re-add
               return t;
          }));
          Alert.alert("Erreur", "Impossible de supprimer la sous-tâche.");
      }
  };
  
  const toggleTask = async (id: string) => {
     const task = tasks.find(t => t.id === id);
     if(task && user && player) {
         const newVal = !task.completed;
         setTasks(prev => prev.map(t => t.id === id ? {...t, completed: newVal} : t));
         
         const { error } = await supabase.from('tasks').update({ completed: newVal }).eq('id', id);
         
         if(error) {
             setTasks(prev => prev.map(t => t.id === id ? {...t, completed: !newVal} : t));
             Alert.alert("Erreur", "Erreur de synchro tâche");
         } else {
            if(newVal) {
                const reward = task.priority === 'high' ? REWARDS.TASK_HIGH : (task.priority === 'medium' ? REWARDS.TASK_MEDIUM : REWARDS.TASK_LOW);
                await addXp(user.id, reward, player);
            }
         }
     }
  };

  const deleteTask = async (id: string) => {
      const taskToDelete = tasks.find(t => t.id === id);
      setTasks(prev => prev.filter(t => t.id !== id));
      
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      // Note: subtasks cascade delete on DB or manually handled before
      if(error) {
           if(taskToDelete) setTasks(prev => [...prev, taskToDelete]);
           Alert.alert("Erreur", "Impossible de supprimer la tâche.");
      }
  };

  // --- SUB-OBJECTIVES OPTIMISTIC ---
  const createSubObjective = async (goalId: string, title: string) => {
      if(!user) return;
      const tempId = crypto.randomUUID();
      const newSub: SubObjective = {
          id: tempId,
          parent_goal_id: goalId,
          user_id: user.id,
          title,
          completed: false,
          sort_order: 0,
          created_at: new Date().toISOString()
      };

      setGoals(prev => prev.map(g => {
          if(g.id === goalId) return { ...g, subobjectives: [...(g.subobjectives || []), newSub] };
          return g;
      }));

      const { data, error } = await supabase.from('subobjectives').insert({
          parent_goal_id: goalId,
          user_id: user.id,
          title,
          completed: false
      }).select().single();

      if(error) {
          setGoals(prev => prev.map(g => {
              if(g.id === goalId) return { ...g, subobjectives: g.subobjectives?.filter(s => s.id !== tempId) };
              return g;
          }));
          Alert.alert("Erreur", "Création sous-objectif échouée");
      } else {
          setGoals(prev => prev.map(g => {
              if(g.id === goalId) return { ...g, subobjectives: g.subobjectives?.map(s => s.id === tempId ? data : s) };
              return g;
          }));
      }
  };

  const toggleSubObjective = async (subId: string, goalId: string) => {
      const goal = goals.find(g => g.id === goalId);
      const sub = goal?.subobjectives?.find(s => s.id === subId);
      if(!sub) return;

      const newVal = !sub.completed;
      setGoals(prev => prev.map(g => {
          if(g.id === goalId) return { ...g, subobjectives: g.subobjectives?.map(s => s.id === subId ? {...s, completed: newVal} : s) };
          return g;
      }));

      const { error } = await supabase.from('subobjectives').update({ completed: newVal }).eq('id', subId);
      if(error) {
          setGoals(prev => prev.map(g => {
              if(g.id === goalId) return { ...g, subobjectives: g.subobjectives?.map(s => s.id === subId ? {...s, completed: !newVal} : s) };
              return g;
          }));
          Alert.alert("Erreur", "Mise à jour échouée");
      }
  };

  const deleteSubObjective = async (subId: string, goalId: string) => {
      const goal = goals.find(g => g.id === goalId);
      const sub = goal?.subobjectives?.find(s => s.id === subId);
      if(!sub) return;

      setGoals(prev => prev.map(g => {
          if(g.id === goalId) return { ...g, subobjectives: g.subobjectives?.filter(s => s.id !== subId) };
          return g;
      }));

      const { error } = await supabase.from('subobjectives').delete().eq('id', subId);
      if(error) {
           setGoals(prev => prev.map(g => {
              if(g.id === goalId) return { ...g, subobjectives: [...(g.subobjectives || []), sub] };
              return g;
          }));
          Alert.alert("Erreur", "Suppression échouée");
      }
  };
  
  const toggleGoal = async (id: string) => {
      const goal = goals.find(g => g.id === id);
      if(goal) {
          const newVal = !goal.completed;
          setGoals(prev => prev.map(g => g.id === id ? {...g, completed: newVal} : g));
          const { error } = await supabase.from('goals').update({ completed: newVal }).eq('id', id);
          if(error) {
              setGoals(prev => prev.map(g => g.id === id ? {...g, completed: !newVal} : g));
              Alert.alert("Erreur", "Synchro objectif échouée");
          } else {
             if(newVal && user && player) await addXp(user.id, REWARDS.GOAL, player);
          }
      }
  };

  const deleteGoal = async (id: string) => {
      const goalToDelete = goals.find(g => g.id === id);
      setGoals(prev => prev.filter(g => g.id !== id));
      
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if(error) {
          if(goalToDelete) setGoals(prev => [...prev, goalToDelete]);
          Alert.alert("Erreur", "Impossible de supprimer l'objectif.");
      }
  };

  const archiveHabit = async (habit: Habit) => {
      const newVal = !habit.is_archived;
      setHabits(prev => prev.map(h => h.id === habit.id ? {...h, is_archived: newVal} : h));
      const { error } = await supabase.from('habits').update({ is_archived: newVal }).eq('id', habit.id);
      if(error) {
          setHabits(prev => prev.map(h => h.id === habit.id ? {...h, is_archived: !newVal} : h));
          Alert.alert("Erreur", "Action échouée");
      }
  };

  const deleteHabit = async (id: string) => {
      const habitToDelete = habits.find(h => h.id === id);
      setHabits(prev => prev.filter(h => h.id !== id));
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if(error) {
          if(habitToDelete) setHabits(prev => [...prev, habitToDelete]);
          Alert.alert("Erreur", "Suppression impossible");
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
      
      // Nouvelle structure :
      case ViewState.PLANNING:
        return <Planning 
            tasks={tasks} 
            habits={habits} 
            goals={goals} 
            toggleTask={toggleTask} 
            toggleHabit={toggleHabit} 
            toggleGoal={toggleGoal} 
            addGoal={createGoal} 
            deleteGoal={deleteGoal} 
            createSubObjective={createSubObjective} 
            toggleSubObjective={toggleSubObjective} 
            deleteSubObjective={deleteSubObjective} 
            userId={user.id} 
            refreshGoals={()=>{}} 
            openMenu={() => setSidebarVisible(true)} 
            isDarkMode={isDarkMode} 
        />;
      case ViewState.INTROSPECTION:
        return <Introspection userId={user.id} openMenu={() => setSidebarVisible(true)} isDarkMode={isDarkMode} />;
      case ViewState.EVOLUTION:
        return <Evolution 
            player={player} 
            user={user} 
            tasks={tasks} 
            habits={habits} 
            goals={goals} 
            quests={quests} 
            openMenu={() => setSidebarVisible(true)} 
            openProfile={() => setProfileVisible(true)} 
            onAddTask={(t, p) => createTask(t, p as any)} 
            onAddHabit={(t) => createHabit({title: t})} 
            onAddGoal={createGoal} 
            onStartFocus={aiStartFocus} 
            isDarkMode={isDarkMode} 
        />;
      
      // Vues maintenues pour compatibilité ou accès direct si besoin
      case ViewState.TASKS: 
          return <Tasks tasks={tasks} goals={goals} toggleTask={toggleTask} addTask={createTask} deleteTask={deleteTask} createSubtask={createSubtask} toggleSubtask={toggleSubtask} deleteSubtask={deleteSubtask} userId={user.id} refreshTasks={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.HABITS: 
          return <Habits habits={habits} goals={goals} incrementHabit={toggleHabit} userId={user.id} createHabit={createHabit} archiveHabit={archiveHabit} deleteHabit={deleteHabit} refreshHabits={()=>{}} openMenu={() => setSidebarVisible(true)} {...commonProps} />;
      case ViewState.GOALS:
          return <Planning 
            tasks={tasks} habits={habits} goals={goals} toggleTask={toggleTask} toggleHabit={toggleHabit} toggleGoal={toggleGoal} addGoal={createGoal} deleteGoal={deleteGoal} createSubObjective={createSubObjective} toggleSubObjective={toggleSubObjective} deleteSubObjective={deleteSubObjective} userId={user.id} refreshGoals={()=>{}} openMenu={() => setSidebarVisible(true)} isDarkMode={isDarkMode} 
          />; // Redirection vers Planning pour garder la cohérence
      
      case ViewState.FOCUS_MODE:
        return <Focus onExit={() => setCurrentView(ViewState.TODAY)} tasks={tasks} isDarkMode={isDarkMode} openMenu={() => setSidebarVisible(true)} />;
      
      case ViewState.CALENDAR: // Redirige aussi vers Planning
        return <Planning 
            tasks={tasks} habits={habits} goals={goals} toggleTask={toggleTask} toggleHabit={toggleHabit} toggleGoal={toggleGoal} addGoal={createGoal} deleteGoal={deleteGoal} createSubObjective={createSubObjective} toggleSubObjective={toggleSubObjective} deleteSubObjective={deleteSubObjective} userId={user.id} refreshGoals={()=>{}} openMenu={() => setSidebarVisible(true)} isDarkMode={isDarkMode} 
        />;

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
                
                {/* Level Up Modal */}
                {player && (
                    <LevelUpModal 
                        visible={levelUpVisible} 
                        newLevel={player.level} 
                        onClose={() => setLevelUpVisible(false)} 
                    />
                )}

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