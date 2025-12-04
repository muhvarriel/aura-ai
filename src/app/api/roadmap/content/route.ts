import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLearningContentChain } from "@/infrastructure/ai/chains";

// Request validation schema
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

// Timeout configuration
export const maxDuration = 60; // 60 seconds for AI generation

/**
 * Structured logger helper
 */
function log(
  level: "info" | "error",
  message: string,
  meta?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    route: "/api/roadmap/content",
    ...meta,
  };

  if (level === "error") {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Simple in-memory cache for request deduplication
 * Prevents duplicate concurrent requests for same content
 */
const pendingRequests = new Map<string, Promise<unknown>>();

function getCacheKey(topic: string, moduleTitle: string): string {
  return `${topic}::${moduleTitle}`;
}

/**
 * POST /api/roadmap/content
 * Generate learning content and quiz for a specific module
 */
export async function POST(req: NextRequest) {
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

      return NextResponse.json(
        {
          error: "Invalid input",
          details: validation.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { topic, moduleTitle }: GenerateContentRequest = validation.data;

    log("info", "Content generation started", {
      requestId,
      topic,
      moduleTitle,
    });

    // Check for duplicate concurrent requests
    const cacheKey = getCacheKey(topic, moduleTitle);
    const existingRequest = pendingRequests.get(cacheKey);

    if (existingRequest) {
      log("info", "Duplicate request detected, waiting for existing", {
        requestId,
        cacheKey,
      });

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
        }
      );
    }

    // Create new request promise
    const requestPromise = generateLearningContentChain(topic, moduleTitle);
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

      return NextResponse.json(
        { data },
        {
          status: 200,
          headers: {
            "X-Request-ID": requestId,
            "X-Generation-Time": `${duration}ms`,
            "X-Cache-Status": "GENERATED",
          },
        }
      );
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  } catch (error: unknown) {
    const duration = Date.now() - startTime;

    // Categorize errors
    let statusCode = 500;
    let errorMessage = "Internal Server Error";
    let errorType = "UNKNOWN_ERROR";

    if (error instanceof Error) {
      errorMessage = error.message;

      // AI-specific errors
      if (errorMessage.includes("API key")) {
        statusCode = 503;
        errorType = "AI_CONFIG_ERROR";
        errorMessage = "AI service configuration error";
      } else if (errorMessage.includes("timeout")) {
        statusCode = 504;
        errorType = "AI_TIMEOUT";
        errorMessage = "Content generation timeout. Please try again.";
      } else if (errorMessage.includes("Invalid AI response")) {
        statusCode = 502;
        errorType = "AI_INVALID_RESPONSE";
      } else if (errorMessage.includes("Content generation failed")) {
        statusCode = 502;
        errorType = "AI_GENERATION_ERROR";
      }
    }

    log("error", "Content generation failed", {
      requestId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      errorType,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        type: errorType,
        requestId,
      },
      {
        status: statusCode,
        headers: {
          "X-Request-ID": requestId,
        },
      }
    );
  }
}
