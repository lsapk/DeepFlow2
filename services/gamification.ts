import { supabase } from './supabase';
import { PlayerProfile } from '../types';

// Formule documentation: 100 * level^2 XP pour le niveau suivant
export const getXpForNextLevel = (level: number) => {
    return 100 * Math.pow(level, 2);
};

export const getRankName = (level: number) => {
    if (level >= 50) return "Légende 🏆";
    if (level >= 25) return "Maître 👑";
    if (level >= 10) return "Expert ⭐";
    if (level >= 5) return "Adepte 🔥";
    return "Novice 🌱";
};

export const REWARDS = {
    TASK_LOW: 10,
    TASK_MEDIUM: 10,
    TASK_HIGH: 20,
    HABIT: 15,
    GOAL: 100,
    JOURNAL: 20,
    FOCUS_SHORT: 15, // < 25 min
    FOCUS_POMODORO: 25, // 25+ min
    FOCUS_DEEP: 40 // 45+ min
};

export const addXp = async (userId: string, amount: number, player: PlayerProfile) => {
    let newXp = player.experience_points + amount;
    let newLevel = player.level;
    const xpNeeded = getXpForNextLevel(newLevel);

    // Level Up Logic
    if (newXp >= xpNeeded) {
        newLevel += 1;
        // On pourrait reset l'XP ici ou le garder cumulatif. 
        // La doc dit "XP cumulés", donc on garde l'XP total mais on augmente le seuil.
    }

    // Update Credits (1 XP = 0.1 Credit approx, or specific logic)
    // Doc says Quest rewards XP + Credits. Let's give 1 credit per 10 XP for generic actions.
    const creditsEarned = Math.floor(amount / 10);
    const newCredits = player.credits + creditsEarned;

    const { data, error } = await supabase
        .from('player_profiles')
        .update({ 
            experience_points: newXp,
            level: newLevel,
            credits: newCredits
        })
        .eq('user_id', userId)
        .select()
        .single();
    
    return data;
};