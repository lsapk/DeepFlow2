import { supabase } from './supabase';

// Utilisation de fetch natif pour éviter les erreurs de bundling avec le SDK @google/genai sur mobile
const API_KEY = 'AIzaSyAdOinCnHfqjOyk6XBbTzQkR_IOdRvlliU'; // Note: In production, move to env vars
const MODEL_NAME = 'gemini-2.0-flash-exp';

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

// Helper pour l'appel API REST
async function callGeminiApi(prompt: string, systemInstruction?: string) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    const finalPrompt = systemInstruction 
      ? `${systemInstruction}\n\nUser: ${prompt}`
      : prompt;

    const body = {
      contents: [{
        parts: [{
          text: finalPrompt
        }]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", errorData);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;

  } catch (error) {
    console.error("Gemini Fetch Error:", error);
    return null;
  }
}

export const generateCoaching = async (
  userMessage: string, 
  userContext: any
): Promise<string> => {
  await logAiUsage('chat');
  
  const systemPrompt = `
    You are DeepFlow, a gamified productivity coach.
    User Context:
    - Name: ${userContext.name}
    - Level: ${userContext.level}
    - XP: ${userContext.xp}
    - Current Tasks Pending: ${userContext.pendingTasks}
    
    Your goal is to motivate the user, give short actionable advice, and act like a "Cyber Knight" companion.
    Keep responses concise (under 50 words) and encouraging.
    Always reply in French.
  `;

  const text = await callGeminiApi(userMessage, systemPrompt);
  return text || "J'analyse vos données... Continuez à avancer !";
};

export const generateReflectionQuestion = async (): Promise<string> => {
  await logAiUsage('analysis');
  const prompt = "Génère une seule question profonde et introspective pour un journal de productivité et de développement personnel. En Français. Juste la question, sans guillemets.";
  const text = await callGeminiApi(prompt);
  return text?.trim() || "Quelle a été votre plus grande victoire aujourd'hui ?";
};