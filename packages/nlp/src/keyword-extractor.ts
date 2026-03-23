import natural from "natural";
import { removeStopwords } from "stopword";

const tokenizer = new natural.WordTokenizer();

export interface ExtractedKeyword {
  keyword: string;
  score: number;
  frequency: number;
}

export class KeywordExtractor {
  extractKeywords(text: string, options?: { minLength?: number; maxKeywords?: number }): ExtractedKeyword[] {
    const minLength = options?.minLength || 3;
    const maxKeywords = options?.maxKeywords || 20;

    const tokens = tokenizer.tokenize(text.toLowerCase());
    if (!tokens) return [];

    // Remove stopwords
    const filtered = removeStopwords(tokens);

    // Count frequencies
    const frequencies = new Map<string, number>();
    filtered.forEach((token) => {
      if (token.length >= minLength && /^[a-z0-9-]+$/.test(token)) {
        frequencies.set(token, (frequencies.get(token) || 0) + 1);
      }
    });

    // Convert to array and sort by frequency
    const keywords = Array.from(frequencies.entries())
      .map(([keyword, frequency]) => ({
        keyword,
        frequency,
        score: frequency,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxKeywords);

    return keywords;
  }

  extractFromMultipleTexts(texts: string[]): ExtractedKeyword[] {
    const combinedFreqs = new Map<string, number>();

    texts.forEach((text) => {
      const keywords = this.extractKeywords(text);
      keywords.forEach((kw) => {
        combinedFreqs.set(kw.keyword, (combinedFreqs.get(kw.keyword) || 0) + kw.frequency);
      });
    });

    return Array.from(combinedFreqs.entries())
      .map(([keyword, frequency]) => ({
        keyword,
        frequency,
        score: frequency,
      }))
      .sort((a, b) => b.score - a.score);
  }
}
