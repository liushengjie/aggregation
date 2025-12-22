// Translation service using Baidu Translate API

import crypto from 'crypto';

// Baidu Translate API configuration
const BAIDU_APP_ID = process.env.BAIDU_TRANSLATE_APP_ID || '20240228001976560';
const BAIDU_SECRET_KEY = process.env.BAIDU_TRANSLATE_SECRET_KEY || 'dNY8N783Z_SKCQLQrM2h';
const BAIDU_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

// Translation cache to avoid translating the same text multiple times
const translationCache = new Map<string, string>();

/**
 * Generate MD5 signature for Baidu Translate API
 */
function generateSign(query: string, salt: string): string {
  const str = BAIDU_APP_ID + query + salt + BAIDU_SECRET_KEY;
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Check if text is already mostly Chinese
 */
function isMostlyChinese(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalCharCount = text.length;
  return totalCharCount > 0 && chineseCharCount / totalCharCount > 0.5;
}

/**
 * Translate text to Chinese using Baidu Translate API
 * Reference: https://fanyi-api.baidu.com/product/113
 */
export async function translateToChinese(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // If text is already mostly Chinese, return as is
  if (isMostlyChinese(text)) {
    return text;
  }

  // Check if API credentials are configured
  if (!BAIDU_APP_ID || !BAIDU_SECRET_KEY) {
    console.warn('[TranslationService] Baidu Translate API credentials not configured, returning original text');
    return text;
  }

  // Check cache first
  const cacheKey = text.trim().toLowerCase();
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    // Generate salt (random number)
    const salt = Date.now().toString();
    const query = text.trim();
    
    // Generate signature
    const sign = generateSign(query, salt);

    // Build request parameters
    const params = new URLSearchParams({
      q: query,
      from: 'auto', // Auto detect source language
      to: 'zh',     // Target language: Chinese
      appid: BAIDU_APP_ID,
      salt: salt,
      sign: sign,
    });

    const url = `${BAIDU_API_URL}?${params.toString()}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`[TranslationService] Baidu Translate API error (${response.status}):`, errorText);
      return text; // Return original text on failure
    }
    
    const data = await response.json();
    
    // Parse Baidu Translate API response
    // Response format: { "from": "en", "to": "zh", "trans_result": [{ "src": "...", "dst": "..." }] }
    if (data && data.trans_result && Array.isArray(data.trans_result) && data.trans_result.length > 0) {
      const translated = data.trans_result[0].dst.trim();
      if (translated && translated !== text) {
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
    
    // If response format is unexpected, return original text
    console.warn('[TranslationService] Unexpected response format from Baidu Translate API');
    return text;
    
  } catch (error: any) {
    // On error, return original text
    if (error.name === 'AbortError') {
      console.warn('[TranslationService] Translation timeout');
    } else {
      console.warn(`[TranslationService] Translation error: ${error.message}`);
    }
    return text;
  }
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

