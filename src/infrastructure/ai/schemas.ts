import { z } from "zod";

// ==========================================
// UTILITIES & HELPER FUNCTIONS
// ==========================================

/**
 * Sanitize string by removing control characters and normalizing whitespace
 * This prevents JSON parsing errors from AI responses
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars except \n, \r, \t
    .replace(/[\r\n\t]+/g, " ") // Replace newlines and tabs with space
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Sanitize markdown content (preserves newlines for formatting)
 */
function sanitizeMarkdown(str: string): string {
  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars except \n, \r, \t
    .trim();
}

/**
 * Create a sanitized string schema with flexible validation
 * FIX: Lowered min length to 1 to allow short but valid strings
 */
function createSanitizedString(
  minLen: number,
  maxLen: number,
  fieldName: string = "Field",
) {
  return z
    .string()
    .min(minLen, `${fieldName} minimal ${minLen} karakter`)
    .max(maxLen, `${fieldName} maksimal ${maxLen} karakter`)
    .transform((val) => sanitizeString(val))
    .refine((val) => val.length >= minLen, {
      message: `${fieldName} tidak boleh kosong setelah sanitasi`,
    });
}

/**
 * Create a sanitized markdown schema with validation
 */
function createSanitizedMarkdown(
  minLen: number,
  maxLen: number,
  fieldName: string = "Content",
) {
  return z
    .string()
    .min(minLen, `${fieldName} minimal ${minLen} karakter`)
    .max(maxLen, `${fieldName} maksimal ${maxLen} karakter`)
    .transform((val) => sanitizeMarkdown(val))
    .refine((val) => val.length >= minLen, {
      message: `${fieldName} tidak boleh kosong setelah sanitasi`,
    });
}

// ==========================================
// 1. SCHEMA UNTUK GENERATE SILABUS (ROADMAP)
// ==========================================

/**
 * Schema untuk satu modul/bab dalam silabus.
 * Kita minta AI memecah topik menjadi sub-topik agar bisa jadi cabang Graph.
 * FIX: Relaxed min length validation (1 instead of 3)
 */
export const SyllabusModuleSchema = z.object({
  title: createSanitizedString(1, 150, "Judul modul").describe(
    "Judul modul yang menarik dan jelas, misal: 'Konsep Dasar Container'",
  ),

  description: createSanitizedString(1, 500, "Deskripsi").describe(
    "Ringkasan singkat (1 kalimat) tentang apa yang dipelajari di modul ini",
  ),

  difficulty: z
    .enum(["Beginner", "Intermediate", "Advanced"])
    .default("Beginner")
    .describe("Tingkat kesulitan modul ini"),

  estimatedTime: z
    .string()
    .default("15 Menit")
    .transform((val) => sanitizeString(val))
    .describe("Estimasi waktu belajar, misal: '10 Menit', '1 Jam'"),

  subTopics: z
    .array(z.string().transform((val) => sanitizeString(val)))
    .min(1, "Minimal 1 sub-topik")
    .max(10, "Maksimal 10 sub-topik")
    .default([])
    .describe(
      "Daftar 3-5 sub-poin kunci yang akan dibahas. Ini akan menjadi node anak di visual graph.",
    ),
});

/**
 * Schema Output Utama saat user pertama kali input topik.
 * FIX: Relaxed validation for flexibility
 */
export const SyllabusResponseSchema = z.object({
  courseTitle: createSanitizedString(1, 200, "Judul kursus").describe(
    "Judul kursus yang keren berdasarkan topik user",
  ),

  overview: createSanitizedString(1, 1000, "Overview").describe(
    "Deskripsi singkat tentang learning path ini secara keseluruhan",
  ),

  modules: z
    .array(SyllabusModuleSchema)
    .min(1, "Minimal 1 modul pembelajaran")
    .max(20, "Maksimal 20 modul pembelajaran")
    .describe(
      "Daftar modul pembelajaran yang berurutan logis dari mudah ke sulit",
    ),
});

// Type inference helpers
export type SyllabusResponse = z.infer<typeof SyllabusResponseSchema>;
export type SyllabusModule = z.infer<typeof SyllabusModuleSchema>;

// ==========================================
// 2. SCHEMA UNTUK GENERATE KONTEN & KUIS
// ==========================================

/**
 * Quiz Option Schema with sanitization
 * FIX: Relaxed min length
 */
export const QuizOptionSchema = z.object({
  id: z
    .string()
    .min(1, "ID opsi tidak boleh kosong")
    .default("a")
    .transform((val) => sanitizeString(val))
    .describe("ID unik opsi, misal 'a', 'b', 'c', 'd'"),

  text: createSanitizedString(1, 500, "Teks jawaban").describe("Teks jawaban"),

  isCorrect: z
    .boolean()
    .default(false)
    .describe("True jika ini jawaban yang benar"),
});

