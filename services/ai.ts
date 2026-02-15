import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';

// Security: API Key must be loaded from environment variables
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

try {
    if (API_KEY) {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    } else {
        console.warn("Gemini API Key is missing. AI features will be disabled.");
    }
} catch (error) {
    console.warn("Erreur initialisation Google AI", error);
}

async function logAiUsage(type: 'chat' | 'analysis') {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        
        const { data: existing, error } = await supabase
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
        console.log("Note: Suivi usage IA ignoré (table manquante ou erreur réseau)");
    }
}

export const generateActionableCoaching = async (
  userMessage: string, 
  userContext: any,
  isCreationMode: boolean
): Promise<{ text: string, action?: any }> => {
  if (!ai) return { text: "⚠️ IA non configurée (Clé manquante)." };

  // Tentative légère de logging, échec silencieux si hors ligne
  logAiUsage('chat').catch(() => {});
  
  try {
    let systemInstruction = `
      Tu es DeepFlow, un coach de productivité expert et un système de gestion de vie.
      Réponds en Français, sois concis et motivant. Utilise le format Markdown.
    `;

    if (isCreationMode) {
        systemInstruction += `
        IMPORTANT : L'utilisateur veut CRÉER quelque chose dans l'application.
        Tu DOIS répondre UNIQUEMENT avec un objet JSON (sans markdown autour, juste le JSON brut).
        
        Formats acceptés :
        1. Pour une tâche : { "action": "CREATE_TASK", "data": { "title": "Titre précis", "priority": "high" | "medium" | "low" } }
        2. Pour une habitude : { "action": "CREATE_HABIT", "data": { "title": "Titre habitude" } }
        3. Pour un objectif : { "action": "CREATE_GOAL", "data": { "title": "Titre objectif" } }

        Si la demande n'est pas claire, invente un titre pertinent basé sur le contexte.
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
            // Nettoyage au cas où le modèle ajoute du markdown ```json ... ```
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const actionData = JSON.parse(cleanJson);
            return { text: "Action générée", action: actionData };
        } catch (e) {
            console.warn("AI JSON parse error", e);
            return { text: "Je n'ai pas compris ce que vous voulez créer. Essayez : 'Ajoute une tâche...'" };
        }
    }

    return { text: responseText };

  } catch (error) {
    // Gestion d'erreur spécifique pour le mode hors ligne
    console.log("Gemini API Error (likely offline):", error);
    return { text: "🚫 **Mode Hors Ligne**\n\nJe ne peux pas répondre car vous n'êtes pas connecté à internet. Vos données sont sauvegardées localement." };
  }
};

export const generateLifeWheelAnalysis = async (fullContext: any): Promise<number[] | null> => {
    if (!ai) return null;
    logAiUsage('analysis').catch(() => {});

    try {
        const prompt = `
        Analyse les données suivantes de l'utilisateur (Tâches accomplies, Habitudes, Journal, Réflexions) pour évaluer son équilibre de vie actuel.
        
        Données:
        ${JSON.stringify(fullContext).substring(0, 15000)} 
        
        Ta réponse DOIT être un JSON STRICT représentant les scores (0-100) pour ces 6 catégories :
        {
            "health": number,
            "leisure": number,
            "personal": number,
            "learning": number,
            "mental": number,
            "career": number
        }
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
            data.health || 20,
            data.leisure || 20,
            data.personal || 20,
            data.learning || 20,
            data.mental || 20,
            data.career || 20
        ];

    } catch (e) {
        return null;
    }
};

export const generateSubtasks = async (taskTitle: string): Promise<string[]> => {
    if (!ai) return [];
    logAiUsage('analysis').catch(() => {});

    try {
        const prompt = `
        Découpe la tâche suivante en sous-tâches (max 6).
        Tâche : "${taskTitle}"
        Renvoie un tableau JSON de strings.
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

export const generateQuests = async (userLevel: number, context: string): Promise<any[]> => {
    if (!ai) return [];
    
    try {
        const prompt = `
        Génère 3 quêtes RPG motivantes pour un utilisateur de niveau ${userLevel}.
        Contexte utilisateur : ${context}
        
        Format JSON attendu :
        [
            {
                "title": "Titre épique",
                "description": "Action concrète à faire",
                "reward_xp": 50,
                "reward_credits": 20,
                "target_value": 1,
                "quest_type": "daily"
            }
        ]
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