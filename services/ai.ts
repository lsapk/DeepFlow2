import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';
import { getDailyLimit, getUserSubscription, isPremiumSubscriber, isAdminUser, AiFeatureType } from './subscription';

// Expo n'expose côté client que les variables préfixées par EXPO_PUBLIC_.
// On garde des fallbacks pour compatibilité (web / anciennes configs).
const getApiKey = () => (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY
);



const getAiLimitMessage = (type: AiFeatureType) => {
    if (type === 'chat') {
        return "🚫 **Limite atteinte**\n\nLe plan Basic autorise 5 chats IA par jour. Passez Premium (Stripe) pour des chats illimités.";
    }
    return "🚫 **Limite atteinte**\n\nLe plan Basic autorise 1 analyse IA par jour. Passez Premium (Stripe) pour des analyses illimitées.";
};

const canUseAi = async (type: AiFeatureType): Promise<{ allowed: boolean; message?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { allowed: true };

        const [subscription, usageRes, adminMode] = await Promise.all([
            getUserSubscription(user.id),
            supabase
                .from('daily_usage')
                .select('ai_chat_count, ai_analysis_count')
                .eq('user_id', user.id)
                .eq('usage_date', new Date().toISOString().split('T')[0])
                .maybeSingle(),
            isAdminUser(user.id)
        ]);

        const isPremium = isPremiumSubscriber(subscription);

        // Admin = illimité automatiquement (aligné web app), même sans abonnement Stripe.
        if (adminMode) return { allowed: true };

        const limit = getDailyLimit(type, isPremium);

        if (limit === Number.POSITIVE_INFINITY) return { allowed: true };

        const count = type === 'chat'
            ? (usageRes.data?.ai_chat_count || 0)
            : (usageRes.data?.ai_analysis_count || 0);

        if (count >= limit) {
            return { allowed: false, message: getAiLimitMessage(type) };
        }

        return { allowed: true };
    } catch {
        return { allowed: true };
    }
};

async function logAiUsage(type: 'chat' | 'analysis') {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        
        const { data: existing } = await supabase
            .from('daily_usage')
            .select('*')
            .eq('user_id', user.id)
            .eq('usage_date', today)
            .maybeSingle();

        if (existing) {
            await supabase.from('daily_usage').update({
                ai_chat_count: type === 'chat' ? (existing.ai_chat_count || 0) + 1 : existing.ai_chat_count,
                ai_analysis_count: type === 'analysis' ? (existing.ai_analysis_count || 0) + 1 : existing.ai_analysis_count
            }).eq('id', existing.id);
        } else {
            await supabase.from('daily_usage').insert({
                user_id: user.id,
                usage_date: today,
                ai_chat_count: type === 'chat' ? 1 : 0,
                ai_analysis_count: type === 'analysis' ? 1 : 0
            });
        }
    } catch (e) {
        // Silencieux si échec (offline ou table manquante)
    }
}

