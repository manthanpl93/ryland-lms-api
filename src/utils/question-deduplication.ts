import natural from "natural";

export class QuestionDeduplicator {
  private readonly similarityThreshold = 0.85;

  // Remove duplicate questions within the current batch
  async removeDuplicates(
    newQuestions: GeneratedQuestion[]
  ): Promise<GeneratedQuestion[]> {
    const uniqueQuestions: GeneratedQuestion[] = [];

    for (const question of newQuestions) {
      const isDuplicate = this.checkSimilarityInBatch(
        question.question,
        uniqueQuestions
      );
      
      if (!isDuplicate) {
        uniqueQuestions.push(question);
      }
    }

    return uniqueQuestions;
  }

  // Check similarity with questions in the current batch
  private checkSimilarityInBatch(
    question: string,
    existingQuestions: GeneratedQuestion[]
  ): boolean {
    for (const existing of existingQuestions) {
      const similarity = this.calculateSimilarity(
        question,
        existing.question
      );
      if (similarity > this.similarityThreshold) {
        return true; // This is a duplicate
      }
    }
    return false; // This is unique
  }

  // Calculate similarity between two questions
  private calculateSimilarity(question1: string, question2: string): number {
    const tokenizer = new natural.WordTokenizer();
    const tokens1 = tokenizer.tokenize(question1);
    const tokens2 = tokenizer.tokenize(question2);
    const intersection = tokens1.filter((token) =>
      tokens2.includes(token)
    ).length;
    const union = new Set([...tokens1, ...tokens2]).size;
    return intersection / union;
  }
}

interface GeneratedQuestion {
  id: string;
  type: "multiple-choice" | "multi-select" | "true-false";
  question: string;
  options: string[];
  correctAnswers: string[];
  feedback: string;
}
