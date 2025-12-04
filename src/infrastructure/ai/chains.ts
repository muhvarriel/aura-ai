import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

import { AI_CONFIG } from "@/core/constants/ai-config";
import {
  SYLLABUS_PROMPT,
  CONTENT_GENERATION_PROMPT,
} from "@/core/constants/prompts";
import {
  SyllabusResponse,
  SyllabusResponseSchema,
  ContentGenerationResponse,
  ContentGenerationSchema,
} from "./schemas";

// Initialize Groq Model
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: AI_CONFIG.MODEL_NAME,
  temperature: AI_CONFIG.TEMPERATURE,
});

/**
 * Extract JSON from AI response (handles markdown code blocks)
 * Simplified - hanya handle common case tanpa over-engineering
 */
function extractJSON(rawText: string): string {
  // Remove markdown code blocks if present
  const codeBlockMatch = rawText.match(/``````/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object boundaries
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return rawText.substring(firstBrace, lastBrace + 1);
  }

  // Return as-is if no special formatting detected
  return rawText.trim();
}

/**
 * Parse and validate AI JSON response using Zod schema
 * SIMPLIFIED: No more 4 strategies, direct Zod validation
 */
function parseAndValidate<T>(
  rawText: string,
  schema: z.ZodSchema<T>,
  context: string
): T {
  console.log(
    `🔍 [${context}] Raw AI Output Preview:`,
    rawText.substring(0, 150).replace(/\n/g, "\\n") + "..."
  );

  try {
    // Step 1: Extract JSON from potential markdown formatting
    const jsonString = extractJSON(rawText);

    // Step 2: Parse JSON
    const parsed: unknown = JSON.parse(jsonString);

    // Step 3: Validate with Zod schema
    const validated = schema.safeParse(parsed);

    if (!validated.success) {
      // Detailed error logging
      console.error(`❌ [${context}] Zod Validation Failed:`, {
        errors: validated.error.format(),
        receivedData: parsed,
      });

      throw new Error(
        `Invalid AI response structure: ${validated.error.issues
          .map((e) => `${e.path.join(".")} - ${e.message}`)
          .join(", ")}`
      );
    }

    console.log(`✅ [${context}] Successfully validated response`);
    return validated.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`❌ [${context}] JSON Parse Error:`, error.message);
      console.error("Raw text that failed:", rawText.substring(0, 300));
      throw new Error(
        `AI returned invalid JSON format. Please try again. Error: ${error.message}`
      );
    }

    // Re-throw validation errors
    throw error;
  }
}

/**
 * Generate roadmap syllabus from topic
 */
export const generateSyllabusChain = async (
  topic: string
): Promise<SyllabusResponse> => {
  const startTime = Date.now();
  console.log(`🚀 [Syllabus] Generating for topic: "${topic}"`);

  const parser = new StringOutputParser();
  const chain = RunnableSequence.from([
    ChatPromptTemplate.fromTemplate(SYLLABUS_PROMPT),
    model,
    parser,
  ]);

  try {
    // Simplified format instructions
    const formatInstructions = `Return ONLY valid JSON with this structure:
{
  "courseTitle": "string",
  "overview": "string", 
  "modules": [
    {
      "title": "string",
      "description": "string",
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "estimatedTime": "string",
      "subTopics": ["string"]
    }
  ]
}`;

    const rawResponse = await chain.invoke({
      topic,
      format_instructions: formatInstructions,
    });

    const result = parseAndValidate(
      rawResponse,
      SyllabusResponseSchema,
      "Syllabus Generation"
    );

    const duration = Date.now() - startTime;
    console.log(
      `✅ [Syllabus] Generated successfully in ${duration}ms. Modules: ${result.modules.length}`
    );

    return result;
  } catch (error) {
    console.error("❌ [Syllabus] Generation failed:", error);

    if (error instanceof Error) {
      throw new Error(`Syllabus generation failed: ${error.message}`);
    }

    throw new Error("Gagal memproses respons AI. Silakan coba lagi.");
  }
};

/**
 * Generate learning content and quiz for a module
 */
export const generateLearningContentChain = async (
  topic: string,
  moduleTitle: string
): Promise<ContentGenerationResponse> => {
  const startTime = Date.now();
  console.log(`📝 [Content] Generating for module: "${moduleTitle}"`);

  const parser = new StringOutputParser();
  const chain = RunnableSequence.from([
    ChatPromptTemplate.fromTemplate(CONTENT_GENERATION_PROMPT),
    model,
    parser,
  ]);

  try {
    const formatInstructions = `Return ONLY valid JSON with this structure:
{
  "title": "string",
  "markdownContent": "string (markdown formatted)",
  "quiz": [
    {
      "question": "string",
      "options": [
        { "id": "string", "text": "string", "isCorrect": boolean }
      ],
      "explanation": "string"
    }
  ]
}`;

    const rawResponse = await chain.invoke({
      topic,
      moduleTitle,
      format_instructions: formatInstructions,
    });

    const result = parseAndValidate(
      rawResponse,
      ContentGenerationSchema,
      "Content Generation"
    );

    const duration = Date.now() - startTime;
    console.log(
      `✅ [Content] Generated successfully in ${duration}ms. Quiz questions: ${result.quiz.length}`
    );

    return result;
  } catch (error) {
    console.error("❌ [Content] Generation failed:", error);

    if (error instanceof Error) {
      throw new Error(`Content generation failed: ${error.message}`);
    }

    throw new Error("Gagal memuat materi pelajaran. Silakan coba lagi.");
  }
};
