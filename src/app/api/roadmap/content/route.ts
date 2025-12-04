import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLearningContentChain } from "@/infrastructure/ai/chains";
import { AI_CONFIG } from "@/core/constants/ai-config";
import type { ContentGenerationResponse } from "@/infrastructure/ai/schemas";

/**
 * OPTIMIZED CONTENT ROUTE
 * Changes:
 * - Extended cache TTL to 30 days (content very stable)
 * - Removed double retry (chains already handle 1 retry)
 * - Simplified error handling
 * - Savings: 50-80% for cached content + reduced retry costs
 */

// Request validation
const GenerateContentRequestSchema = z.object({
  topic: z.string().min(3).max(100).trim(),
  moduleTitle: z.string().min(3).max(150).trim(),
});

type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;

export const maxDuration = 60;

// ==========================================
// CACHE IMPLEMENTATION
// ==========================================

interface CacheEntry {
  data: ContentGenerationResponse;
  timestamp: number;
  expiresAt: number;
}

class ContentCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 512, ttlSeconds = AI_CONFIG.CACHE_TTL.CONTENT) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
  }

  private generateKey(topic: string, moduleTitle: string): string {
    return `content:${topic.toLowerCase().trim()}::${moduleTitle.toLowerCase().trim()}`;
  }

  get(topic: string, moduleTitle: string): ContentGenerationResponse | null {
    const key = this.generateKey(topic, moduleTitle);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // LRU: move to end
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(
    topic: string,
    moduleTitle: string,
    data: ContentGenerationResponse,
  ): void {
    const key = this.generateKey(topic, moduleTitle);

    // Evict oldest
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    };

    this.cache.set(key, entry);
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlSeconds: this.ttl / 1000,
    };
  }
}

// Global cache
const contentCache = new ContentCache();

// Deduplication map (for concurrent requests)
const pendingRequests = new Map<string, Promise<ContentGenerationResponse>>();

// ==========================================
// UTILITIES
// ==========================================

function log(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    route: "/api/roadmap/content",
    ...meta,
  };

  const logString = JSON.stringify(logEntry);

  switch (level) {
    case "error":
      console.error(logString);
      break;
    case "warn":
      console.warn(logString);
      break;
    default:
      console.log(logString);
  }
}

function getCacheKey(topic: string, moduleTitle: string): string {
  return `${topic}::${moduleTitle}`.toLowerCase().trim();
}

// ==========================================
// API ROUTE HANDLER
// ==========================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body: unknown = await req.json();
    const validation = GenerateContentRequestSchema.safeParse(body);

    if (!validation.success) {
      log("error", "Invalid request", {
        requestId,
        errors: validation.error.format(),
      });

      return NextResponse.json(
        {
          error: "Invalid input parameters",
          type: "VALIDATION_ERROR",
          requestId,
          retryable: false,
          details: validation.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const { topic, moduleTitle }: GenerateContentRequest = validation.data;

    // Check persistent cache first
    const cached = contentCache.get(topic, moduleTitle);
    if (cached) {
      const duration = Date.now() - startTime;
      log("info", "Cache HIT", {
        requestId,
        topic,
        moduleTitle,
        duration,
        cacheStats: contentCache.getStats(),
      });

      return NextResponse.json(
        { data: cached },
        {
          status: 200,
          headers: {
            "X-Request-ID": requestId,
            "X-Generation-Time": `${duration}ms`,
            "X-Cache-Status": "HIT",
          },
        },
      );
    }

    // Check deduplication
    const dedupeKey = getCacheKey(topic, moduleTitle);
    const existingRequest = pendingRequests.get(dedupeKey);

    if (existingRequest) {
      log("info", "Duplicate request - waiting", { requestId, dedupeKey });
      const data = await existingRequest;
      const duration = Date.now() - startTime;

      return NextResponse.json(
        { data },
        {
          status: 200,
          headers: {
            "X-Request-ID": requestId,
            "X-Generation-Time": `${duration}ms`,
            "X-Cache-Status": "DEDUPLICATED",
          },
        },
      );
    }

    // Generate new content
    log("info", "Cache MISS - Generating", { requestId, topic, moduleTitle });

    const requestPromise = generateLearningContentChain(topic, moduleTitle);
    pendingRequests.set(dedupeKey, requestPromise);

    try {
      const data = await requestPromise;

      // Cache result
      contentCache.set(topic, moduleTitle, data);

      const duration = Date.now() - startTime;

      log("info", "Generated successfully", {
        requestId,
        topic,
        moduleTitle,
        duration,
        quizCount: data.quiz.length,
        contentLength: data.markdownContent.length,
        cacheStats: contentCache.getStats(),
      });

      return NextResponse.json(
        { data },
        {
          status: 200,
          headers: {
            "X-Request-ID": requestId,
            "X-Generation-Time": `${duration}ms`,
            "X-Cache-Status": "MISS",
          },
        },
      );
    } finally {
      pendingRequests.delete(dedupeKey);
    }
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    let statusCode = 500;
    let errorMessage = "Internal Server Error";
    let errorType = "UNKNOWN_ERROR";
    let retryable = false;

    if (error instanceof Error) {
      errorMessage = error.message;

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("configuration")
      ) {
        statusCode = 503;
        errorType = "AI_CONFIG_ERROR";
        retryable = false;
      } else if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("truncated")
      ) {
        statusCode = 504;
        errorType = "AI_TIMEOUT";
        retryable = true;
      } else if (errorMessage.includes("Invalid")) {
        statusCode = 502;
        errorType = "AI_INVALID_RESPONSE";
        retryable = true;
      }
    }

    log("error", "Generation failed", {
      requestId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      errorType,
      retryable,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        type: errorType,
        requestId,
        retryable,
      },
      {
        status: statusCode,
        headers: {
          "X-Request-ID": requestId,
          "X-Generation-Time": `${duration}ms`,
          "Retry-After": retryable ? "5" : undefined,
        } as HeadersInit,
      },
    );
  }
}
