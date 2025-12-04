/**
 * Core Domain Entities for Quiz/Learning Content
 * Strict null safety and readonly properties
 */

/**
 * Represents a single quiz answer option
 */
export interface QuizOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
}

/**
 * Represents a single quiz question with multiple options
 */
export interface QuizQuestion {
  readonly id: string;
  readonly question: string;
  options: QuizOption[];
  readonly explanation: string;
}

/**
 * Complete learning content for a roadmap node
 */
export interface LearningContent {
  readonly nodeId: string;
  readonly title: string;
  readonly markdownContent: string;
  quizzes: QuizQuestion[];
}

/**
 * Type guard: Validate QuizQuestion structure
 */
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

/**
 * Type guard: Validate QuizOption structure
 */
export function isValidQuizOption(value: unknown): value is QuizOption {
  if (typeof value !== "object" || value === null) return false;

  const o = value as Record<string, unknown>;

  return (
    typeof o.id === "string" &&
    typeof o.text === "string" &&
    typeof o.isCorrect === "boolean"
  );
}
