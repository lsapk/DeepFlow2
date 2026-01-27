
import { supabase } from './supabase';
import { PlayerProfile, Achievement } from '../types';

// Formule précise : 100 * level^2 XP pour atteindre le niveau SUIVANT
// Ex: Niv 1 -> 2 = 100 XP. Niv 2 -> 3 = 400 XP total requis.
export const getXpForNextLevel = (level: number) => {
    return 100 * Math.pow(level, 2);
};

export const getRankName = (level: number) => {
    if (level >= 50) return "Légende 🏆"; // 50+
    if (level >= 25) return "Maître 👑"; // 25-49
    if (level >= 10) return "Expert ⭐"; // 10-24
    if (level >= 5) return "Adepte 🔥";  // 5-9
    return "Novice 🌱";                  // 1-4
};

export const REWARDS = {
    TASK_LOW: 10,
    TASK_MEDIUM: 15,
    TASK_HIGH: 25,
    HABIT: 15,
    GOAL: 100,
    JOURNAL: 20,
    FOCUS_SHORT: 15, 
    FOCUS_POMODORO: 30, 
    FOCUS_DEEP: 50
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
    { id: 'first_quest', achievement_id: 'first_quest', title: 'Premier Pas', description: 'Complétez votre première quête.', icon: 'Flag', category: 'quest', target_value: 1 },
    { id: 'quest_master', achievement_id: 'quest_master', title: 'Mercenaire', description: 'Complétez 10 quêtes.', icon: 'Swords', category: 'quest', target_value: 10 },
    { id: 'focus_novice', achievement_id: 'focus_novice', title: 'Concentré', description: 'Terminez 5 sessions de focus.', icon: 'Zap', category: 'focus', target_value: 5 },
    { id: 'habit_streak_7', achievement_id: 'habit_streak_7', title: 'Imparable', description: 'Atteignez une série de 7 jours sur une habitude.', icon: 'Flame', category: 'habit', target_value: 7 },
    { id: 'level_10', achievement_id: 'level_10', title: 'Expert', description: 'Atteignez le niveau 10.', icon: 'Star', category: 'level', target_value: 10 },
    { id: 'journal_scribe', achievement_id: 'journal_scribe', title: 'Scribe', description: 'Écrivez 10 entrées de journal.', icon: 'BookOpen', category: 'journal', target_value: 10 },
    { id: 'rich', achievement_id: 'rich', title: 'Fortune', description: 'Cumulez 500 crédits.', icon: 'Coins', category: 'quest', target_value: 500 }
];

export const RARITY_COLORS = {
    common: '#9CA3AF',
    rare: '#60A5FA',
    epic: '#C4B5FD',
    legendary: '#FACC15'
};

export const addXp = async (userId: string, amount: number, player: PlayerProfile) => {
    let newXp = player.experience_points + amount;
    let currentLevel = player.level;
    let nextLevelXp = getXpForNextLevel(currentLevel);

    // Level Up Loop (in case massive XP gain jumps multiple levels)
    while (newXp >= nextLevelXp) {
        currentLevel++;
        // On ne déduit pas l'XP, c'est cumulatif selon la formule demandée
        nextLevelXp = getXpForNextLevel(currentLevel);
    }

    // Credits: 1 XP = 0.5 Credit (approx balanced)
    const creditsEarned = Math.floor(amount * 0.5);
    const newCredits = player.credits + creditsEarned;

    const { data, error } = await supabase
        .from('player_profiles')
        .update({ 
            experience_points: newXp,
            level: currentLevel,
            credits: newCredits
        })
        .eq('user_id', userId)
        .select()
        .single();
    
    return data;
};
