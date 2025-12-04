export interface QuizOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
}

export interface QuizQuestion {
  readonly id: string;
  readonly question: string;
  options: QuizOption[];
  readonly explanation: string;
}

export interface LearningContent {
  readonly nodeId: string;
  readonly title: string;
  readonly markdownContent: string;
  quizzes: QuizQuestion[];
}

export function isValidQuizQuestion(value: unknown): value is QuizQuestion {
  if (typeof value !== "object" || value === null) return false;

  const q = value as Record<string, unknown>;

  return (
    typeof q.id === "string" &&
    typeof q.question === "string" &&
    Array.isArray(q.options) &&
    typeof q.explanation === "string" &&
    q.options.every(isValidQuizOption)
  );
}

export function isValidQuizOption(value: unknown): value is QuizOption {
  if (typeof value !== "object" || value === null) return false;

  const o = value as Record<string, unknown>;

  return (
    typeof o.id === "string" &&
    typeof o.text === "string" &&
    typeof o.isCorrect === "boolean"
  );
}
