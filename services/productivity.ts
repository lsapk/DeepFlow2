import { Task, Habit, Goal, FocusSession } from '../types';

interface ComputeProductivityScoreParams {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  focusSessions: Array<Pick<FocusSession, 'duration'>>;
  referenceDate?: Date;
}

export const computeProductivityScore = ({
  tasks,
  habits,
  goals,
  focusSessions,
  referenceDate = new Date(),
}: ComputeProductivityScoreParams): number => {
  const isSameDay = (d1: Date, d2: Date) => (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );

  const dayOfWeek = referenceDate.getDay();
  const activeHabits = habits.filter((h) => !h.is_archived);

  const todaysHabits = activeHabits.filter((h) => {
    if (!h.days_of_week || h.days_of_week.length === 0) return true;
    return h.days_of_week.includes(dayOfWeek);
  });

  const habitsDoneToday = todaysHabits.filter(
    (h) => h.last_completed_at && isSameDay(new Date(h.last_completed_at), referenceDate)
  ).length;
  const habitsTodayRate = todaysHabits.length > 0 ? (habitsDoneToday / todaysHabits.length) * 100 : 50;

  const averageHabitStreak = activeHabits.length > 0
    ? activeHabits.reduce((acc, h) => acc + (h.streak || 0), 0) / activeHabits.length
    : 0;
  const streakScore = Math.min(100, (averageHabitStreak / 30) * 100);
  const habitScore = (habitsTodayRate * 0.6) + (streakScore * 0.4);

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const completedGoalsCount = goals.filter((g) => g.completed).length;

  const taskScore = tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 50;
  const goalScore = goals.length > 0 ? (completedGoalsCount / goals.length) * 100 : 50;

  const totalFocusMinutes = focusSessions.reduce((acc, session) => acc + (session.duration || 0), 0);
  const focusScore = Math.min(100, (totalFocusMinutes / 600) * 100);

  const score = (taskScore * 0.3) + (goalScore * 0.25) + (habitScore * 0.25) + (focusScore * 0.2);
  return Math.round(score);
};
