import { z } from "zod";

/**
 * OPTIMIZED SCHEMAS
 * Changes:
 * - Simplified sanitization with early exit
 * - Reduced validation overhead
 * - Kept min length at 1 for flexibility
 * - Cleaner error messages
 */

// ==========================================
// UTILITIES
// ==========================================

/**
 * Optimized sanitization - early exit if clean
 */
function sanitizeString(str: string): string {
  // Early exit if already clean
  if (!/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F\r\n\t]/.test(str)) {
    return str.trim();
  }

  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMarkdown(str: string): string {
  // Early exit if clean
  if (!/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(str)) {
    return str.trim();
  }

  return str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "").trim();
}

function createSanitizedString(
  minLen: number,
  maxLen: number,
  fieldName = "Field",
) {
  return z
    .string()
    .min(minLen, `${fieldName} min ${minLen} chars`)
    .max(maxLen, `${fieldName} max ${maxLen} chars`)
    .transform(sanitizeString)
    .refine((val) => val.length >= minLen, {
      message: `${fieldName} empty after sanitization`,
    });
}

function createSanitizedMarkdown(
  minLen: number,
  maxLen: number,
  fieldName = "Content",
) {
  return z
    .string()
    .min(minLen, `${fieldName} min ${minLen} chars`)
    .max(maxLen, `${fieldName} max ${maxLen} chars`)
    .transform(sanitizeMarkdown)
    .refine((val) => val.length >= minLen, {
      message: `${fieldName} empty after sanitization`,
    });
}

// ==========================================
// SYLLABUS SCHEMAS
// ==========================================

export const SyllabusModuleSchema = z.object({
  title: createSanitizedString(1, 150, "Module title"),
  description: createSanitizedString(1, 500, "Description"),
  difficulty: z
    .enum(["Beginner", "Intermediate", "Advanced"])
    .default("Beginner"),
  estimatedTime: z.string().default("15 Menit").transform(sanitizeString),
  subTopics: z
    .array(z.string().transform(sanitizeString))
    .min(1, "Min 1 subtopic")
    .max(10, "Max 10 subtopics")
    .default([]),
});

export const SyllabusResponseSchema = z.object({
  courseTitle: createSanitizedString(1, 200, "Course title"),
  overview: createSanitizedString(1, 1000, "Overview"),
  modules: z
    .array(SyllabusModuleSchema)
    .min(1, "Min 1 module")
    .max(20, "Max 20 modules"),
});

export type SyllabusResponse = z.infer<typeof SyllabusResponseSchema>;
export type SyllabusModule = z.infer<typeof SyllabusModuleSchema>;

// ==========================================
// CONTENT SCHEMAS
// ==========================================

export const QuizOptionSchema = z.object({
  id: z.string().min(1).default("a").transform(sanitizeString),
  text: createSanitizedString(1, 500, "Answer text"),
  isCorrect: z.boolean().default(false),
});

export const QuizQuestionSchema = z.object({
  question: createSanitizedString(1, 1000, "Question"),
  options: z
    .array(QuizOptionSchema)
    .min(2, "Min 2 options")
    .max(6, "Max 6 options"),
  explanation: createSanitizedString(1, 1000, "Explanation").default(
    "No explanation",
  ),
});

export const ContentGenerationSchema = z.object({
  title: createSanitizedString(1, 200, "Title"),
  markdownContent: createSanitizedMarkdown(10, 50000, "Content"),
  quiz: z
    .array(QuizQuestionSchema)
    .min(1, "Min 1 quiz")
    .max(10, "Max 10 quiz")
    .default([]),
});

export type ContentGenerationResponse = z.infer<typeof ContentGenerationSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;

// ==========================================
// LEGACY SUPPORT
// ==========================================

export const LegacyQuizQuestionSchema = z.object({
  question: z.string().optional(),
  pertanyaan: z.string().optional(),
  options: z.array(z.string()).optional(),
  pilihan: z.array(z.string()).optional(),
  answer: z.string().optional(),
  jawaban: z.string().optional(),
  explanation: z.string().optional(),
  penjelasan: z.string().optional(),
});

export type LegacyQuizQuestion = z.infer<typeof LegacyQuizQuestionSchema>;

export const FlexibleQuizQuestionSchema = z.union([
  QuizQuestionSchema,
  LegacyQuizQuestionSchema,
]);

export const FlexibleContentGenerationSchema = z.object({
  title: z.string(),
  markdownContent: z.string(),
  quiz: z.array(FlexibleQuizQuestionSchema).default([]),
});

export type FlexibleContentGeneration = z.infer<
  typeof FlexibleContentGenerationSchema
>;

// ==========================================
// VALIDATION HELPERS
// ==========================================

export function validateSyllabusResponse(data: unknown): SyllabusResponse {
  const result = SyllabusResponseSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    );
    throw new Error(`Invalid syllabus: ${errors.join(", ")}`);
  }

  return result.data;
}

export function validateContentGeneration(
  data: unknown,
): ContentGenerationResponse {
  const result = ContentGenerationSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    );
    throw new Error(`Invalid content: ${errors.join(", ")}`);
  }

  return result.data;
}

export function validateFlexibleContent(
  data: unknown,
): FlexibleContentGeneration {
  const result = FlexibleContentGenerationSchema.safeParse(data);

  if (!result.success) {
    throw new Error("Invalid content format");
  }

  return result.data;
}

// ==========================================
// TYPE GUARDS
// ==========================================

export function isStructuredQuiz(quiz: unknown): quiz is QuizQuestion {
  return QuizQuestionSchema.safeParse(quiz).success;
}

export function isLegacyQuiz(quiz: unknown): quiz is LegacyQuizQuestion {
  return LegacyQuizQuestionSchema.safeParse(quiz).success;
}
