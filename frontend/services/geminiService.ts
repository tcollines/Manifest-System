import { GoogleGenAI } from "@google/genai";
import { KPIS, DEPARTMENTS } from "../constants";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const generateMinistryChatResponse = async (
  attendanceData: any[],
  soulsData: any[],
  history: ChatMessage[],
  newMessage?: string
): Promise<string> => {
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  const attendanceSummary = attendanceData.map(d => `${d.name}: ${d.value} attendees`).join('\n');
  const soulsSummary = soulsData.map(d => `${d.name}: ${d.value} souls won`).join('\n');

  const systemInstruction = `
    You are an advanced Ministry AI Chatbot for a church administration dashboard.
    Your role is to analyze financial and operational data to provide strategic insights for church growth, soul winning, and financial stewardship.
    The tone should be professional, encouraging, and executive-level.
    Keep responses concise and actionable. By default, provide a 3-point executive summary and 1 recommendation on the first interaction unless asking something specific.

    Here is the live real-time database metrics for context:
    Service Attendance Metrics:
    ${attendanceSummary || 'No attendance data yet.'}

    Soul Winning Metrics:
    ${soulsSummary || 'No soul winning data yet.'}
  `;

  // Format array for Gemini
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  if (newMessage) {
    contents.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });
  } else if (history.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: "Provide a 3-point executive summary of my current dashboard metrics and 1 strategic recommendation." }]
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: { systemInstruction }
    });
    return response.text || "Unable to generate insights at this moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateSoulWinningTargetSuggestion = async (currentTotal: number): Promise<string> => {
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!apiKey) return "1000"; // Default fallback

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Current soul winning count is ${currentTotal}. Suggest a realistic but challenging target for next month based on a 20% growth rate. Return ONLY the number.`,
        });
        return response.text?.trim() || "1000";
    } catch (e) {
        return "1000";
    }
}
