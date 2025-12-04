import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLearningContentChain } from "@/infrastructure/ai/chains";
import type { ContentGenerationResponse } from "@/infrastructure/ai/schemas";

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/**
 * Request validation schema
 */
const GenerateContentRequestSchema = z.object({
  topic: z
    .string()
    .min(3, "Topik minimal 3 karakter")
    .max(100, "Topik maksimal 100 karakter")
    .trim(),
  moduleTitle: z
    .string()
    .min(3, "Judul modul minimal 3 karakter")
    .max(150, "Judul modul maksimal 150 karakter")
    .trim(),
});

type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;

/**
 * Success response structure
 */
interface SuccessResponse {
  data: ContentGenerationResponse;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  type: string;
  requestId: string;
  details?: Array<{ field: string; message: string }>;
  retryable?: boolean;
}

/**
 * Error categories
 */
type ErrorType =
  | "VALIDATION_ERROR"
  | "AI_CONFIG_ERROR"
  | "AI_TIMEOUT"
  | "AI_INVALID_RESPONSE"
  | "AI_GENERATION_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMIT_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Categorized error info
 */
interface CategorizedError {
  statusCode: number;
  errorMessage: string;
  errorType: ErrorType;
  retryable: boolean;
}

// ==========================================
// CONFIGURATION
// ==========================================

// Timeout configuration (Vercel limit)
export const maxDuration = 60; // 60 seconds for AI generation

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 2,
  initialDelay: 1000, // 1 second
  maxDelay: 3000, // 3 seconds
} as const;

// ==========================================
// UTILITIES
// ==========================================

/**
 * Structured logger helper
 */
