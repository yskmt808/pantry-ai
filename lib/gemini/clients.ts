import { GoogleGenAI } from "@google/genai";

/**
 * Geminiクライアントの安全な取得
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * 最新のGemini Flashモデルエイリアス（バージョン番号非依存）
 * 環境変数 GEMINI_MODEL が設定されていればそれを優先
 */
export const DEFAULT_AI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
