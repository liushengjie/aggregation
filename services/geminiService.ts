
import { GoogleGenAI } from "@google/genai";
import { SocialItem } from "../types";

export async function generateDailyInsight(items: SocialItem[]) {
  try {
    // Instantiate GoogleGenAI right before making an API call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Based on the following social media recommendation titles from Weibo, Xiaohongshu, and Bilibili, provide a concise 3-point summary of the today's major trends and sentiment.
    
    Titles:
    ${items.map(item => `[${item.platform}] ${item.title}`).join('\n')}
    
    Output in Chinese.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        // Avoid setting maxOutputTokens without thinkingBudget to prevent empty responses
        temperature: 0.7,
      },
    });

    // Directly access the text property of GenerateContentResponse
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "无法获取AI洞察，请稍后再试。";
  }
}
