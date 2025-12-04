export const AI_CONFIG = {
  // Model termurah & tercepat di Groq
  // Cocok untuk draft awal modul, kuis pilihan ganda, atau outline
  MODEL_NAME: "llama-3.1-8b-instant",

  // Temperature diturunkan ke 0.3
  // Alasan: Model kecil (8B) lebih mudah "berhalusinasi" atau melantur
  // dibanding model besar. Setting rendah menjaga konsistensi format JSON.
  TEMPERATURE: 0.3,

  // Max tokens untuk memastikan response tidak terpotong
  // 4096 cukup untuk syllabus 5-8 modul atau content + quiz
  MAX_TOKENS: 4096,

  // Retry configuration
  MAX_RETRIES: 3,

  // Streaming disabled untuk memastikan response lengkap
  STREAMING: false,
} as const;
