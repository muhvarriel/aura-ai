export const AI_CONFIG = {
  MODEL_NAME: "llama-3.1-8b-instant",
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
  MAX_RETRIES: 1,
  STREAMING: false,

  CACHE_TTL: {
    SYLLABUS: 604800,
    CONTENT: 2592000,
  },

  LIMITS: {
    MAX_TOKENS_PER_DAY: 1000000,
    MAX_TOKENS_PER_USER_PER_DAY: 50000,
  },

  PRICING: {
    INPUT_COST_PER_1M: 0.05,
    OUTPUT_COST_PER_1M: 0.08,
  },

  RATE_LIMITS: {
    GENERATE: {
      PER_MINUTE: 2,
      PER_HOUR: 3,
    },
    CONTENT: {
      PER_MINUTE: 10,
      PER_HOUR: 50,
    },
  },
} as const;

export type AICacheType = keyof typeof AI_CONFIG.CACHE_TTL;
