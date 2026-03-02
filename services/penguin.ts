
import { supabase } from './supabase';
import { PenguinProfile, PenguinFoodLog, PenguinExpedition, PenguinPearl, PenguinAccessory, FoodType, PenguinStage } from '../types';

export const PENGUIN_STAGES: PenguinStage[] = ['egg', 'chick', 'explorer', 'emperor'];

export const getPenguinProfile = async (userId: string): Promise<PenguinProfile | null> => {
    const { data, error } = await supabase
        .from('penguin_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching penguin profile:', error);
        return null;
    }

    if (!data) {
        // Create initial profile if it doesn't exist
        try {
            const { data: newProfile, error: createError } = await supabase
                .from('penguin_profiles')
                .insert({
                    user_id: userId,
                    stage: 'egg',
                    shrimp_total: 0,
                    salmon_total: 0,
                    golden_fish_total: 0,
                    shrimp_today: 0,
                    shrimp_daily_limit: 10,
                    last_shrimp_reset: new Date().toISOString().split('T')[0],
                    iceberg_size: 1,
                    climate_state: 'active',
                    equipped_accessories: [],
                    has_radio: false,
                    has_library: false,
                    has_lounge_chair: false
                })
                .select()
                .single();

            if (createError) {
                if (createError.code === '42501') {
                    console.warn('RLS Policy prevents direct insert of penguin profile. Check database policies.');
                }
                console.error('Error creating penguin profile:', createError);
                return null;
            }
            return newProfile;
        } catch (e) {
            console.error('Critical error creating penguin profile:', e);
            return null;
        }
    }

    // Check for daily reset of shrimp
    const today = new Date().toISOString().split('T')[0];
    if (data.last_shrimp_reset !== today) {
        const { data: updatedProfile } = await supabase
            .from('penguin_profiles')
            .update({
                shrimp_today: 0,
                last_shrimp_reset: today
            })
            .eq('id', data.id)
            .select()
            .single();
        return updatedProfile;
    }

    return data;
};

export const awardFood = async (userId: string, type: FoodType, amount: number, source: string) => {
    const profile = await getPenguinProfile(userId);
    if (!profile) return;

    if (type === 'shrimp') {
        if (profile.shrimp_today >= profile.shrimp_daily_limit) {
            console.log('Daily shrimp limit reached');
            return;
        }
        const remainingLimit = profile.shrimp_daily_limit - profile.shrimp_today;
        amount = Math.min(amount, remainingLimit);
    }

    const updates: any = {};
    if (type === 'shrimp') {
        updates.shrimp_total = (profile.shrimp_total || 0) + amount;
        updates.shrimp_today = (profile.shrimp_today || 0) + amount;
    } else if (type === 'salmon') {
        updates.salmon_total = (profile.salmon_total || 0) + amount;
        updates.iceberg_size = (profile.iceberg_size || 1) + (amount * 2);
    } else if (type === 'golden_fish') {
        updates.golden_fish_total = (profile.golden_fish_total || 0) + amount;
    }

    // Auto-evolve to chick if egg and earns first food
    if (profile.stage === 'egg' && amount > 0) {
        updates.stage = 'chick';
    }

    const { error: updateError } = await supabase
        .from('penguin_profiles')
        .update(updates)
        .eq('user_id', userId);

    if (!updateError) {
        await supabase.from('penguin_food_log').insert({
            user_id: userId,
            food_type: type,
            source: source,
            earned_at: new Date().toISOString()
        });
    }
};

export const evolvePenguin = async (userId: string, nextStage: PenguinStage) => {
    await supabase
        .from('penguin_profiles')
        .update({ stage: nextStage, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
};

export const getExpeditions = async (userId: string): Promise<PenguinExpedition[]> => {
    const { data } = await supabase
        .from('penguin_expeditions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false);
    return data || [];
};

export const getPearls = async (userId: string): Promise<PenguinPearl[]> => {
    const { data } = await supabase
        .from('penguin_pearls')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return data || [];
};

export const markPearlAsRead = async (pearlId: string) => {
    await supabase.from('penguin_pearls').update({ is_read: true }).eq('id', pearlId);
};

export const syncLegacyProgress = async (userId: string) => {
    // Fetch historical data
    const [tasks, focus] = await Promise.all([
        supabase.from('tasks').select('id').eq('user_id', userId).eq('completed', true),
        supabase.from('focus_sessions').select('duration').eq('user_id', userId)
    ]);

    const completedTasksCount = tasks.data?.length || 0;
    const totalFocusMinutes = focus.data?.reduce((acc, s) => acc + s.duration, 0) || 0;

    // Conversion logic
    const shrimpToAward = Math.min(100, completedTasksCount); // Cap it for balance
    const salmonToAward = Math.floor(totalFocusMinutes / 60);

    const profile = await getPenguinProfile(userId);
    if (!profile) return;

    const updates: any = {
        shrimp_total: (profile.shrimp_total || 0) + shrimpToAward,
        salmon_total: (profile.salmon_total || 0) + salmonToAward,
        iceberg_size: (profile.iceberg_size || 1) + (salmonToAward * 2)
    };

    if (profile.stage === 'egg' && (shrimpToAward > 0 || salmonToAward > 0)) {
        updates.stage = 'chick';
    }

    // Check for further evolution
    if (updates.shrimp_total > 50 || updates.salmon_total > 10) {
        updates.stage = 'explorer';
    }
    if (updates.shrimp_total > 200 && updates.salmon_total > 50) {
        updates.stage = 'emperor';
    }

    await supabase.from('penguin_profiles').update(updates).eq('user_id', userId);
};
