
// derived from provided schema

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface AiPermissions {
    tasks: boolean;
    habits: boolean;
    goals: boolean;
    journal: boolean;
    focus: boolean;
    profile: boolean;
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
  unlocked_features?: {
      ai_permissions?: AiPermissions;
      [key: string]: any;
  };
}

// Avatar Types
export type AvatarClass = 'cyber_knight' | 'neon_hacker' | 'quantum_warrior' | 'shadow_ninja' | 'cosmic_sage';
export type AvatarHelmet = 'standard' | 'visor' | 'crown' | 'halo';
export type AvatarArmor = 'standard' | 'heavy' | 'stealth' | 'energy';
export type AvatarColor = '#C4B5FD' | '#34D399' | '#F472B6' | '#60A5FA' | '#FACC15' | '#F87171' | '#A78BFA';

export interface AvatarConfig {
    class: AvatarClass;
    helmet: AvatarHelmet;
    armor: AvatarArmor;
    color: AvatarColor;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  experience_points: number;
  level: number;
  avatar_type: string; // Legacy fallback
  avatar_customization: AvatarConfig; // New structure
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
  quest_type: 'daily' | 'weekly' | 'achievement';
  expires_at?: string;
  icon?: string; // Icon name
}

export interface Achievement {
    id: string;
    achievement_id: string; 
    title: string;
    description: string;
    icon: string;
    category: 'quest' | 'focus' | 'habit' | 'level' | 'task' | 'journal';
    target_value: number;
}

export interface ShopItem {
    id: string;
    title: string;
    description: string;
    price: number;
    category: 'boost' | 'protection' | 'box' | 'cosmetic';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    icon: string;
    color: string;
    metadata?: any; // For cosmetics: { type: 'helmet', value: 'halo' }
}

export interface FocusSession {
  id: string;
  duration: number; // in minutes
  completed_at: string;
  session_type: string;
  title?: string | null;
  linked_task_id?: string | null;
  started_at?: string;
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
    color?: string;
    description?: string;
    location?: string;
    meta?: any;
}

export enum ViewState {
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  TODAY = 'TODAY',
  PLANNING = 'PLANNING', 
  INTROSPECTION = 'INTROSPECTION', 
  EVOLUTION = 'EVOLUTION', 
  FOCUS_MODE = 'FOCUS_MODE',
  TASKS = 'TASKS',
  HABITS = 'HABITS',
  GOALS = 'GOALS',    
  GROWTH = 'GROWTH',
  CYBER_KNIGHT = 'CYBER_KNIGHT',
  JOURNAL = 'JOURNAL',
  REFLECTION = 'REFLECTION',
  CALENDAR = 'CALENDAR'
}
