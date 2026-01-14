import { Habit, Quest, Task, UserProfile, PlayerProfile } from "./types";

export const APP_NAME = "DeepFlow";

// Mock Data for UI demonstration
export const MOCK_USER: UserProfile = {
  id: "u1",
  display_name: "Alex Dev",
  email: "alex@example.com",
  photo_url: "https://picsum.photos/200",
  bio: "Productivity enthusiast",
  created_at: new Date().toISOString()
};

export const MOCK_PLAYER: PlayerProfile = {
  id: "p1",
  user_id: "u1",
  experience_points: 2450,
  level: 5,
  avatar_type: "cyber_knight",
  credits: 150,
  total_quests_completed: 12
};

export const MOCK_TASKS: Task[] = [
  {
    id: "t1",
    user_id: "u1",
    title: "Complete project documentation",
    description: "Write the README and API docs",
    completed: false,
    due_date: new Date().toISOString(),
    priority: "high",
    created_at: new Date().toISOString()
  },
  {
    id: "t2",
    user_id: "u1",
    title: "Review pull requests",
    description: null,
    completed: true,
    due_date: new Date().toISOString(),
    priority: "medium",
    created_at: new Date().toISOString()
  },
  {
    id: "t3",
    user_id: "u1",
    title: "Buy groceries",
    description: "Milk, eggs, bread",
    completed: false,
    due_date: null,
    priority: "low",
    created_at: new Date().toISOString()
  }
];

export const MOCK_HABITS: Habit[] = [
  {
    id: "h1",
    user_id: "u1",
    title: "Morning Meditation",
    frequency: "daily",
    streak: 5,
    target: 1,
    category: "Mindfulness",
    last_completed_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "h2",
    user_id: "u1",
    title: "Code for 1 hour",
    frequency: "daily",
    streak: 12,
    target: 1,
    category: "Skill",
    last_completed_at: new Date().toISOString()
  },
  {
    id: "h3",
    user_id: "u1",
    title: "Drink 2L Water",
    frequency: "daily",
    streak: 0,
    target: 2,
    category: "Health",
    last_completed_at: null
  }
];

export const MOCK_QUESTS: Quest[] = [
  {
    id: "q1",
    title: "Weekly Warrior",
    description: "Complete 20 tasks this week",
    reward_xp: 500,
    reward_credits: 50,
    completed: false,
    target_value: 20,
    current_progress: 15
  },
  {
    id: "q2",
    title: "Zen Master",
    description: "Meditate for 3 days in a row",
    reward_xp: 200,
    reward_credits: 20,
    completed: true,
    target_value: 3,
    current_progress: 3
  }
];