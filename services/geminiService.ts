import { GoogleGenAI } from "@google/genai";
import { KPIS, DEPARTMENTS } from "../constants";

const getSystemInstruction = () => `
You are an advanced Ministry AI Assistant for a church administration dashboard. 
Your role is to analyze financial and operational data to provide strategic insights for church growth, soul winning, and financial stewardship.
The tone should be professional, encouraging, and executive-level.
Keep responses concise and actionable.
`;

export const generateMinistryInsights = async (): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  const kpiSummary = KPIS.map(k => `${k.label}: ${k.value} (${k.trend === 'up' ? 'Increasing' : 'Decreasing'} by ${k.change})`).join('\n');
  const deptSummary = DEPARTMENTS.map(d => `${d.name}: ${d.members} members`).join('\n');

  const prompt = `
    Based on the following real-time dashboard data, provide a 3-point executive summary and 1 strategic recommendation for the upcoming week.
    
    Current Financial & Operational KPIs:
    ${kpiSummary}

    Department Status:
    ${deptSummary}

    Focus on resource allocation and areas needing attention.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(),
      }
    });

    return response.text || "Unable to generate insights at this moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating insights. Please check your API configuration.";
  }
};

export const generateSoulWinningTargetSuggestion = async (currentTotal: number): Promise<string> => {
    const apiKey = process.env.API_KEY;
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
