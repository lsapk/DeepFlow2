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
  TODAY = 'TODAY',      // Dashboard + Tasks + Habits + Focus entry
  GROWTH = 'GROWTH',    // Goals + Journal
  EXPLORE = 'EXPLORE',  // IA + Cyber Knight
  FOCUS_MODE = 'FOCUS_MODE' // Full screen focus
}