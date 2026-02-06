
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';

// Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) to initialize the client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.4,
    },
  });
};

export const sendMessage = async (
  chat: Chat, 
  message: string, 
  image?: { data: string, mimeType: string }
): Promise<string> => {
  try {
    if (image) {
      const imagePart = {
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      };
      const textPart = { text: message || "Analyze this image in the context of GIS equipment diagnosis." };
      
      // Use ai.models.generateContent to query GenAI with both the model name and prompt for multi-part content.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, textPart] },
        config: { systemInstruction: SYSTEM_PROMPT }
      });
      // Access the .text property directly (not as a function).
      return response.text || "No response received.";
    } else {
      // sendMessage only accepts the message parameter in chat.
      const result: GenerateContentResponse = await chat.sendMessage({ message });
      // Access the .text property directly.
      return result.text || "No response received.";
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with the diagnosis assistant. Please check your connection or API key.";
  }
};
