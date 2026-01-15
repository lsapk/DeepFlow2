// derived from provided schema

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
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

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  frequency: string;
  streak: number;
  target: number;
  category: string | null;
  last_completed_at: string | null;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward_xp: number;
  reward_credits: number;
  completed: boolean;
  target_value: number;
  current_progress: number;
}

export interface FocusSession {
  id: string;
  duration: number; // in minutes
  completed_at: string;
  session_type: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  mood: 'happy' | 'neutral' | 'sad' | 'energetic' | 'tired';
  created_at: string;
}

export enum ViewState {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  HABITS = 'HABITS',
  FOCUS = 'FOCUS',
  JOURNAL = 'JOURNAL',
  PROFILE = 'PROFILE'
}