/**
 * Quiz Question Schema with sanitization
 * FIX: Relaxed min length
 */
export const QuizQuestionSchema = z.object({
  question: createSanitizedString(1, 1000, "Pertanyaan").describe(
    "Pertanyaan kuis terkait materi",
  ),

  options: z
    .array(QuizOptionSchema)
    .min(2, "Minimal 2 pilihan jawaban")
    .max(6, "Maksimal 6 pilihan jawaban")
    .describe("Pilihan jawaban (biasanya 4 pilihan)"),

  explanation: createSanitizedString(1, 1000, "Penjelasan")
    .default("Tidak ada penjelasan tersedia")
    .describe("Penjelasan singkat kenapa jawaban tersebut benar/salah"),
});

/**
 * Schema Output saat user mengklik Node untuk belajar.
 * AI akan me-generate materi Markdown DAN Kuis sekaligus.
 * FIX: Relaxed title validation, kept content validation
 */
export const ContentGenerationSchema = z.object({
  title: createSanitizedString(1, 200, "Judul").describe("Judul Bab"),

  markdownContent: createSanitizedMarkdown(10, 50000, "Konten").describe(
    "Materi pembelajaran lengkap dalam format Markdown. Gunakan heading, bold, code block, dan bullet points agar mudah dibaca.",
  ),

  quiz: z
    .array(QuizQuestionSchema)
    .min(1, "Minimal 1 soal kuis")
    .max(10, "Maksimal 10 soal kuis")
    .default([])
    .describe(
      "3 soal kuis untuk menguji pemahaman user tentang materi di atas",
    ),
});

// Type inference helpers
export type ContentGenerationResponse = z.infer<typeof ContentGenerationSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;

// ==========================================
// 3. LEGACY FORMAT SUPPORT (BACKWARD COMPATIBILITY)
// ==========================================

/**
 * Legacy quiz format where options are just string arrays
 * This is for backward compatibility with older AI responses
 */
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

/**
 * Union type for quiz formats (new structured or legacy simple)
 */
export const FlexibleQuizQuestionSchema = z.union([
  QuizQuestionSchema,
  LegacyQuizQuestionSchema,
]);

/**
 * Flexible content generation schema that accepts both formats
 */
export const FlexibleContentGenerationSchema = z.object({
  title: z.string(),
  markdownContent: z.string(),
  quiz: z.array(FlexibleQuizQuestionSchema).default([]),
});

export type FlexibleContentGeneration = z.infer<
  typeof FlexibleContentGenerationSchema
>;

// ==========================================
// 4. VALIDATION HELPERS
// ==========================================

/**
 * Validate and sanitize syllabus response
 * Returns validated data or throws with detailed error
 */
export function validateSyllabusResponse(data: unknown): SyllabusResponse {
  const result = SyllabusResponseSchema.safeParse(data);

  if (!result.success) {
    const errorDetails = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    console.error(
      "[Schema Validation] Syllabus validation failed:",
      errorDetails,
    );

    throw new Error(
      `Invalid syllabus structure: ${errorDetails
        .map((e) => `${e.path} - ${e.message}`)
        .join("; ")}`,
    );
  }

  return result.data;
}

/**
 * Validate and sanitize content generation response
 * Returns validated data or throws with detailed error
 */
export function validateContentGeneration(
  data: unknown,
): ContentGenerationResponse {
  const result = ContentGenerationSchema.safeParse(data);

  if (!result.success) {
    const errorDetails = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    console.error(
      "[Schema Validation] Content validation failed:",
      errorDetails,
    );

    throw new Error(
      `Invalid content structure: ${errorDetails
        .map((e) => `${e.path} - ${e.message}`)
        .join("; ")}`,
    );
  }

  return result.data;
}

/**
 * Validate flexible content (accepts both new and legacy formats)
 */
export function validateFlexibleContent(
  data: unknown,
): FlexibleContentGeneration {
  const result = FlexibleContentGenerationSchema.safeParse(data);

  if (!result.success) {
    console.error(
      "[Schema Validation] Flexible content validation failed:",
      result.error,
    );
    throw new Error("Invalid content format");
  }

  return result.data;
}

// ==========================================
// 5. TYPE GUARDS
// ==========================================

/**
 * Type guard to check if quiz is in new structured format
 */
export function isStructuredQuiz(
  quiz: unknown,
): quiz is z.infer<typeof QuizQuestionSchema> {
  return QuizQuestionSchema.safeParse(quiz).success;
}

/**
 * Type guard to check if quiz is in legacy format
 */
export function isLegacyQuiz(quiz: unknown): quiz is LegacyQuizQuestion {
  return LegacyQuizQuestionSchema.safeParse(quiz).success;
}
