import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

import { AI_CONFIG } from "@/core/constants/ai-config";
import {
  SYLLABUS_PROMPT,
  CONTENT_GENERATION_PROMPT,
} from "@/core/constants/prompts";
import { SyllabusResponse, ContentGenerationResponse } from "./schemas";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: AI_CONFIG.MODEL_NAME,
  temperature: AI_CONFIG.TEMPERATURE,
});

/**
 * Helper: Membersihkan string JSON yang kotor dari LLM
 */
function parseAIJSON<T>(rawText: string, requiredKey: string): T {
  console.log(
    "🕵️ Raw AI Output Preview:",
    rawText.substring(0, 100).replace(/\n/g, "\\n") + "...",
  );

  let candidates: string[] = [];

  // STRATEGI 1: Cari blok Markdown
  const jsonBlocks = rawText.match(/``````/g);
  if (jsonBlocks) {
    candidates = jsonBlocks.map((block) => block.replace(/``````/g, "").trim());
  }

  // STRATEGI 2: Cari blok { ... } terbesar (Paling sering berhasil)
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(rawText.substring(firstBrace, lastBrace + 1));
  }

  // STRATEGI 3: Raw text
  if (candidates.length === 0) {
    candidates.push(rawText.trim());
  }

  // Iterasi kandidat
  for (const jsonStr of candidates) {
    // A. COBA PARSE MURNI (Best Case)
    try {
      const parsed = JSON.parse(jsonStr);
      if (isValidData(parsed, requiredKey)) return parsed as T;
    } catch (e) {
      /* Lanjut */
    }

    // B. COBA SANITASI NEWLINE (Common Case)
    try {
      // Ganti newline literal yang tidak ter-escape
      // Hati-hati regex ini: mencari \n yang tidak didahului backslash
      const sanitized = jsonStr.replace(/(?<!\\)\n/g, "\\n");
      const parsed = JSON.parse(sanitized);
      if (isValidData(parsed, requiredKey)) return parsed as T;
    } catch (e) {
      /* Lanjut */
    }

    // C. COBA HAPUS CONTROL CHARS (Last Resort JSON Parse)
    try {
      // Hapus semua control characters kecuali newline biasa
      const sanitized = jsonStr.replace(/[\u0000-\u001F]+/g, "");
      const parsed = JSON.parse(sanitized);
      if (isValidData(parsed, requiredKey)) return parsed as T;
    } catch (e) {
      /* Lanjut */
    }
  }

  // STRATEGI 4: MANUAL REGEX EXTRACTION (FALLBACK KHUSUS)
  // Jika semua JSON.parse gagal, kita coba ambil propertinya manual.
  // Ini berlaku baik untuk 'modules' (Syllabus) maupun 'markdownContent' (Content).

  console.log(
    "⚠️ All JSON.parse failed. Attempting Regex Extraction for:",
    requiredKey,
  );

  try {
    if (requiredKey === "markdownContent") {
      // Ekstraksi Content manual seperti sebelumnya
      const titleMatch = rawText.match(/"title"\s*:\s*"([^"]+)"/);
      const contentMatch = rawText.match(
        /"markdownContent"\s*:\s*"([\s\S]*?)(?<!\\)"\s*,/,
      ); // Lookbehind
      const title = titleMatch ? titleMatch[1] : "Materi Pembelajaran";
      const content = contentMatch
        ? contentMatch[1]
        : rawText.includes("markdownContent")
          ? "Konten ada tapi gagal diparse."
          : "Gagal memuat teks.";

      // Ekstrak Quiz Array secara kasar
      let quizzes = [];
      const quizMatch = rawText.match(/"quiz"\s*:\s*(\[[\s\S]*?\])/); // Ambil [ ... ]
      if (quizMatch) {
        try {
          quizzes = JSON.parse(quizMatch[1]);
        } catch (e) {}
      }

      return {
        title,
        markdownContent: content.replace(/\\n/g, "\n").replace(/\\"/g, '"'),
        quiz: quizzes,
      } as unknown as T;
    }

    if (requiredKey === "modules") {
      // Ekstraksi Syllabus manual
      const titleMatch = rawText.match(/"courseTitle"\s*:\s*"([^"]+)"/);
      const overviewMatch = rawText.match(/"overview"\s*:\s*"([^"]+)"/);
      // Ekstrak array modules agak susah pakai regex murni karena nested object
      // Tapi kita coba ambil blok [ ... ] untuk modules
      const modulesMatch = rawText.match(/"modules"\s*:\s*(\[[\s\S]*?\])/);

      if (modulesMatch) {
        const modulesJson = modulesMatch[1];
        // Coba parse array-nya saja (biasanya array modules valid JSON meski parent object rusak)
        const modules = JSON.parse(modulesJson);
        return {
          courseTitle: titleMatch ? titleMatch[1] : "Untitled Course",
          overview: overviewMatch ? overviewMatch[1] : "",
          modules: modules,
        } as unknown as T;
      }
    }
  } catch (e) {
    console.error("Regex extraction failed:", e);
  }

  throw new Error(
    `Gagal menemukan JSON valid yang mengandung key: '${requiredKey}'. Output AI mungkin rusak.`,
  );
}

function isValidData(parsed: any, requiredKey: string): boolean {
  if (!parsed) return false;
  // Skip Schema definitions
  if (
    parsed["$schema"] ||
    (parsed["type"] === "object" && parsed["properties"])
  )
    return false;

  if (requiredKey === "modules") {
    return Array.isArray(parsed.modules);
  }
  if (requiredKey === "markdownContent") {
    return typeof parsed.markdownContent === "string";
  }
  return !!parsed[requiredKey];
}

// ... COPY PASTE EXPORT FUNCTION DI BAWAH INI AGAR LENGKAP ...

export const generateSyllabusChain = async (
  topic: string,
): Promise<SyllabusResponse> => {
  console.log(`🚀 Generating Syllabus for: ${topic}`);
  const parser = new StringOutputParser();
  const chain = RunnableSequence.from([
    ChatPromptTemplate.fromTemplate(SYLLABUS_PROMPT),
    model,
    parser,
  ]);

  try {
    const simpleInstructions = `Berikan output HANYA dalam format JSON valid. 
    JSON harus memiliki properti: "courseTitle", "overview", dan "modules" (array of objects).`;

    const rawResponse = await chain.invoke({
      topic: topic,
      format_instructions: simpleInstructions,
    });
    return parseAIJSON<SyllabusResponse>(rawResponse, "modules");
  } catch (error) {
    console.error("❌ Error generating syllabus:", error);
    throw new Error("Gagal memproses respons AI. Silakan coba lagi.");
  }
};

export const generateLearningContentChain = async (
  topic: string,
  moduleTitle: string,
): Promise<ContentGenerationResponse> => {
  console.log(`📝 Generating Content for: ${moduleTitle}`);
  const parser = new StringOutputParser();
  const chain = RunnableSequence.from([
    ChatPromptTemplate.fromTemplate(CONTENT_GENERATION_PROMPT),
    model,
    parser,
  ]);

  try {
    const simpleInstructions = `Berikan output HANYA dalam format JSON valid.
    JSON harus memiliki properti: "title", "markdownContent", dan "quiz" (array of objects).`;

    const rawResponse = await chain.invoke({
      topic: topic,
      moduleTitle: moduleTitle,
      format_instructions: simpleInstructions,
    });
    return parseAIJSON<ContentGenerationResponse>(
      rawResponse,
      "markdownContent",
    );
  } catch (error) {
    console.error("❌ Error generating content:", error);
    throw new Error("Gagal memuat materi pelajaran.");
  }
};
