
import { GoogleGenAI, Type } from "@google/genai";
import { Outlet, Stage } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAIStatusReport(outlet: Outlet) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a senior Operations Manager. Analyze this outlet's current state and provide a brief status report.
      
      Outlet Name: ${outlet.name}
      Current Stage: ${outlet.currentStage}
      Priority: ${outlet.priority}
      Days in Current Stage: ${Math.floor((Date.now() - outlet.lastMovedAt) / (1000 * 60 * 60 * 24))}
      
      Provide:
      1. A professional summary of status.
      2. 3 actionable "Next Steps" to expedite the process.
      3. A "Risk Level" (Low, Medium, High).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            nextSteps: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            riskLevel: { type: Type.STRING }
          },
          required: ["summary", "nextSteps", "riskLevel"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
}

export async function generateOutletDescription(name: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a 1-sentence professional business description for an outlet named "${name}".`
    });
    return response.text.trim();
  } catch (error) {
    return "No description available.";
  }
}
