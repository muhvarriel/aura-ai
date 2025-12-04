export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  explanation: string; // Penjelasan kenapa jawaban itu benar/salah
}

// Konten lengkap untuk satu Node (Chapter)
export interface LearningContent {
  nodeId: string;
  title: string;
  markdownContent: string; // Materi pelajaran dalam format Markdown
  quizzes: QuizQuestion[];
}
