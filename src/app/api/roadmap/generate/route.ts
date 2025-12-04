import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateSyllabusChain } from "@/infrastructure/ai/chains";
import { AI_CONFIG } from "@/core/constants/ai-config";
import type { SyllabusResponse } from "@/infrastructure/ai/schemas";

/**
 * OPTIMIZED GENERATE ROUTE
 * Changes:
 * - Added in-memory LRU cache (256 entries)
 * - Cache TTL: 7 days for syllabus
 * - Cache hit/miss headers
 * - Savings: 50-80% for repeat topics
 */

// Request validation
const GenerateRoadmapRequestSchema = z.object({
  topic: z
    .string()
    .min(3, "Topik minimal 3 karakter")
    .max(100, "Topik maksimal 100 karakter")
    .trim(),
});

type GenerateRoadmapRequest = z.infer<typeof GenerateRoadmapRequestSchema>;

// Timeout configuration
export const maxDuration = 60;

// ==========================================
// CACHE IMPLEMENTATION
// ==========================================

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
    this.ttl = ttlSeconds * 1000; // Convert to ms
  }

  private generateKey(topic: string): string {
    return `syllabus:${topic.toLowerCase().trim()}`;
  }

  get(topic: string): SyllabusResponse | null {
    const key = this.generateKey(topic);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(topic: string, data: SyllabusResponse): void {
    const key = this.generateKey(topic);

    // Evict oldest if at capacity
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

// Global cache instance
const syllabusCache = new LRUCache();

// ==========================================
// UTILITIES
// ==========================================

function log(
  level: "info" | "error",
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
  } else {
    console.log(logString);
  }
}

// ==========================================
// API ROUTE HANDLER
// ==========================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse and validate
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

    // Check cache first
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
          },
        },
      );
    }

    log("info", "Cache MISS - Generating", { requestId, topic });

    // Generate via AI
    const data = await generateSyllabusChain(topic);

    // Cache the result
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
