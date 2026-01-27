import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';

// EN REACT NATIVE, process.env N'EXISTE PAS PAR DÉFAUT.
// Utilisation directe de la clé ou via expo-constants (ici hardcodé pour débloquer).
const API_KEY = "AIzaSyBRsXHPOaFQVcOH9rCKx39uH8Bsu462uGo"; 

let ai: GoogleGenAI | null = null;

try {
    if (API_KEY) {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    } else {
        console.warn("Gemini API Key is missing.");
    }
} catch (error) {
    console.warn("Erreur initialisation Google AI", error);
}

async function logAiUsage(type: 'chat' | 'analysis') {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        
        // On vérifie d'abord si une entrée existe
        const { data: existing, error } = await supabase
            .from('daily_usage')
            .select('*')
            .eq('user_id', user.id)
            .eq('usage_date', today)
            .maybeSingle(); // Utiliser maybeSingle pour éviter les erreurs 406 si vide

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

  await logAiUsage('chat');
  
  try {
    let prompt = `
      Tu es DeepFlow, un coach de productivité expert.
      Réponds en Français, sois concis et motivant. Utilise le format Markdown.
      
      Contexte utilisateur:
      ${JSON.stringify(userContext)}
    `;

    if (isCreationMode) {
        prompt += `
        Si l'utilisateur veut créer quelque chose, renvoie UNIQUEMENT un JSON strict au format :
        { "action": "CREATE_TASK", "data": { "title": "...", "priority": "medium" } }
        (Actions possibles: CREATE_TASK, CREATE_HABIT, CREATE_GOAL)
        `;
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Utilisation d'un modèle plus stable pour l'instant
        contents: prompt + "\n\nMessage: " + userMessage
    });
    
    const responseText = response.text || "";

    const jsonMatch = responseText.match(/\{[\s\S]*"action"[\s\S]*\}/);
    let actionData = undefined;
    let cleanText = responseText;

    if (jsonMatch) {
        try {
            actionData = JSON.parse(jsonMatch[0]);
            cleanText = "J'ai préparé cette action pour vous :";
        } catch (e) {
            console.warn("AI JSON parse error", e);
        }
    }

    return { text: cleanText, action: actionData };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "⚠️ Je n'arrive pas à joindre le cerveau central (Erreur réseau)." };
  }
};

export const generateLifeWheelAnalysis = async (fullContext: any): Promise<number[] | null> => {
    if (!ai) return null;
    await logAiUsage('analysis');

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
        
        Règles :
        - Sois réaliste. Si peu de données sur le sport, mets un score bas en santé.
        - Si le journal mentionne du stress, baisse le score mental.
        - Renvoie UNIQUEMENT le JSON, pas de markdown, pas de texte avant/après.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) return null;

        const data = JSON.parse(text);
        // Ordre attendu par le graph : Santé, Loisirs, Perso, Appr., Mental, Carrière
        return [
            data.health || 20,
            data.leisure || 20,
            data.personal || 20,
            data.learning || 20,
            data.mental || 20,
            data.career || 20
        ];

    } catch (e) {
        console.error("AI Wheel Analysis Error", e);
        return null;
    }
};

export const generateCoaching = async (msg: string, ctx: any) => {
    const res = await generateActionableCoaching(msg, ctx, false);
    return res.text;
}

export const generateReflectionQuestion = async (): Promise<string> => {
  if (!ai) return "De quoi êtes-vous reconnaissant aujourd'hui ?";
  try {
    // Fallback local pour éviter latence
    const questions = [
        "Quelle a été votre plus petite victoire aujourd'hui ?",
        "Qu'avez-vous appris sur vous-même cette semaine ?",
        "Si vous ne pouviez faire qu'une chose demain, quelle serait-elle ?",
        "Quelle émotion domine votre esprit actuellement ?"
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  } catch (error) {
    return "De quoi êtes-vous le plus reconnaissant aujourd'hui ?";
  }
};