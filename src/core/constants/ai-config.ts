/**
 * OPTIMIZED AI CONFIGURATION
 * Changes:
 * - Added cache TTL settings
 * - Added token limits for cost control
 * - Reduced retries (2 → 1 at chain level)
 * - Added cost tracking config
 */

export const AI_CONFIG = {
  // Model: llama-3.1-8b-instant (already optimal, cheapest on Groq)
  MODEL_NAME: "llama-3.1-8b-instant",

  // Temperature: 0.3 (good for consistency)
  TEMPERATURE: 0.3,

  // Max tokens: 4096 (sufficient for syllabus + content)
  MAX_TOKENS: 4096,

  // Retry: Reduced from 3 to 1 at chain level (route handles main retry)
  MAX_RETRIES: 1,

  // Streaming disabled for complete JSON
  STREAMING: false,

  // Cache TTL Settings (in seconds)
  CACHE_TTL: {
    SYLLABUS: 604800, // 7 days - syllabus rarely changes
    CONTENT: 2592000, // 30 days - content very stable
  },

  // Token limits for cost control
  LIMITS: {
    MAX_TOKENS_PER_DAY: 1000000, // 1M tokens per day safety limit
    MAX_TOKENS_PER_USER_PER_DAY: 50000, // 50K per user per day
  },

  // Cost tracking (Groq pricing as of Dec 2024)
  PRICING: {
    INPUT_COST_PER_1M: 0.05, // $0.05 per 1M input tokens
    OUTPUT_COST_PER_1M: 0.08, // $0.08 per 1M output tokens
  },
} as const;

// Type helper
export type AICacheType = keyof typeof AI_CONFIG.CACHE_TTL;
