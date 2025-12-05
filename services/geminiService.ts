import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Mapping "Nano Banana" to the correct model ID as per instructions
const MODEL_NAME = 'gemini-2.5-flash-image';

export const removeWatermark = async (
  originalImageBase64: string,
  maskImageBase64: string
): Promise<string> => {
  try {
    // Extract mime type from original image data URL before cleaning
    const mimeMatch = originalImageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    // Clean base64 strings if they contain prefixes
    const cleanOriginal = originalImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const cleanMask = maskImageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: "You are an expert image editor. Use the second image provided as a mask. The white areas in the mask indicate where watermarks or unwanted objects are located in the first image. Remove these watermarks/objects seamlessly and fill the area to match the surrounding background texture and lighting. Output ONLY the edited image.",
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanOriginal,
            },
          },
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanMask,
            },
          },
        ],
      },
      // Nano Banana (flash-image) config
      config: {
        // responseMimeType is not supported for nano banana
      }
    });

    // Extract image from response
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           // Return proper data URL using the mimeType returned by the model, or default to png
           const responseMimeType = part.inlineData.mimeType || "image/png";
           return `data:${responseMimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};