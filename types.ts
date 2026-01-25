// derived from provided schema

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface UserSettings {
  id: string;
  theme: string;
  language: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  focus_mode: boolean;
  clock_format: string;
  karma_points?: number;
  unlocked_features?: any;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  experience_points: number;
  level: number;
  avatar_type: string;
  credits: number;
  total_quests_completed: number;
}

export interface Subtask {
  id: string;
  parent_task_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  sort_order: number;
  created_at: string;
  linked_goal_id?: string | null;
  // UI Helper properties
  subtasks?: Subtask[]; 
  isExpanded?: boolean;
}

export interface SubObjective {
  id: string;
  parent_goal_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  target_date: string | null;
  progress?: number;
  category?: string | null;
  is_archived?: boolean;
  sort_order: number;
  created_at: string;
  // UI Helper properties
  subobjectives?: SubObjective[];
  isExpanded?: boolean;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  frequency: string;
  streak: number;
  target: number;
  category: string | null;
  last_completed_at: string | null;
  is_archived?: boolean; 
  sort_order?: number;
  created_at: string;
  days_of_week?: number[] | null;
  linked_goal_id?: string | null;
}

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  reward_xp: number;
  reward_credits: number;
  completed: boolean;
  target_value: number;
  current_progress: number;
  quest_type: string;
  expires_at?: string;
}

export interface Achievement {
    id: string;
    achievement_id: string; // string identifier like 'first_win'
    title: string;
    description: string;
    icon: string;
}

export interface UnlockedAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
}

export interface FocusSession {
  id: string;
  duration: number; // in minutes
  completed_at: string;
  session_type: string;
  title?: string | null;
  linked_task_id?: string | null;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: 'happy' | 'neutral' | 'sad' | 'energetic' | 'tired' | string;
  tags?: string[];
  created_at: string;
}

export interface Reflection {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start_time?: string;
    end_time?: string;
    is_all_day: boolean;
    type: 'task' | 'habit' | 'google';
    status: 'pending' | 'completed';
    meta?: any;
}

export enum ViewState {
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  TODAY = 'TODAY',
  PLANNING = 'PLANNING', // Nouveau : Calendrier + Objectifs
  INTROSPECTION = 'INTROSPECTION', // Nouveau : Journal + Réflexion
  EVOLUTION = 'EVOLUTION', // Nouveau : Growth + CyberKnight
  FOCUS_MODE = 'FOCUS_MODE',
  
  // Vues internes (peuvent être accessibles via "Tout voir" ou autre, mais moins prioritaires dans la nav principale)
  TASKS = 'TASKS',
  HABITS = 'HABITS',
  GOALS = 'GOALS',    
  GROWTH = 'GROWTH',
  CYBER_KNIGHT = 'CYBER_KNIGHT',
  JOURNAL = 'JOURNAL',
  REFLECTION = 'REFLECTION',
  CALENDAR = 'CALENDAR'
}