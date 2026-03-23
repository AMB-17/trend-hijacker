import natural from "natural";

const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");
const tokenizer = new natural.WordTokenizer();

export interface SentimentResult {
  score: number;
  comparative: number;
  classification: "positive" | "negative" | "neutral";
  tokens: string[];
}

export class SentimentAnalyzer {
  /**
   * Analyze sentiment of text
   * Returns a score between -1 (very negative) and 1 (very positive)
   */
  analyzeSentiment(text: string): SentimentResult {
    const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
    const score = analyzer.getSentiment(tokens);

    // Normalize score to -1 to 1 range
    const normalizedScore = Math.max(-1, Math.min(1, score / tokens.length));

    return {
      score: normalizedScore,
      comparative: normalizedScore,
      classification: this.classifySentiment(normalizedScore),
      tokens,
    };
  }

  /**
   * Classify sentiment as positive, negative, or neutral
   */
  private classifySentiment(score: number): "positive" | "negative" | "neutral" {
    if (score > 0.1) return "positive";
    if (score < -0.1) return "negative";
    return "neutral";
  }

  /**
   * Analyze sentiment of multiple texts and return average
   */
  analyzeMultiple(texts: string[]): SentimentResult {
    const results = texts.map((text) => this.analyzeSentiment(text));
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      score: avgScore,
      comparative: avgScore,
      classification: this.classifySentiment(avgScore),
      tokens: [],
    };
  }

  /**
   * Check if text expresses frustration or problems
   * (useful for pain point detection)
   */
  isFrustrated(text: string): boolean {
    const frustrationWords = [
      "frustrating",
      "annoying",
      "difficult",
      "hard",
      "impossible",
      "hate",
      "sick of",
      "tired of",
      "pain",
      "struggle",
      "problem",
    ];

    const lowerText = text.toLowerCase();
    const hasFrustrationWords = frustrationWords.some((word) => lowerText.includes(word));

    const sentiment = this.analyzeSentiment(text);
    const isNegative = sentiment.score < -0.2;

    return hasFrustrationWords || isNegative;
  }
}

// Singleton instance and standalone function exports for ease of use
const sentimentAnalyzer = new SentimentAnalyzer();
export const analyzeSentiment = (text: string): number => {
  return sentimentAnalyzer.analyzeSentiment(text).score;
};
