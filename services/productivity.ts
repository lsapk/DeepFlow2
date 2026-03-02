import { Task, Habit, Goal, FocusSession } from '../types';

interface ComputeProductivityScoreParams {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  focusSessions: Array<Pick<FocusSession, 'duration' | 'completed_at'>>;
  journalEntries?: Array<{ created_at: string }>;
  reflections?: Array<{ created_at: string }>;
  referenceDate?: Date;
}

export const computeProductivityScore = ({
  tasks,
  habits,
  goals,
  focusSessions,
  journalEntries = [],
  reflections = [],
  referenceDate = new Date(),
}: ComputeProductivityScoreParams): number => {
  const isSameDay = (d1: Date, d2: Date) => (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );

  const sixtyDaysAgo = new Date(referenceDate);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // 1. REGULARITY (Last 60 days) - Exponential decay for older activity
  const activityDays = new Map<string, number>();
  const addActivity = (dateStr?: string | null) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d >= sixtyDaysAgo && d <= referenceDate) {
      const dateKey = d.toISOString().split('T')[0];
      const daysDiff = Math.floor((referenceDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const weight = Math.exp(-daysDiff / 30); // Higher weight for recent days
      activityDays.set(dateKey, Math.max(activityDays.get(dateKey) || 0, weight));
    }
  };

  focusSessions.forEach(s => addActivity(s.completed_at));
  journalEntries.forEach(j => addActivity(j.created_at));
  reflections.forEach(r => addActivity(r.created_at));
  tasks.forEach(t => { if (t.completed) addActivity(t.created_at || t.due_date); });

  let weightedRegularity = 0;
  activityDays.forEach(weight => { weightedRegularity += weight; });
  const regularityScore = Math.min(100, (weightedRegularity / 25) * 100); // Softened from 45 to 25 weighted days

  // 2. CONTENT RICHNESS & DIVERSITY (Based on last 14 days)
  const fourteenDaysAgo = new Date(referenceDate);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const hasJournal = journalEntries.some(j => new Date(j.created_at) >= fourteenDaysAgo) ? 20 : 0;
  const hasReflections = reflections.some(r => new Date(r.created_at) >= fourteenDaysAgo) ? 20 : 0;
  const hasFocus = focusSessions.some(s => new Date(s.completed_at!) >= fourteenDaysAgo) ? 20 : 0;
  const hasTasks = tasks.some(t => t.completed && new Date(t.created_at) >= fourteenDaysAgo) ? 20 : 0;
  const hasHabits = habits.some(h => h.streak > 0) ? 20 : 0;
  const contentDiversityScore = hasJournal + hasReflections + hasFocus + hasTasks + hasHabits;

  // 3. PERFORMANCE (Last 30 days)
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTasks = tasks.filter(t => new Date(t.created_at) >= thirtyDaysAgo);
  const taskRate = recentTasks.length > 0 ? (recentTasks.filter(t => t.completed).length / recentTasks.length) * 100 : 70;

  const recentGoals = goals.filter(g => !g.is_archived);
  const goalRate = recentGoals.length > 0 ? (recentGoals.reduce((acc, g) => acc + (g.progress || (g.completed ? 100 : 0)), 0) / recentGoals.length) : 50;

  const performanceScore = (taskRate * 0.5) + (goalRate * 0.5);

  // 4. HABITS & STREAKS (Focus on consistency)
  const activeHabits = habits.filter(h => !h.is_archived);
  const habitConsistency = activeHabits.length > 0
    ? (activeHabits.reduce((acc, h) => acc + Math.min(100, (h.streak / 30) * 100), 0) / activeHabits.length)
    : 0;

  // 5. INTENSITY (Focus Duration)
  const totalRecentFocusMinutes = focusSessions
    .filter(s => new Date(s.completed_at!) >= fourteenDaysAgo)
    .reduce((acc, s) => acc + (s.duration || 0), 0);
  const intensityScore = Math.min(100, (totalRecentFocusMinutes / 600) * 100); // Softened: 10 hours of focus in 14 days for max

  // FINAL WEIGHTED SCORE
  const score = (regularityScore * 0.30) +
                (contentDiversityScore * 0.20) +
                (performanceScore * 0.20) +
                (habitConsistency * 0.15) +
                (intensityScore * 0.15);

  return Math.round(Math.min(100, score));
};
