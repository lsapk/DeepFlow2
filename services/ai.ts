// Utilisation de fetch natif pour éviter les erreurs de bundling avec le SDK @google/genai sur mobile
const API_KEY = 'AIzaSyAdOinCnHfqjOyk6XBbTzQkR_IOdRvlliU';
const MODEL_NAME = 'gemini-2.0-flash-exp';

// Helper pour l'appel API REST
async function callGeminiApi(prompt: string, systemInstruction?: string) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    // Construction du body
    // Note: L'API REST v1beta gère les instructions système différemment ou on peut les intégrer au prompt pour simplifier
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
  const prompt = "Génère une seule question profonde et introspective pour un journal de productivité et de développement personnel. En Français. Juste la question, sans guillemets.";
  const text = await callGeminiApi(prompt);
  return text?.trim() || "Quelle a été votre plus grande victoire aujourd'hui ?";
};