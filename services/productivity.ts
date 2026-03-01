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

  // 1. REGULARITY (Last 60 days)
  const activityDays = new Set<string>();
  const addActivity = (dateStr?: string | null) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d >= sixtyDaysAgo && d <= referenceDate) {
      activityDays.add(d.toISOString().split('T')[0]);
    }
  };

  focusSessions.forEach(s => addActivity(s.completed_at));
  journalEntries.forEach(j => addActivity(j.created_at));
  reflections.forEach(r => addActivity(r.created_at));
  tasks.forEach(t => { if (t.completed) addActivity(t.created_at); });

  const regularityScore = (activityDays.size / 60) * 100;

  // 2. CONTENT RICHNESS & DIVERSITY
  const hasJournal = journalEntries.length > 0 ? 20 : 0;
  const hasReflections = reflections.length > 0 ? 20 : 0;
  const hasFocus = focusSessions.length > 0 ? 20 : 0;
  const hasTasks = tasks.length > 0 ? 20 : 0;
  const hasHabits = habits.length > 0 ? 20 : 0;
  const contentDiversityScore = hasJournal + hasReflections + hasFocus + hasTasks + hasHabits;

  // 3. PERFORMANCE (Tasks & Goals)
  const taskRate = tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 50;
  const goalRate = goals.length > 0 ? (goals.filter(g => g.completed).length / goals.length) * 100 : 50;
  const performanceScore = (taskRate * 0.6) + (goalRate * 0.4);

  // 4. HABITS & STREAKS
  const activeHabits = habits.filter(h => !h.is_archived);
  const avgStreak = activeHabits.length > 0 ? activeHabits.reduce((acc, h) => acc + h.streak, 0) / activeHabits.length : 0;
  const habitScore = Math.min(100, (avgStreak / 21) * 100); // 21 days for a habit

  // FINAL WEIGHTED SCORE
  const score = (regularityScore * 0.35) + (contentDiversityScore * 0.25) + (performanceScore * 0.20) + (habitScore * 0.20);

  return Math.round(Math.min(100, score));
};
