import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client with provided key
const API_KEY = 'AIzaSyAdOinCnHfqjOyk6XBbTzQkR_IOdRvlliU';
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Using gemini-2.5-flash-latest for stability and speed
const MODEL_NAME = 'gemini-2.5-flash-latest';

export const generateCoaching = async (
  userMessage: string, 
  userContext: any
): Promise<string> => {
  try {
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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "J'analyse vos données... Continuez à avancer !";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Connexion neurale instable. Mais je suis toujours là pour vous soutenir !";
  }
};

export const generateReflectionQuestion = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: "Generate a single, deep, introspective question for a daily productivity and personal growth journal. In French. Just the question.",
        });
        return response.text?.trim() || "Quelle a été votre plus grande victoire aujourd'hui ?";
    } catch (error) {
        console.error("Gemini Reflection Error:", error);
        return "Qu'avez-vous appris aujourd'hui ?";
    }
};