export const generateActionableCoaching = async (
  userMessage: string, 
  userContext: any,
  isCreationMode: boolean
): Promise<{ text: string, action?: any }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
      console.warn("API Key manquante. Utilisez EXPO_PUBLIC_GEMINI_API_KEY dans votre .env.");
      return { text: "⚠️ IA non configurée (Clé manquante dans le fichier .env)." };
  }

  const ai = new GoogleGenAI({ apiKey });

  const chatAccess = await canUseAi('chat');
  if (!chatAccess.allowed) {
      return { text: chatAccess.message || getAiLimitMessage('chat') };
  }

  // Tentative légère de logging
  logAiUsage('chat').catch(() => {});
  
  try {
    let systemInstruction = `
      Tu es DeepFlow, un coach de productivité expert.
      Réponds en Français, sois concis, direct et motivant. Utilise le format Markdown.
    `;

    if (isCreationMode) {
        systemInstruction += `
        IMPORTANT : L'utilisateur veut CRÉER quelque chose.
        Tu DOIS répondre UNIQUEMENT avec un objet JSON (sans markdown, juste le JSON brut).
        
        Formats acceptés :
        1. Tâche : { "action": "CREATE_TASK", "data": { "title": "Titre", "priority": "high"|"medium"|"low" } }
        2. Habitude : { "action": "CREATE_HABIT", "data": { "title": "Titre" } }
        3. Objectif : { "action": "CREATE_GOAL", "data": { "title": "Titre" } }

        Si la demande est floue, déduis un titre pertinent.
        `;
    } else {
        systemInstruction += `Contexte utilisateur: ${JSON.stringify(userContext)}`;
    }

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: userMessage,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: isCreationMode ? 'application/json' : 'text/plain'
        }
    });
    
    const responseText = response.text || "";

    if (isCreationMode) {
        try {
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const actionData = JSON.parse(cleanJson);
            return { text: "Action générée", action: actionData };
        } catch (e) {
            return { text: "Je n'ai pas compris l'action. Essayez : 'Ajoute une tâche...'" };
        }
    }

    return { text: responseText };

  } catch (error) {
    console.log("Gemini API Error:", error);
    return { text: "🚫 **Erreur IA**\n\nVérifiez votre connexion internet ou la validité de votre clé API." };
  }
};

export const generateLifeWheelAnalysis = async (fullContext: any): Promise<number[] | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const analysisAccess = await canUseAi('analysis');
    if (!analysisAccess.allowed) return null;

    logAiUsage('analysis').catch(() => {});

    try {
        const prompt = `
        Analyse ces données utilisateur (Tâches, Habitudes, Journal) pour évaluer l'équilibre de vie.
        Données: ${JSON.stringify(fullContext).substring(0, 10000)} 
        
        Réponds UNIQUEMENT avec un JSON de scores (0-100) :
        { "health": number, "leisure": number, "personal": number, "learning": number, "mental": number, "career": number }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) return null;

        const data = JSON.parse(text);
        return [
            data.health || 50, data.leisure || 50, data.personal || 50,
            data.learning || 50, data.mental || 50, data.career || 50
        ];

    } catch (e) {
        return null;
    }
};

export const generateSubtasks = async (taskTitle: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Découpe cette tâche en sous-tâches (max 5) : "${taskTitle}". Renvoie un tableau JSON de strings.`;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const text = response.text;
        if (!text) return [];
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
};

export const generatePenguinPearl = async (userContext: any): Promise<{ message: string; pearl_type: 'efficiency' | 'resilience' | 'growth'; data: any } | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const analysisAccess = await canUseAi('analysis');
    if (!analysisAccess.allowed) return null;

    logAiUsage('analysis').catch(() => {});

    try {
        const prompt = `
        Tu es l'esprit du Grand Pingouin, un guide de productivité.
        Analyse ces données utilisateur : ${JSON.stringify(userContext).substring(0, 10000)}
        Génère un insight (une "Perle") court, poétique et utile en Français.
        Le ton doit être calme et inspirant.

        Types possibles :
        - efficiency : focus sur la vitesse/quantité
        - resilience : focus sur le maintien des habitudes malgré les obstacles
        - growth : focus sur l'évolution long terme

        Réponds UNIQUEMENT avec un JSON :
        { "message": "Ton message ici...", "pearl_type": "efficiency" | "resilience" | "growth", "data": {} }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) return null;

        return JSON.parse(text);

    } catch (e) {
        console.error("Error generating penguin pearl:", e);
        return null;
    }
};

export const generateQuests = async (userLevel: number, context: string): Promise<any[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const prompt = `
        Génère 3 quêtes RPG pour un utilisateur niveau ${userLevel}. Contexte: ${context}.
        Format JSON : [{ "title": "...", "description": "...", "reward_xp": 50, "reward_credits": 20, "target_value": 1, "quest_type": "daily" }]
        `;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const text = response.text;
        if (!text) return [];
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
};
