import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLearningContentChain } from "@/infrastructure/ai/chains";
import { AI_CONFIG } from "@/core/constants/ai-config";
import type { ContentGenerationResponse } from "@/infrastructure/ai/schemas";
import { checkRateLimit } from "@/lib/utils";

const GenerateContentRequestSchema = z.object({
  topic: z.string().min(3).max(100).trim(),
  moduleTitle: z.string().min(3).max(150).trim(),
});

type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;

export const maxDuration = 60;

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

const contentCache = new ContentCache();

const pendingRequests = new Map<string, Promise<ContentGenerationResponse>>();

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

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const clientIP = getClientIP(req);

  const rateLimit = checkRateLimit(clientIP, "CONTENT");

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);

    log("warn", "Rate limit exceeded", {
      requestId,
      ip: clientIP,
      resetTime: new Date(rateLimit.resetTime).toISOString(),
    });

    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        type: "RATE_LIMIT_ERROR",
        requestId,
        retryable: false,
        retryAfter: rateLimit.resetTime,
      },
      {
        status: 429,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetTime),
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

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
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetTime),
          },
        },
      );
    }

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
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetTime),
          },
        },
      );
    }

    log("info", "Cache MISS - Generating", { requestId, topic, moduleTitle });

    const requestPromise = generateLearningContentChain(topic, moduleTitle);
    pendingRequests.set(dedupeKey, requestPromise);

    try {
      const data = await requestPromise;

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
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetTime),
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
