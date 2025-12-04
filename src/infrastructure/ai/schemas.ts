import { z } from "zod";

// ==========================================
// 1. SCHEMA UNTUK GENERATE SILABUS (ROADMAP)
// ==========================================

/**
 * Schema untuk satu modul/bab dalam silabus.
 * Kita minta AI memecah topik menjadi sub-topik agar bisa jadi cabang Graph.
 */
export const SyllabusModuleSchema = z.object({
  title: z
    .string()
    .describe(
      "Judul modul yang menarik dan jelas, misal: 'Konsep Dasar Container'",
    ),

  description: z
    .string()
    .describe(
      "Ringkasan singkat (1 kalimat) tentang apa yang dipelajari di modul ini",
    ),

  difficulty: z
    .enum(["Beginner", "Intermediate", "Advanced"])
    .describe("Tingkat kesulitan modul ini"),

  estimatedTime: z
    .string()
    .describe("Estimasi waktu belajar, misal: '10 Menit', '1 Jam'"),

  subTopics: z
    .array(z.string())
    .describe(
      "Daftar 3-5 sub-poin kunci yang akan dibahas. Ini akan menjadi node anak di visual graph.",
    ),
});

/**
 * Schema Output Utama saat user pertama kali input topik.
 */
export const SyllabusResponseSchema = z.object({
  courseTitle: z
    .string()
    .describe("Judul kursus yang keren berdasarkan topik user"),

  overview: z
    .string()
    .describe("Deskripsi singkat tentang learning path ini secara keseluruhan"),

  modules: z
    .array(SyllabusModuleSchema)
    .describe(
      "Daftar modul pembelajaran yang berurutan logis dari mudah ke sulit",
    ),
});

// Type inference helper (agar tidak perlu manual type di file lain)
export type SyllabusResponse = z.infer<typeof SyllabusResponseSchema>;

// ==========================================
// 2. SCHEMA UNTUK GENERATE KONTEN & KUIS
// ==========================================

export const QuizOptionSchema = z.object({
  id: z.string().describe("ID unik opsi, misal 'a', 'b', 'c', 'd'"),
  text: z.string().describe("Teks jawaban"),
  isCorrect: z.boolean().describe("True jika ini jawaban yang benar"),
});

export const QuizQuestionSchema = z.object({
  question: z.string().describe("Pertanyaan kuis terkait materi"),
  options: z
    .array(QuizOptionSchema)
    .describe("Pilihan jawaban (biasanya 4 pilihan)"),
  explanation: z
    .string()
    .describe("Penjelasan singkat kenapa jawaban tersebut benar/salah"),
});

/**
 * Schema Output saat user mengklik Node untuk belajar.
 * AI akan me-generate materi Markdown DAN Kuis sekaligus.
 */
export const ContentGenerationSchema = z.object({
  title: z.string().describe("Judul Bab"),

  markdownContent: z
    .string()
    .describe(
      "Materi pembelajaran lengkap dalam format Markdown. Gunakan heading, bold, code block, dan bullet points agar mudah dibaca.",
    ),

  quiz: z
    .array(QuizQuestionSchema)
    .describe(
      "3 soal kuis untuk menguji pemahaman user tentang materi di atas",
    ),
});

// Type inference helper
export type ContentGenerationResponse = z.infer<typeof ContentGenerationSchema>;
