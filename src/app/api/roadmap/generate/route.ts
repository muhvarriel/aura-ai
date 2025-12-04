import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateSyllabusChain } from "@/infrastructure/ai/chains";
import { AI_CONFIG } from "@/core/constants/ai-config";
import type { SyllabusResponse } from "@/infrastructure/ai/schemas";
import { checkRateLimit } from "@/lib/utils";

const GenerateRoadmapRequestSchema = z.object({
  topic: z
    .string()
    .min(3, "Topik minimal 3 karakter")
    .max(100, "Topik maksimal 100 karakter")
    .trim(),
});

type GenerateRoadmapRequest = z.infer<typeof GenerateRoadmapRequestSchema>;

export const maxDuration = 60;

interface CacheEntry {
  data: SyllabusResponse;
  timestamp: number;
  expiresAt: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 256, ttlSeconds = AI_CONFIG.CACHE_TTL.SYLLABUS) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
  }

  private generateKey(topic: string): string {
    return `syllabus:${topic.toLowerCase().trim()}`;
  }

  get(topic: string): SyllabusResponse | null {
    const key = this.generateKey(topic);
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

  set(topic: string, data: SyllabusResponse): void {
    const key = this.generateKey(topic);

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

const syllabusCache = new LRUCache();

function log(
  level: "info" | "error" | "warn",
  message: string,
  meta?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    route: "/api/roadmap/generate",
    ...meta,
  };

  const logString = JSON.stringify(logEntry);

  if (level === "error") {
    console.error(logString);
  } else if (level === "warn") {
    console.warn(logString);
  } else {
    console.log(logString);
  }
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

  const rateLimit = checkRateLimit(clientIP, "GENERATE");

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
    const validation = GenerateRoadmapRequestSchema.safeParse(body);

    if (!validation.success) {
      log("error", "Invalid request", {
        requestId,
        errors: validation.error.format(),
      });

      return NextResponse.json(
        {
          error: "Invalid input",
          details: validation.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const { topic }: GenerateRoadmapRequest = validation.data;

    const cached = syllabusCache.get(topic);
    if (cached) {
      const duration = Date.now() - startTime;
      log("info", "Cache HIT", {
        requestId,
        topic,
        duration,
        cacheStats: syllabusCache.getStats(),
      });

      return NextResponse.json(
        { data: cached },
        {
          status: 200,
          headers: {
            "X-Request-ID": requestId,
            "X-Generation-Time": `${duration}ms`,
            "X-Cache-Status": "HIT",
            "X-Cache-Size": String(syllabusCache.getStats().size),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetTime),
          },
        },
      );
    }

    log("info", "Cache MISS - Generating", { requestId, topic });

    const data = await generateSyllabusChain(topic);

    syllabusCache.set(topic, data);

    const duration = Date.now() - startTime;

    log("info", "Generated successfully", {
      requestId,
      topic,
      duration,
      modulesCount: data.modules.length,
      cacheStats: syllabusCache.getStats(),
    });

    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: {
          "X-Request-ID": requestId,
          "X-Generation-Time": `${duration}ms`,
          "X-Cache-Status": "MISS",
          "X-Cache-Size": String(syllabusCache.getStats().size),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetTime),
        },
      },
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    let statusCode = 500;
    let errorMessage = "Internal Server Error";
    let errorType = "UNKNOWN_ERROR";

    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage.includes("API key")) {
        statusCode = 503;
        errorType = "AI_CONFIG_ERROR";
      } else if (errorMessage.includes("timeout")) {
        statusCode = 504;
        errorType = "AI_TIMEOUT";
      } else if (errorMessage.includes("Invalid")) {
        statusCode = 502;
        errorType = "AI_INVALID_RESPONSE";
      }
    }

    log("error", "Generation failed", {
      requestId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      errorType,
    });

    return NextResponse.json(
      { error: errorMessage, type: errorType, requestId },
      { status: statusCode, headers: { "X-Request-ID": requestId } },
    );
  }
}
