
import { supabase } from './supabase';
import { PlatformStats, UserProfile, PlayerProfile, Announcement, Task, Habit, Goal, FocusSession } from '../types';

export const isAdmin = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    return !!data;
};

export const getPlatformStats = async (): Promise<PlatformStats> => {
    const [users, banned, tasks, habits, goals, focus] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact' }),
        supabase.from('user_profiles').select('id', { count: 'exact' }).eq('is_banned', true),
        supabase.from('tasks').select('id', { count: 'exact' }),
        supabase.from('habits').select('id', { count: 'exact' }),
        supabase.from('goals').select('id', { count: 'exact' }),
        supabase.from('focus_sessions').select('duration')
    ]);

    // Active this week (mocking for now as we don't have last_login_at in schema, or we could use created_at)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { count: activeCount } = await supabase.from('user_profiles').select('id', { count: 'exact' }).gt('created_at', oneWeekAgo.toISOString());

    const totalFocusMinutes = focus.data?.reduce((acc, curr) => acc + curr.duration, 0) || 0;

    return {
        totalUsers: users.count || 0,
        activeThisWeek: activeCount || 0,
        totalBanned: banned.count || 0,
        totalTasks: tasks.count || 0,
        totalHabits: habits.count || 0,
        totalGoals: goals.count || 0,
        totalFocusHours: Math.round(totalFocusMinutes / 60)
    };
};

export const getAllUsers = async (search?: string): Promise<UserProfile[]> => {
    let query = supabase.from('user_profiles').select('*').order('created_at', { ascending: false });

    if (search) {
        query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data } = await query;
    return data || [];
};

export const getUserFullDetails = async (userId: string) => {
    const [player, tasks, habits, goals, focus] = await Promise.all([
        supabase.from('player_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('tasks').select('*', { count: 'exact' }).eq('user_id', userId),
        supabase.from('habits').select('*', { count: 'exact' }).eq('user_id', userId),
        supabase.from('goals').select('*', { count: 'exact' }).eq('user_id', userId),
        supabase.from('focus_sessions').select('duration').eq('user_id', userId)
    ]);

    const totalFocusMinutes = focus.data?.reduce((acc, curr) => acc + curr.duration, 0) || 0;

    return {
        player: player.data as PlayerProfile,
        tasksCount: tasks.count || 0,
        habitsCount: habits.count || 0,
        goalsCount: goals.count || 0,
        focusMinutes: totalFocusMinutes
    };
};

export const banUser = async (userId: string, reason: string) => {
    return await supabase.from('user_profiles').update({ is_banned: true, ban_reason: reason }).eq('id', userId);
};

export const unbanUser = async (userId: string) => {
    return await supabase.from('user_profiles').update({ is_banned: false, ban_reason: null }).eq('id', userId);
};

export const updateUserCredits = async (userId: string, amount: number) => {
    return await supabase.from('player_profiles').update({ credits: amount }).eq('user_id', userId);
};

export const createAnnouncement = async (message: string) => {
    return await supabase.from('announcements').insert({ message, is_active: true });
};

export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
    const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
    return data || [];
};

export const deleteAnnouncement = async (id: string) => {
    return await supabase.from('announcements').update({ is_active: false }).eq('id', id);
};
