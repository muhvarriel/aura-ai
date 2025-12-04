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

// Initialize Groq Model with max tokens configuration
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: AI_CONFIG.MODEL_NAME,
  temperature: AI_CONFIG.TEMPERATURE,
  maxTokens: AI_CONFIG.MAX_TOKENS,
  streaming: AI_CONFIG.STREAMING,
});

/**
 * Check if JSON string is structurally complete
 * FIX: Detect truncated/incomplete JSON before parsing
 */
function isCompleteJSON(jsonString: string): boolean {
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
      if (char === "[") bracketCount++;
      if (char === "]") bracketCount--;
    }
  }

  // Check: all braces/brackets closed and no unclosed string
  return braceCount === 0 && bracketCount === 0 && !inString;
}

/**
 * Attempt to salvage incomplete JSON by closing unclosed structures
 * FIX: Try to recover truncated JSON
 */
function salvageJSON(incomplete: string): string {
  let result = incomplete.trim();

  // Count unclosed structures
  let openBraces = (result.match(/{/g) || []).length;
  let closeBraces = (result.match(/}/g) || []).length;
  let openBrackets = (result.match(/\[/g) || []).length;
  let closeBrackets = (result.match(/]/g) || []).length;

  // Count quotes to check for unclosed strings
  const quoteCount = (result.match(/(?<!\\)"/g) || []).length;

  console.log(`🔧 [Salvage] Attempting to fix incomplete JSON:`, {
    openBraces,
    closeBraces,
    openBrackets,
    closeBrackets,
    quoteCount,
    oddQuotes: quoteCount % 2 !== 0,
  });

  // Close unclosed string
  if (quoteCount % 2 !== 0) {
    result += '"';
    console.log(`✂️ [Salvage] Closed unclosed string`);
  }

  // Close unclosed arrays
  while (closeBrackets < openBrackets) {
    result += "]";
    closeBrackets++;
    console.log(`✂️ [Salvage] Closed array bracket`);
  }

  // Close unclosed objects
  while (closeBraces < openBraces) {
    result += "}";
    closeBraces++;
    console.log(`✂️ [Salvage] Closed object brace`);
  }

  return result;
}

/**
 * Aggressively sanitize JSON string by removing ALL control characters
 * FIX: Remove characters that break JSON parsing
 */
function sanitizeJSONString(text: string): string {
  return (
    text
      // Remove ALL control characters (0x00-0x1F) and DEL (0x7F)
      .replace(/[\x00-\x1F\x7F]/g, " ")
      // Collapse multiple spaces into one
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Extract JSON from AI response with smart cleanup
 * FIX: Better extraction with completeness validation
 */
function extractJSON(rawText: string): string {
  // Try markdown code block first (`````` or ``````)
  const codeBlockMatch = rawText.match(/``````/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Extract JSON boundaries
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.warn(`⚠️ [Extract] No valid JSON boundaries found`);
    return rawText.trim();
  }

  let extracted = rawText.substring(firstBrace, lastBrace + 1);

  // Clean up common structural issues
  extracted = extracted
    // Fix broken strings across lines: "text"\n"more" -> "text more"
    .replace(/"\s*[\n\r]+\s*"/g, '" "')
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*[\n\r]*\s*}/g, "}")
    .replace(/,\s*[\n\r]*\s*]/g, "]");

  // Check if JSON is complete
  if (!isCompleteJSON(extracted)) {
    console.warn(
      `⚠️ [Extract] JSON appears incomplete. Length: ${extracted.length}`,
    );
    console.warn(`📄 [Extract] Last 150 chars:`, extracted.slice(-150));

    // Try to salvage incomplete JSON
    const salvaged = salvageJSON(extracted);

    if (isCompleteJSON(salvaged)) {
      console.log(`✨ [Extract] Successfully salvaged incomplete JSON`);
      return salvaged;
    }

    console.error(`❌ [Extract] JSON is incomplete and cannot be salvaged`);
    throw new Error(
      `AI response was truncated. JSON is incomplete (length: ${extracted.length}).`,
    );
  }

  return extracted;
}

/**
 * Attempt to fix common JSON issues
 * FIX: More aggressive fixing strategies
 */
function attemptJSONFix(jsonString: string): string {
  let fixed = jsonString;

  // Fix 1: Remove unescaped newlines inside string values
  // Match strings and replace literal newlines
  fixed = fixed.replace(/"([^"]*?)"/g, (match, content: string) => {
    const cleaned = content
      .replace(/\n/g, " ")
      .replace(/\r/g, "")
      .replace(/\t/g, " ");
    return `"${cleaned}"`;
  });

  // Fix 2: Remove trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

  // Fix 3: Fix missing quotes on keys (if any)
  fixed = fixed.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // Fix 4: Remove extra whitespace around structural characters
  fixed = fixed
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*\{\s*/g, "{")
    .replace(/\s*\}\s*/g, "}")
    .replace(/\s*\[\s*/g, "[")
    .replace(/\s*\]\s*/g, "]");

  return fixed;
}

/**
 * Parse and validate AI JSON response using Zod schema
 * FIX: Enhanced error logging with full data visibility
 */
