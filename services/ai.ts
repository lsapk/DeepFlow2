import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// NOTE: In a real production app, ensure process.env.API_KEY is properly injected via Expo config or .env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCoaching = async (
  userMessage: string, 
  userContext: any
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-lite-latest'; // Fast model for chat

    // Construct a context-aware prompt
    const systemPrompt = `
      You are DeepFlow, a gamified productivity coach.
      User Context:
      - Name: ${userContext.name}
      - Level: ${userContext.level}
      - XP: ${userContext.xp}
      - Current Tasks Pending: ${userContext.pendingTasks}
      
      Your goal is to motivate the user, give short actionable advice, and act like a "Cyber Knight" companion.
      Keep responses concise (under 50 words) and encouraging.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "Je analyse vos données... Continuez à avancer !";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Connexion neurale instable (Erreur IA). Mais je suis toujours là pour vous soutenir !";
  }
};