import { supabase } from './supabase';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuration API Key
const API_KEY = process.env.API_KEY || "AIzaSyBRsXHPOaFQVcOH9rCKx39uH8Bsu462uGo";

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    console.warn("Gemini API Key is missing.");
}

// Helper pour logger l'utilisation
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
            .single();

        if (existing) {
            await supabase.from('daily_usage').update({
                ai_chat_count: type === 'chat' ? existing.ai_chat_count + 1 : existing.ai_chat_count,
                ai_analysis_count: type === 'analysis' ? existing.ai_analysis_count + 1 : existing.ai_analysis_count
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
        console.error("Failed to log AI usage", e);
    }
}

// Mode Création : L'IA renvoie du JSON pour agir sur l'app
export const generateActionableCoaching = async (
  userMessage: string, 
  userContext: any,
  isCreationMode: boolean
): Promise<{ text: string, action?: any }> => {
  if (!genAI) return { text: "Clé API manquante." };

  await logAiUsage('chat');
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let prompt = `
      Tu es DeepFlow, un coach de productivité.
      
      CONTEXTE UTILISATEUR:
      - Tâches en attente: ${userContext.pendingTasks}
      - Taux de complétion: ${userContext.completionRate}%
      
      RÈGLES:
      1. Sois concis, motivant et direct.
      2. Si 'isCreationMode' est TRUE, tu DOIS analyser si l'utilisateur veut créer quelque chose.
    `;

    if (isCreationMode) {
        prompt += `
        IMPORTANT - MODE ACTION ACTIVÉ:
        Si l'utilisateur demande de créer une tâche, une habitude, un objectif ou lancer un focus, TU DOIS RÉPONDRE UNIQUEMENT AVEC UN JSON VALIDE (pas de markdown, pas de texte avant/après).
        
        FORMATS JSON STRICTS:
        - Tâche: { "action": "CREATE_TASK", "data": { "title": "...", "priority": "high" | "medium" | "low" } }
        - Habitude: { "action": "CREATE_HABIT", "data": { "title": "...", "frequency": "daily" } }
        - Objectif: { "action": "CREATE_GOAL", "data": { "title": "..." } }
        - Focus: { "action": "START_FOCUS", "data": { "minutes": 25 } }
        
        Exemple: Utilisateur: "Ajoute Payer loyer en urgent" -> Réponse: { "action": "CREATE_TASK", "data": { "title": "Payer loyer", "priority": "high" } }
        
        Si ce n'est pas une action, réponds normalement en texte.
        `;
    }

    const result = await model.generateContent(prompt + "\n\nMessage utilisateur: " + userMessage);
    const responseText = await result.response.text();

    // Nettoyage pour parser le JSON si le modèle met des ```json ... ```
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            const actionData = JSON.parse(cleanText);
            return { text: "Action identifiée...", action: actionData };
        }
    } catch (e) {
        // Pas du JSON, c'est une réponse texte normale
    }

    return { text: responseText };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Erreur de connexion à l'IA." };
  }
};

export const generateCoaching = async (msg: string, ctx: any) => {
    const res = await generateActionableCoaching(msg, ctx, false);
    return res.text;
}

export const generateReflectionQuestion = async (): Promise<string> => {
  if (!genAI) return "Clé API manquante.";

  await logAiUsage('analysis');
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Génère une seule question de développement personnel profonde et originale en Français. Juste la question.");
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    return "De quoi êtes-vous le plus reconnaissant aujourd'hui ?";
  }
};