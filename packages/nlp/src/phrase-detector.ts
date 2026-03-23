import natural from "natural";

const tokenizer = new natural.WordTokenizer();

export interface ExtractedPhrase {
  phrase: string;
  score: number;
  occurrences: number;
}

export class PhraseDetector {
  /**
   * Extract n-grams (phrases) from text
   */
  extractNGrams(text: string, n: number = 2): string[] {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    if (!tokens || tokens.length < n) return [];

    const ngrams: string[] = [];

    for (let i = 0; i <= tokens.length - n; i++) {
      const ngram = tokens.slice(i, i + n).join(" ");
      ngrams.push(ngram);
    }

    return ngrams;
  }

  /**
   * Extract bi-grams (2-word phrases)
   */
  extractBigrams(text: string): string[] {
    return this.extractNGrams(text, 2);
  }

  /**
   * Extract tri-grams (3-word phrases)
   */
  extractTrigrams(text: string): string[] {
    return this.extractNGrams(text, 3);
  }

  /**
   * Extract common phrases from multiple texts
   */
  detectCommonPhrases(
    texts: string[],
    options?: {
      minOccurrences?: number;
      ngramSize?: number;
      maxPhrases?: number;
    }
  ): ExtractedPhrase[] {
    const minOccurrences = options?.minOccurrences || 2;
    const ngramSize = options?.ngramSize || 2;
    const maxPhrases = options?.maxPhrases || 50;

    const phraseFreqs = new Map<string, number>();

    texts.forEach((text) => {
      const ngrams = this.extractNGrams(text, ngramSize);
      const uniquePhrases = new Set(ngrams);

      uniquePhrases.forEach((phrase) => {
        // Filter out phrases with stopwords or too generic
        if (this.isValidPhrase(phrase)) {
          phraseFreqs.set(phrase, (phraseFreqs.get(phrase) || 0) + 1);
        }
      });
    });

    return Array.from(phraseFreqs.entries())
      .filter(([_, count]) => count >= minOccurrences)
      .map(([phrase, occurrences]) => ({
        phrase,
        occurrences,
        score: occurrences,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPhrases);
  }

  private isValidPhrase(phrase: string): boolean {
    // Filter out phrases that are too short or contain only stopwords
    const stopwords = ["a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "of", "to", "in", "for", "on", "with"];

    const words = phrase.split(" ");

    // Must have at least one non-stopword
    const hasNonStopword = words.some((word) => !stopwords.includes(word));

    // Must not be all numbers
    const isAllNumbers = words.every((word) => /^\d+$/.test(word));

    return hasNonStopword && !isAllNumbers && phrase.length > 5;
  }
}
