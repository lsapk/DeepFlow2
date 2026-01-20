import { supabase } from './supabase';
import { GoogleGenAI } from "@google/genai";

// Initialisation du client Gemini avec la clé d'environnement
// Assurez-vous que process.env.API_KEY est défini dans votre configuration Expo/React Native
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper pour logger l'utilisation
async function logAiUsage(type: 'chat' | 'analysis') {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        // Check if entry exists for today
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

export const generateCoaching = async (
  userMessage: string, 
  userContext: any
): Promise<string> => {
  await logAiUsage('chat');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Utilisation du modèle flash expérimental ou standard
      contents: userMessage,
      config: {
        systemInstruction: `
          You are DeepFlow, a gamified productivity coach.
          User Context:
          - Name: ${userContext.name}
          - Level: ${userContext.level}
          - XP: ${userContext.xp}
          - Current Tasks Pending: ${userContext.pendingTasks}
          
          Your goal is to motivate the user, give short actionable advice, and act like a "Cyber Knight" companion.
          Keep responses concise (under 50 words) and encouraging.
          Always reply in French.
        `,
      },
    });

    return response.text || "Je analyse vos données... Continuez à avancer !";
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    return "Erreur de connexion à l'IA. Vérifiez votre clé API.";
  }
};

export const generateReflectionQuestion = async (): Promise<string> => {
  await logAiUsage('analysis');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: "Génère une seule question profonde et introspective pour un journal de productivité et de développement personnel. En Français. Juste la question, sans guillemets.",
    });
    return response.text?.trim() || "Quelle a été votre plus grande victoire aujourd'hui ?";
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    return "Sur quoi souhaitez-vous réfléchir aujourd'hui ?";
  }
};