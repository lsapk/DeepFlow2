import { Task, Habit, Goal, FocusSession } from '../types';

interface ComputeProductivityScoreParams {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  focusSessions: Array<Pick<FocusSession, 'duration' | 'completed_at'>>;
  journalEntries?: Array<{ created_at: string }>;
  reflections?: Array<{ created_at: string }>;
  referenceDate?: Date;
  aiOffset?: number;
}

export const computeProductivityScore = ({
  tasks,
  habits,
  goals,
  focusSessions,
  journalEntries = [],
  reflections = [],
  referenceDate = new Date(),
  aiOffset = 0,
}: ComputeProductivityScoreParams): number => {

  // 1. RECENT ACTIVITY (Last 7 days)
  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oneDayAgo = new Date(referenceDate);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Daily Momentum: Tasks in last 24h count 1.5x
  const weightedTaskCount = tasks
    .filter(t => t.completed && t.updated_at && new Date(t.updated_at) >= sevenDaysAgo)
    .reduce((acc, t) => {
        const isRecent = new Date(t.updated_at!) >= oneDayAgo;
        return acc + (isRecent ? 1.5 : 1.0);
    }, 0);

  const recentFocusMinutes = focusSessions
    .filter(s => new Date(s.completed_at!) >= sevenDaysAgo)
    .reduce((acc, s) => {
        const isRecent = new Date(s.completed_at!) >= oneDayAgo;
        return acc + (s.duration || 0) * (isRecent ? 1.2 : 1.0); // Focus also gets a slight boost
    }, 0);

  // 24 weighted tasks in a week = 50 pts (Increased from 12)
  const taskComponent = Math.min(50, (weightedTaskCount / 24) * 50);
  // 10 hours (600 min) of weighted focus in a week = 50 pts (Increased from 360)
  const focusComponent = Math.min(50, (recentFocusMinutes / 600) * 50);
  const recentActivityScore = taskComponent + focusComponent; // Max 100

  // 2. HABITS & CONSISTENCY (Last 14 days)
  const activeHabits = habits.filter(h => !h.is_archived);
  const habitConsistency = activeHabits.length > 0
    ? (activeHabits.reduce((acc, h) => acc + Math.min(100, (h.streak / 14) * 100), 0) / activeHabits.length)
    : 0;

  // 3. GOALS PROGRESS
  const activeGoals = goals.filter(g => !g.is_archived);
  const goalRate = activeGoals.length > 0
    ? (activeGoals.reduce((acc, g) => acc + (g.progress || (g.completed ? 100 : 0)), 0) / activeGoals.length)
    : 70; // Default to 70 if no goals to not penalize

  // 4. CONTENT DIVERSITY (Bonus for using the app's features)
  const hasJournal = journalEntries.some(j => new Date(j.created_at) >= sevenDaysAgo) ? 50 : 0;
  const hasReflections = reflections.some(r => new Date(r.created_at) >= sevenDaysAgo) ? 50 : 0;
  const diversityScore = hasJournal + hasReflections; // Max 100

  // FINAL WEIGHTED SCORE (Algorithm part)
  // Recent Activity (Tasks/Focus): 50%
  // Habit Consistency: 20%
  // Goal Progress: 20%
  // Diversity (Journal/Reflection): 10%

  const algoScore = (recentActivityScore * 0.50) +
                    (habitConsistency * 0.20) +
                    (goalRate * 0.20) +
                    (diversityScore * 0.10);

  // Apply AI Offset
  let finalScore = algoScore + aiOffset;

  return Math.round(Math.max(0, Math.min(100, finalScore)));
};
