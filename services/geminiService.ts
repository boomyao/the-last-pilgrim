import { GoogleGenAI } from "@google/genai";

// Helper to get the AI client. 
// Note: We recreate this to ensure we pick up the key if it was just selected.
const getClient = () => {
  const apiKey = process.env.API_KEY || 'AIzaSyDLR_AZWUZd5tglgcMXs7q-zHhtKGxBpHo';
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateChapterImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Using gemini-3-pro-image-preview for high fidelity as requested in "Cinematic CG" style
    const model = 'gemini-3-pro-image-preview';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "2K" 
        }
      }
    });

    // Check for inline data (base64)
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

export const checkApiKey = async (): Promise<boolean> => {
   if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      return await window.aistudio.hasSelectedApiKey();
   }
   return !!process.env.API_KEY;
}

export const promptApiKey = async (): Promise<void> => {
    if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
    }
}
