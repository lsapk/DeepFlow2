
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
            console.error('Error creating penguin profile:', createError);
            return null;
        }
        return newProfile;
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
        updates.shrimp_total = profile.shrimp_total + amount;
        updates.shrimp_today = profile.shrimp_today + amount;
    } else if (type === 'salmon') {
        updates.salmon_total = profile.salmon_total + amount;
        // Salmon increases iceberg size
        updates.iceberg_size = profile.iceberg_size + (amount * 2);
    } else if (type === 'golden_fish') {
        updates.golden_fish_total = profile.golden_fish_total + amount;
    }

    // Handle Evolution
    if (profile.stage === 'egg' && (updates.shrimp_total || profile.shrimp_total) > 0) {
        // Normally evolves when first goal is set, but let's say some shrimp/salmon trigger it too if needed
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

export const getUnlockedAccessories = async (userId: string): Promise<PenguinAccessory[]> => {
    const { data } = await supabase
        .from('penguin_accessories')
        .select('*')
        .eq('user_id', userId);
    return data || [];
};
