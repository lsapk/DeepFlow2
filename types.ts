
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
  icon?: string; // Icon name (Used locally, not in DB)
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

// Penguin System Types
export type PenguinStage = 'egg' | 'chick' | 'explorer' | 'emperor';
export type PenguinClimate = 'active' | 'resting';
export type FoodType = 'shrimp' | 'salmon' | 'golden_fish';

export interface PenguinProfile {
  id: string;
  user_id: string;
  stage: PenguinStage;
  shrimp_total: number;
  salmon_total: number;
  golden_fish_total: number;
  shrimp_today: number;
  shrimp_daily_limit: number;
  last_shrimp_reset: string;
  iceberg_size: number;
  climate_state: PenguinClimate;
  equipped_accessories: string[];
  has_radio: boolean;
  has_library: boolean;
  has_lounge_chair: boolean;
  created_at: string;
  updated_at: string;
}

export interface PenguinAccessory {
  id: string;
  user_id: string;
  accessory_id: string;
  accessory_name: string;
  accessory_type: string;
  unlocked_at: string;
}

export interface PenguinExpedition {
  id: string;
  user_id: string;
  title: string;
  description: string;
  expedition_type: 'daily' | 'weekly';
  target_value: number;
  current_progress: number;
  reward_type: FoodType;
  reward_amount: number;
  started_at: string;
  expires_at?: string;
  completed: boolean;
  completed_at?: string;
}

export interface PenguinFoodLog {
  id: string;
  user_id: string;
  food_type: FoodType;
  source: string;
  earned_at: string;
}

export interface PenguinPearl {
  id: string;
  user_id: string;
  pearl_type: 'efficiency' | 'resilience' | 'growth';
  message: string;
  data: any;
  created_at: string;
  is_read: boolean;
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
  EVOLUTION = 'EVOLUTION', 
  FOCUS_MODE = 'FOCUS_MODE',
  TASKS = 'TASKS',
  HABITS = 'HABITS',
  GOALS = 'GOALS',    
  GROWTH = 'GROWTH',
  CYBER_KNIGHT = 'CYBER_KNIGHT',
  PENGUIN_ARENA = 'PENGUIN_ARENA',
  JOURNAL = 'JOURNAL',
  REFLECTION = 'REFLECTION',
  CALENDAR = 'CALENDAR',
  ADMIN = 'ADMIN'
}
