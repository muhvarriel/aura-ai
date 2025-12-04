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

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: AI_CONFIG.MODEL_NAME,
  temperature: AI_CONFIG.TEMPERATURE,
  maxTokens: AI_CONFIG.MAX_TOKENS,
  streaming: AI_CONFIG.STREAMING,
});

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

  return braceCount === 0 && bracketCount === 0 && !inString;
}

function salvageJSON(incomplete: string): string {
  let result = incomplete.trim();
  const openBraces = (result.match(/{/g) || []).length;
  let closeBraces = (result.match(/}/g) || []).length;
  const openBrackets = (result.match(/\[/g) || []).length;
  let closeBrackets = (result.match(/]/g) || []).length;
  const quoteCount = (result.match(/(?<!\\)"/g) || []).length;

  if (quoteCount % 2 !== 0) result += '"';

  while (closeBrackets < openBrackets) {
    result += "]";
    closeBrackets++;
  }

  while (closeBraces < openBraces) {
    result += "}";
    closeBraces++;
  }

  return result;
}

function sanitizeJSONString(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJSON(rawText: string): string {
  const codeBlockMatch = rawText.match(/``````/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return rawText.trim();
  }

  let extracted = rawText.substring(firstBrace, lastBrace + 1);

  extracted = extracted
    .replace(/"\s*[\n\r]+\s*"/g, '" "')
    .replace(/,\s*[\n\r]*\s*}/g, "}")
    .replace(/,\s*[\n\r]*\s*]/g, "]");

  if (!isCompleteJSON(extracted)) {
    const salvaged = salvageJSON(extracted);
    if (isCompleteJSON(salvaged)) {
      return salvaged;
    }
    throw new Error(
      `AI response truncated. JSON incomplete (length: ${extracted.length})`,
    );
  }

  return extracted;
}

function attemptJSONFix(jsonString: string): string {
  return jsonString
    .replace(
      /"([^"]*?)"/g,
      (_match, content: string) =>
        `"${content.replace(/\n/g, " ").replace(/\r/g, "").replace(/\t/g, " ")}"`,
    )
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
}

function parseAndValidate<T>(
  rawText: string,
  schema: z.ZodSchema<T>,
  context: string,
): T {
  const sanitized = sanitizeJSONString(rawText);

  let extracted: string;
  try {
    extracted = extractJSON(sanitized);
  } catch (error) {
    console.error(`❌ [${context}] Extraction failed:`, error);
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch (firstError) {
    try {
      const fixed = attemptJSONFix(extracted);
      parsed = JSON.parse(fixed);
    } catch (secondError) {
      const error =
        secondError instanceof SyntaxError ? secondError : firstError;
      throw new Error(
        `Invalid JSON: ${error instanceof Error ? error.message : "Parse error"}`,
      );
    }
  }

  const validated = schema.safeParse(parsed);

  if (!validated.success) {
    console.error(`❌ [${context}] Validation failed:`, {
      issues: validated.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });

    throw new Error(
      `Invalid structure: ${validated.error.issues
        .map((i) => `${i.path.join(".")} - ${i.message}`)
        .join(", ")}`,
    );
  }

  return validated.data;
}

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  const maxRetries = AI_CONFIG.MAX_RETRIES;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (attempt < maxRetries) {
        const waitTime = 1000;
        console.log(`⏳ [${context}] Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

export const generateSyllabusChain = async (
  topic: string,
): Promise<SyllabusResponse> => {
  const startTime = Date.now();

  const parser = new StringOutputParser();
  const chain = RunnableSequence.from([
    ChatPromptTemplate.fromTemplate(SYLLABUS_PROMPT),
    model,
    parser,
  ]);

  try {
    const formatInstructions = `JSON: {{"courseTitle":"str","overview":"str","modules":[{{"title":"str (descriptive, min 10)","description":"str","difficulty":"Beginner|Intermediate|Advanced","estimatedTime":"str","subTopics":["str"]}}]}}. Max 6 modules. Complete JSON only.`;

    const result = await withRetry(async () => {
      const rawResponse = await chain.invoke({
        topic,
        format_instructions: formatInstructions,
      });

      return parseAndValidate(rawResponse, SyllabusResponseSchema, "Syllabus");
    }, "Syllabus");

    const duration = Date.now() - startTime;
    console.log(
      `✅ [Syllabus] ${duration}ms | Modules: ${result.modules.length}`,
    );

    return result;
  } catch (error) {
    console.error("❌ [Syllabus] Failed:", error);
    throw new Error(
      `Syllabus generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

export const generateLearningContentChain = async (
  topic: string,
  moduleTitle: string,
): Promise<ContentGenerationResponse> => {
  const startTime = Date.now();

  const parser = new StringOutputParser();
  const chain = RunnableSequence.from([
    ChatPromptTemplate.fromTemplate(CONTENT_GENERATION_PROMPT),
    model,
    parser,
  ]);

  try {
    const formatInstructions = `JSON: {{"title":"str","markdownContent":"str (use \\n)","quiz":[{{"question":"str","options":[{{"id":"str","text":"str","isCorrect":bool}}],"explanation":"str"}}]}}. Max 3 quiz. Complete JSON only.`;

    const result = await withRetry(async () => {
      const rawResponse = await chain.invoke({
        topic,
        moduleTitle,
        format_instructions: formatInstructions,
      });

      return parseAndValidate(rawResponse, ContentGenerationSchema, "Content");
    }, "Content");

    const duration = Date.now() - startTime;
    console.log(`✅ [Content] ${duration}ms | Quiz: ${result.quiz.length}`);

    return result;
  } catch (error) {
    console.error("❌ [Content] Failed:", error);
    throw new Error(
      `Content generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};
