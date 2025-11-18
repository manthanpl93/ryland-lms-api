import OpenAI from "openai";
import { AI_QUIZ_LIMITS } from "../../utils/consts/ai-quiz-constants";

export class ChatGPTService {
  private openai: OpenAI;
  private readonly maxRetries = 3;
  private readonly rateLimitDelay = 1000; // 1 second between requests

  constructor(app?: any) {
    const apiKey = app?.get("openai")?.apiKey;
    this.openai = new OpenAI({
      apiKey,
    });
  }

  // Generate questions from a text chunk
  async generateQuestions(
    chunk: TextChunk,
    settings: QuizSettings
  ): Promise<GeneratedQuestion[]> {
    const prompt = this.buildPrompt(chunk.content, settings);
    let attempts = 0;

    while (attempts < this.maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: AI_QUIZ_LIMITS.MAX_TOKENS_PER_CHUNK,
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) {
          throw new Error("No content received from OpenAI");
        }

        // Try to parse JSON from the response
        let questions: GeneratedQuestion[] = [];
        try {
          // Extract JSON array from the response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: try to parse the entire content
            questions = JSON.parse(content);
          }
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError);
          // Return empty array if parsing fails
          return [];
        }

        // Validate and clean up the questions
        return questions.map((q, index) => ({
          id: q.id || `question-${Date.now()}-${index}`,
          type: q.type || "multiple-choice",
          question: q.question || "",
          options: q.options || [],
          correctAnswers: q.correctAnswers || [],
          feedback: q.feedback || "",
        }));
      } catch (error) {
        attempts++;
        if (attempts >= this.maxRetries)
          throw new Error(
            "Failed to generate questions after multiple attempts"
          );
        await new Promise((resolve) =>
          setTimeout(resolve, this.rateLimitDelay)
        );
      }
    }

    return [];
  }

  // Build prompt for ChatGPT
  private buildPrompt(content: string, settings: QuizSettings): string {
    const questionTypes = settings.questionTypes.join(", ");
    console.log("questionTypes", questionTypes);

    // Generate dynamic JSON structure based on question types
    const jsonStructure = this.generateJsonStructure(settings.questionTypes);
    
    // Generate dynamic guidelines based on question types
    const guidelines = this.generateGuidelines(settings.questionTypes);

    return `Generate ${settings.questionCount} questions based on the following content: "${content}"

Requirements:
- Question types: ${questionTypes}
- Difficulty: ${settings.difficulty}
- Question Language: Generate ALL questions, options, and feedback in ${settings.language} only, regardless of the source document's language

IMPORTANT: The source document may be in any language, but you must generate all questions, answer options, and feedback explanations ONLY in ${settings.language}. If the document is in a different language, translate the concepts and create questions in ${settings.language}.

For each question, provide a JSON object with the following structure:
${jsonStructure}

Guidelines:
${guidelines}

Return the questions as a JSON array.`;
  }

  // Generate dynamic JSON structure based on question types
  private generateJsonStructure(questionTypes: string[]): string {
    // If no question types provided, use default
    if (questionTypes.length === 0) {
      return this.getMultiTypeStructure(["multiple-choice", "multi-select", "true-false"]);
    }
    
    // For any number of question types, show only those specific types
    return this.getMultiTypeStructure(questionTypes);
  }

  // Helper method to get JSON structure for multiple question types
  private getMultiTypeStructure(types: string[]): string {
    const typeString = types.map(t => `"${t}"`).join(" | ");
    
    // Generate specific structure examples for each available type
    const structureExamples = [];
    
    if (types.includes("true-false")) {
      structureExamples.push(`For true-false questions, use this structure:
{
  "id": "unique-id",
  "type": "true-false",
  "question": "The question text",
  "options": ["True", "False"],
  "correctAnswers": ["True"],
  "feedback": "Explanation of why this answer is correct"
}`);
    }
    
    if (types.includes("multiple-choice")) {
      structureExamples.push(`For multiple-choice questions, use this structure:
{
  "id": "unique-id",
  "type": "multiple-choice",
  "question": "The question text",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswers": ["correct-answer"],
  "feedback": "Explanation of why this answer is correct"
}`);
    }
    
    if (types.includes("multi-select")) {
      structureExamples.push(`For multi-select questions, use this structure:
{
  "id": "unique-id",
  "type": "multi-select",
  "question": "The question text",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswers": ["correct-answer1", "correct-answer2"],
  "feedback": "Explanation of why this answer is correct"
}`);
    }
    
    return `Question types: ${typeString}

${structureExamples.join("\n\n")}`;
  }

  // Generate dynamic guidelines based on question types
  private generateGuidelines(questionTypes: string[]): string {
    if (questionTypes.length === 0) {
      return this.getAllGuidelines();
    }
    
    const guidelines = [];
    
    // Add specific guidelines for each available question type
    if (questionTypes.includes("multiple-choice")) {
      guidelines.push("- For multiple-choice: provide 4 options with 1 correct answer");
    }
    if (questionTypes.includes("multi-select")) {
      guidelines.push("- For multi-select: provide 4 options with 1-3 correct answers");
    }
    if (questionTypes.includes("true-false")) {
      guidelines.push("- For true-false: provide 2 options [\"True\", \"False\"] with 1 correct answer");
    }
    
    // Add common guidelines
    guidelines.push("- Make questions challenging but fair based on the content");
    guidelines.push("- Ensure options are plausible and well-distributed");
    guidelines.push("- Provide clear, educational feedback for each question");
    
    return guidelines.join("\n");
  }

  // Helper method to get all guidelines (for fallback)
  private getAllGuidelines(): string {
    return `- For multiple-choice: provide 4 options with 1 correct answer
- For multi-select: provide 4 options with 1-3 correct answers
- For true-false: provide 2 options ["True", "False"] with 1 correct answer
- Make questions challenging but fair based on the content
- Ensure options are plausible and well-distributed
- Provide clear, educational feedback for each question`;
  }
}

interface TextChunk {
  content: string;
}

interface QuizSettings {
  questionCount: number;
  questionTypes: ("multiple-choice" | "multi-select" | "true-false")[];
  difficulty: string;
  language: string;
}

interface GeneratedQuestion {
  id: string;
  type: "multiple-choice" | "multi-select" | "true-false";
  question: string;
  options: string[];
  correctAnswers: string[];
  feedback: string;
} 