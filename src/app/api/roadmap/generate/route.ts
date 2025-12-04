import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateSyllabusChain } from "@/infrastructure/ai/chains";

// Request validation schema
const GenerateRoadmapRequestSchema = z.object({
  topic: z
    .string()
    .min(3, "Topik minimal 3 karakter")
    .max(100, "Topik maksimal 100 karakter")
    .trim(),
});

type GenerateRoadmapRequest = z.infer<typeof GenerateRoadmapRequestSchema>;

// Timeout configuration
export const maxDuration = 60; // 60 seconds for AI generation

/**
 * Structured logger helper
 */
function log(
  level: "info" | "error",
  message: string,
  meta?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    route: "/api/roadmap/generate",
    ...meta,
  };

  if (level === "error") {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * POST /api/roadmap/generate
 * Generate a learning roadmap from user topic
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Parse request body
    const body: unknown = await req.json();

    // Validate input with Zod
    const validation = GenerateRoadmapRequestSchema.safeParse(body);

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
        { status: 400 },
      );
    }

    const { topic }: GenerateRoadmapRequest = validation.data;

    log("info", "Roadmap generation started", {
      requestId,
      topic,
      topicLength: topic.length,
    });

    // Call AI chain
    const data = await generateSyllabusChain(topic);

    const duration = Date.now() - startTime;

    log("info", "Roadmap generated successfully", {
      requestId,
      topic,
      duration,
      modulesCount: data.modules.length,
    });

    // Return response with metadata headers
    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: {
          "X-Request-ID": requestId,
          "X-Generation-Time": `${duration}ms`,
        },
      },
    );
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
        errorMessage = "AI generation timeout. Please try again.";
      } else if (errorMessage.includes("Invalid AI response")) {
        statusCode = 502;
        errorType = "AI_INVALID_RESPONSE";
      }
    }

    log("error", "Roadmap generation failed", {
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
      },
    );
  }
}
