import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize API
// WARNING: In a real production app, never store keys in frontend code.
// For this desktop app, we will use an env variable or user input setting.
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || ""; 

const genAI = new GoogleGenerativeAI(API_KEY);

export async function solveMcqWithVision(base64Image: string) {
  if (!API_KEY) throw new Error("Gemini API Key is missing.");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are an expert exam solver. Analyze this image of a multiple-choice question.
    1. Extract the question text.
    2. Extract the options.
    3. Identify the correct answer.
    4. Provide a short, clear explanation.

    Return the result as a raw JSON object (no markdown backticks) with this structure:
    {
      "question": "string",
      "options": [{"label": "A", "text": "..."}],
      "answerLabel": "A",
      "explanation": "string"
    }
  `;

  // Remove the data:image/png;base64, prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    },
  ]);

  const responseText = result.response.text();
  
  // Clean up potential markdown formatting from JSON response
  const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse Gemini response", responseText);
    throw new Error("Failed to parse AI response.");
  }
}