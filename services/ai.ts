import { supabase } from './supabase';
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || "AIzaSyBRsXHPOaFQVcOH9rCKx39uH8Bsu462uGo";

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.warn("Gemini API Key is missing.");
}

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

export const generateActionableCoaching = async (
  userMessage: string, 
  userContext: any,
  isCreationMode: boolean
): Promise<{ text: string, action?: any }> => {
  if (!ai) return { text: "Clé API manquante." };

  await logAiUsage('chat');
  
  try {
    let prompt = `
      Tu es DeepFlow, un coach de productivité expert et empathique. 🧠✨
      
      FORMAT DE RÉPONSE:
      - Utilise le format **Markdown** pour structurer ta réponse (Gras, Listes, Titres).
      - Utilise beaucoup d'**emojis** pour rendre la conversation vivante et gamifiée.
      
      DONNÉES UTILISATEUR DISPONIBLES (Utilise-les pour personnaliser la réponse):
      ${JSON.stringify(userContext, null, 2)}
      
      RÈGLES:
      1. Sois concis, motivant et direct.
      2. Analyse les données fournies pour donner des conseils pertinents.
    `;

    if (isCreationMode) {
        prompt += `
        ⚠️ MODE CRÉATION ACTIVÉ :
        Si l'utilisateur demande explicitement de créer, ajouter ou planifier quelque chose (Tâche, Habitude, Objectif, Focus), tu DOIS inclure un bloc JSON strict dans ta réponse.
        
        FORMAT DU JSON (Doit être valide, sans commentaires):
        
        Pour une Tâche:
        { "action": "CREATE_TASK", "data": { "title": "Titre précis", "priority": "high" | "medium" | "low" } }
        
        Pour une Habitude:
        { "action": "CREATE_HABIT", "data": { "title": "Titre", "frequency": "daily" } }
        
        Pour un Objectif:
        { "action": "CREATE_GOAL", "data": { "title": "Titre" } }
        
        Pour un Focus:
        { "action": "START_FOCUS", "data": { "minutes": 25 } }
        
        Exemple de réponse mixte:
        "C'est noté ! Je prépare ça pour toi. 🚀
        { "action": "CREATE_TASK", "data": { "title": "Payer loyer", "priority": "high" } }
        N'oublie pas de le faire avant ce soir !"
        `;
    }

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + "\n\nMessage utilisateur: " + userMessage
    });
    
    const responseText = response.text || "";

    // Extraction robuste du JSON via Regex (cherche le premier objet JSON valide dans le texte)
    const jsonMatch = responseText.match(/\{[\s\S]*"action"[\s\S]*\}/);
    
    let actionData = undefined;
    let cleanText = responseText;

    if (jsonMatch) {
        try {
            actionData = JSON.parse(jsonMatch[0]);
            // On nettoie le JSON du texte affiché pour ne pas polluer le chat, ou on le laisse si on veut debugger
            // Ici on le remplace par une icône d'action
            cleanText = responseText.replace(jsonMatch[0], '\n*(Action en attente de confirmation...)*');
        } catch (e) {
            console.warn("AI JSON parse error", e);
        }
    }

    return { text: cleanText, action: actionData };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "⚠️ Erreur de connexion à l'IA. Vérifiez votre réseau." };
  }
};

export const generateCoaching = async (msg: string, ctx: any) => {
    const res = await generateActionableCoaching(msg, ctx, false);
    return res.text;
}

export const generateReflectionQuestion = async (): Promise<string> => {
  if (!ai) return "Clé API manquante.";

  await logAiUsage('analysis');
  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Génère une seule question de développement personnel profonde et originale en Français. Juste la question, sans guillemets."
    });
    return response.text?.trim() || "De quoi êtes-vous le plus reconnaissant aujourd'hui ?";
  } catch (error) {
    return "De quoi êtes-vous le plus reconnaissant aujourd'hui ?";
  }
};