function parseAndValidate<T>(
  rawText: string,
  schema: z.ZodSchema<T>,
  context: string,
): T {
  // Log response metadata
  console.log(`🔍 [${context}] Response Length: ${rawText.length} chars`);
  console.log(
    `🔍 [${context}] Preview (first 150):`,
    rawText.substring(0, 150).replace(/\n/g, "\\n"),
  );
  console.log(
    `🔍 [${context}] Preview (last 150):`,
    rawText.slice(-150).replace(/\n/g, "\\n"),
  );

  // Step 1: Sanitize the raw text (remove control chars)
  const sanitized = sanitizeJSONString(rawText);

  // Step 2: Extract JSON from potential markdown formatting
  let extracted: string;
  try {
    extracted = extractJSON(sanitized);
  } catch (error) {
    // If extraction fails due to incomplete JSON, log and rethrow
    console.error(`❌ [${context}] Extraction failed:`, error);
    throw error;
  }

  // Step 3: Attempt JSON parsing with multiple strategies
  let parsed: unknown;

  try {
    // First attempt: Direct parse
    parsed = JSON.parse(extracted);
    console.log(`✅ [${context}] Parsed on first attempt`);
  } catch (firstError) {
    console.warn(
      `⚠️ [${context}] First parse attempt failed, trying to fix JSON...`,
    );

    try {
      // Second attempt: Fix common issues then parse
      const fixed = attemptJSONFix(extracted);
      parsed = JSON.parse(fixed);
      console.log(`✨ [${context}] JSON fixed and parsed successfully`);
    } catch (secondError) {
      // Both attempts failed - log detailed error
      const error =
        secondError instanceof SyntaxError ? secondError : firstError;

      console.error(`❌ [${context}] JSON Parse Error:`, {
        message: error instanceof Error ? error.message : "Unknown error",
        extractedLength: extracted.length,
        extractedPreview: extracted.substring(0, 300),
        sanitizedPreview: sanitized.substring(0, 300),
      });

      throw new Error(
        `AI returned invalid JSON format. Please try again. Error: ${
          error instanceof Error ? error.message : "Unknown parsing error"
        }`,
      );
    }
  }

  // Step 4: Validate with Zod schema
  const validated = schema.safeParse(parsed);

  if (!validated.success) {
    // FIX: Enhanced error logging with actual data
    console.error(`❌ [${context}] Zod Validation Failed:`);
    console.error(`📋 Error Summary:`, {
      totalIssues: validated.error.issues.length,
      issues: validated.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
        received:
          issue.code === "too_small" && "minimum" in issue
            ? `Expected min: ${issue.minimum}`
            : undefined,
      })),
    });

    // Log actual received data (use JSON.stringify for better visibility)
    console.error(`📦 Received Data:`, JSON.stringify(parsed, null, 2));

    // For module-specific errors, log the actual module data
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "modules" in parsed &&
      Array.isArray(parsed.modules)
    ) {
      console.error(
        `📚 Modules Data:`,
        JSON.stringify(parsed.modules, null, 2),
      );
    }

    throw new Error(
      `Invalid AI response structure: ${validated.error.issues
        .map((issue) => `${issue.path.join(".")} - ${issue.message}`)
        .join(", ")}`,
    );
  }

  console.log(`✅ [${context}] Successfully validated response`);
  return validated.data;
}

/**
 * Retry logic wrapper for AI generation
 * FIX: Add retry mechanism for transient failures
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  context: string,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [${context}] Attempt ${attempt}/${maxRetries}`);
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.warn(
        `⚠️ [${context}] Attempt ${attempt} failed:`,
        lastError.message,
      );

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.log(`⏳ [${context}] Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries failed
  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

/**
 * Generate roadmap syllabus from topic
 * FIX: Enhanced format instructions and retry logic
 */
export const generateSyllabusChain = async (
  topic: string,
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
    const formatInstructions = `Return ONLY valid, compact JSON (single line, no pretty-printing).

EXACT structure required:
{"courseTitle":"string (descriptive)","overview":"string (descriptive)","modules":[{"title":"string (MUST be descriptive, min 10 chars, e.g. 'Fundamental Investasi Saham')","description":"string (descriptive)","difficulty":"Beginner"|"Intermediate"|"Advanced","estimatedTime":"string","subTopics":["string"]}]}

CRITICAL RULES:
1. Output MUST be complete JSON from { to }
2. Compact JSON format (no newlines, minimal spaces between properties)
3. Module titles MUST be descriptive (DON'T use "M1", "Modul 1", etc.)
4. Maximum 6 modules to keep response short
5. Start directly with { and end with }
6. No markdown, no explanations, pure JSON only`;

    const result = await withRetry(
      async () => {
        const rawResponse = await chain.invoke({
          topic,
          format_instructions: formatInstructions,
        });

        return parseAndValidate(
          rawResponse,
          SyllabusResponseSchema,
          "Syllabus Generation",
        );
      },
      2,
      "Syllabus Generation",
    );

    const duration = Date.now() - startTime;
    console.log(
      `✅ [Syllabus] Generated successfully in ${duration}ms. Modules: ${result.modules.length}`,
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
 * FIX: Enhanced format instructions and retry logic
 */
export const generateLearningContentChain = async (
  topic: string,
  moduleTitle: string,
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
    const formatInstructions = `Return ONLY valid, compact JSON.

EXACT structure required:
{"title":"string (descriptive)","markdownContent":"string with \\n for newlines (DETAILED content)","quiz":[{"question":"string","options":[{"id":"string","text":"string","isCorrect":boolean}],"explanation":"string"}]}

CRITICAL RULES:
1. Output MUST be complete JSON from { to }
2. Compact JSON format (minimal whitespace between properties)
3. For markdownContent: use \\n for newlines, content must be DETAILED
4. Maximum 3 quiz questions to keep short
5. Start with { and end with }
6. No markdown wrapper, pure JSON only`;

    const result = await withRetry(
      async () => {
        const rawResponse = await chain.invoke({
          topic,
          moduleTitle,
          format_instructions: formatInstructions,
        });

        return parseAndValidate(
          rawResponse,
          ContentGenerationSchema,
          "Content Generation",
        );
      },
      2,
      "Content Generation",
    );

    const duration = Date.now() - startTime;
    console.log(
      `✅ [Content] Generated successfully in ${duration}ms. Quiz questions: ${result.quiz.length}`,
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
