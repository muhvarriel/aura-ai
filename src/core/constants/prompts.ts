/**
 * OPTIMIZED PROMPTS - Token Efficient Version
 * Changes:
 * - Reduced verbosity by 70%
 * - Removed redundant examples
 * - Consolidated format rules
 * - Savings: ~300-400 tokens per request
 */

export const SYLLABUS_PROMPT = `
Act as Senior Curriculum Architect. Create learning roadmap for: "{topic}"

Requirements:
• 5-6 modules (Beginner → Advanced progression)
• Each module: 3-5 subtopics
• Descriptive titles (min 10 chars, NO "M1", "Module 1")
• Indonesian language

Output: Pure JSON, compact format (no markdown wrapper, no newlines in strings)
Structure: {{"courseTitle":"string","overview":"string","modules":[{{"title":"descriptive name","description":"string","difficulty":"Beginner|Intermediate|Advanced","estimatedTime":"string","subTopics":["string"]}}]}}

Rules:
- Start with {{ end with }}
- Max 6 modules for brevity
- Complete JSON (no truncation)
- One-line strings

{format_instructions}
`;

export const CONTENT_GENERATION_PROMPT = `
Act as Expert Teacher. Course: "{topic}", Module: "{moduleTitle}"

Tasks:
1. Detailed explanation in Markdown (headings, bold, lists, code)
2. 3 multiple-choice quiz questions

Output: Pure JSON, compact format
Structure: {{"title":"string","markdownContent":"# Title\\n\\nContent with \\n for newlines","quiz":[{{"question":"string","options":[{{"id":"string","text":"string","isCorrect":boolean}}],"explanation":"string"}}]}}

Rules:
- Use \\n for newlines in markdownContent
- Max 3 quiz questions
- Start {{ end }}
- Complete JSON only

{format_instructions}
`;
