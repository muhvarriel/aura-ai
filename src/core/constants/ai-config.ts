export const AI_CONFIG = {
  // Model termurah & tercepat di Groq
  // Cocok untuk draft awal modul, kuis pilihan ganda, atau outline
  MODEL_NAME: "llama-3.1-8b-instant",

  // Temperature diturunkan ke 0.3
  // Alasan: Model kecil (8B) lebih mudah "berhalusinasi" atau melantur
  // dibanding model besar. Setting rendah menjaga konsistensi format JSON.
  TEMPERATURE: 0.3,

  // Tetap berikan retry, karena model kecil kadang output JSON-nya tidak sempurna
  MAX_RETRIES: 3,
};
