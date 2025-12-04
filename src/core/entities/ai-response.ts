export interface SyllabusAIResponse {
  title: string;
  description: string;
  modules: {
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
    subTopics: string[];
  }[];
}