function log(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
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

/**
 * Simple in-memory cache for request deduplication
 * Prevents duplicate concurrent requests for same content
 */
const pendingRequests = new Map<string, Promise<ContentGenerationResponse>>();

function getCacheKey(topic: string, moduleTitle: string): string {
  return `${topic}::${moduleTitle}`.toLowerCase().trim();
}

/**
 * Categorize error and determine appropriate response
 */
function categorizeError(error: unknown): CategorizedError {
  const defaultError: CategorizedError = {
    statusCode: 500,
    errorMessage: "Internal Server Error",
    errorType: "UNKNOWN_ERROR",
    retryable: false,
  };

  if (!(error instanceof Error)) {
    return defaultError;
  }

  const errorMsg = error.message.toLowerCase();

  // AI Configuration Error
  if (
    errorMsg.includes("api key") ||
    errorMsg.includes("configuration") ||
    errorMsg.includes("groq")
  ) {
    return {
      statusCode: 503,
      errorMessage:
        "AI service is temporarily unavailable. Please try again later.",
      errorType: "AI_CONFIG_ERROR",
      retryable: false,
    };
  }

  // Timeout Error
  if (
    errorMsg.includes("timeout") ||
    errorMsg.includes("timed out") ||
    errorMsg.includes("deadline")
  ) {
    return {
      statusCode: 504,
      errorMessage:
        "Content generation took too long. Please try a simpler topic or retry.",
      errorType: "AI_TIMEOUT",
      retryable: true,
    };
  }

  // Invalid Response Format
  if (
    errorMsg.includes("invalid json") ||
    errorMsg.includes("parse error") ||
    errorMsg.includes("invalid ai response")
  ) {
    return {
      statusCode: 502,
      errorMessage: "AI returned invalid data format. Please retry.",
      errorType: "AI_INVALID_RESPONSE",
      retryable: true,
    };
  }

  // Content Generation Failed
  if (errorMsg.includes("content generation failed")) {
    return {
      statusCode: 502,
      errorMessage: "Failed to generate content. Please retry.",
      errorType: "AI_GENERATION_ERROR",
      retryable: true,
    };
  }

  // Network Errors
  if (
    errorMsg.includes("network") ||
    errorMsg.includes("fetch failed") ||
    errorMsg.includes("econnrefused")
  ) {
    return {
      statusCode: 503,
      errorMessage: "Network error. Please check your connection and retry.",
      errorType: "NETWORK_ERROR",
      retryable: true,
    };
  }

  // Rate Limit
  if (
    errorMsg.includes("rate limit") ||
    errorMsg.includes("too many requests")
  ) {
    return {
      statusCode: 429,
      errorMessage: "Too many requests. Please wait a moment and retry.",
      errorType: "RATE_LIMIT_ERROR",
      retryable: true,
    };
  }

  return defaultError;
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: { requestId: string; topic: string; moduleTitle: string },
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      log("info", `Attempt ${attempt}/${RETRY_CONFIG.maxAttempts}`, {
        requestId: context.requestId,
        attempt,
      });

      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      const categorized = categorizeError(lastError);

      log("warn", `Attempt ${attempt} failed`, {
        requestId: context.requestId,
        attempt,
        error: lastError.message,
        errorType: categorized.errorType,
        retryable: categorized.retryable,
      });

      // Don't retry if error is not retryable
      if (!categorized.retryable) {
        throw lastError;
      }

      // Don't wait after last attempt
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(2, attempt - 1),
          RETRY_CONFIG.maxDelay,
        );

        log("info", `Retrying after ${delay}ms`, {
          requestId: context.requestId,
          delay,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  throw lastError || new Error("All retry attempts failed");
}

// ==========================================
// API ROUTE HANDLER
// ==========================================

/**
 * POST /api/roadmap/content
 * Generate learning content and quiz for a specific module
 */
export async function POST(
  req: NextRequest,
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse request body
    const body: unknown = await req.json();

    // Validate input with Zod
    const validation = GenerateContentRequestSchema.safeParse(body);

    if (!validation.success) {
      log("error", "Invalid request body", {
        requestId,
        errors: validation.error.format(),
        receivedBody: body,
      });

      return NextResponse.json<ErrorResponse>(
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

    log("info", "Content generation started", {
      requestId,
      topic,
      moduleTitle,
    });

    // Check for duplicate concurrent requests (deduplication)
    const cacheKey = getCacheKey(topic, moduleTitle);
    const existingRequest = pendingRequests.get(cacheKey);

    if (existingRequest) {
      log("info", "Duplicate request detected, waiting for existing request", {
        requestId,
        cacheKey,
      });

      const data = await existingRequest;
      const duration = Date.now() - startTime;

      return NextResponse.json<SuccessResponse>(
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

    // Create new request with retry logic
    const requestPromise = withRetry(
      () => generateLearningContentChain(topic, moduleTitle),
      { requestId, topic, moduleTitle },
    );

    pendingRequests.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;
      const duration = Date.now() - startTime;

      log("info", "Content generated successfully", {
        requestId,
        topic,
        moduleTitle,
        duration,
        quizCount: data.quiz.length,
        contentLength: data.markdownContent.length,
      });

      return NextResponse.json<SuccessResponse>(
        { data },
        {
          status: 200,
          headers: {
            "X-Request-ID": requestId,
            "X-Generation-Time": `${duration}ms`,
            "X-Cache-Status": "GENERATED",
          },
        },
      );
    } finally {
      // Clean up pending request map
      pendingRequests.delete(cacheKey);
    }
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error);

    log("error", "Content generation failed", {
      requestId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      errorType: categorized.errorType,
      statusCode: categorized.statusCode,
      retryable: categorized.retryable,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json<ErrorResponse>(
      {
        error: categorized.errorMessage,
        type: categorized.errorType,
        requestId,
        retryable: categorized.retryable,
      },
      {
        status: categorized.statusCode,
        headers: {
          "X-Request-ID": requestId,
          "X-Generation-Time": `${duration}ms`,
          "Retry-After": categorized.retryable ? "5" : undefined,
        } as HeadersInit,
      },
    );
  }
}
