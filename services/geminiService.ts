
import { GoogleGenAI, Type } from "@google/genai";
import { Outlet, Stage } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
