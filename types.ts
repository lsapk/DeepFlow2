
// derived from provided schema

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at?: string;
  is_banned?: boolean;
  ban_reason?: string | null;
}


export interface Subscriber {
  id: string;
  user_id: string;
  email: string;
  stripe_customer_id: string | null;
  subscribed: boolean;
  subscription_tier: 'basic' | 'premium' | string;
  subscription_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiCredits {
  id: string;
  user_id: string;
  credits: number;
  created_at: string;
  last_updated: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  created_by?: string | null;
}

export interface PlatformStats {
  totalUsers: number;
  activeThisWeek: number;
  totalBanned: number;
  totalTasks: number;
  totalHabits: number;
  totalGoals: number;
  totalFocusHours: number;
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
  dark_mode?: boolean;
  karma_points?: number;
  gemini_api_key?: string | null;
  unlocked_features?: {
      ai_permissions?: AiPermissions;
      [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Subtask {
  id: string;
  parent_task_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high';
  completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
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
  updated_at?: string;
  linked_goal_id?: string | null;
  google_task_id?: string | null;
  offline_id?: string | null;
  synced_at?: string | null;
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
  updated_at?: string;
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

export interface FocusSession {
  id: string;
  duration: number; // in minutes
  completed_at: string;
  title?: string | null;
  started_at?: string;
  // NOTE: session_type and linked_task_id removed as they are not in DB schema
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: 'happy' | 'neutral' | 'sad' | 'energetic' | 'tired' | 'inspired' | 'stressed' | 'calm' | 'focused' | 'anxious' | 'excited' | string;
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
    type: 'task' | 'habit' | 'google' | 'custom';
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
  FOCUS_MODE = 'FOCUS_MODE',
  TASKS = 'TASKS',
  HABITS = 'HABITS',
  GOALS = 'GOALS',    
  GROWTH = 'GROWTH',
  JOURNAL = 'JOURNAL',
  REFLECTION = 'REFLECTION',
  CALENDAR = 'CALENDAR',
  ADMIN = 'ADMIN'
}
