// Ini adalah bentuk JSON yang akan dipaksa keluar dari Groq AI
// Harus sesederhana mungkin agar AI tidak bingung
export interface SyllabusAIResponse {
  title: string;
  description: string;
  modules: {
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
    subTopics: string[]; // Topik anak (cabang)
  }[];
}
