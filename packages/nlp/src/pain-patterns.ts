export interface PainPoint {
  text: string;
  pattern: string;
  intensity: number;
  context: string;
}

/**
 * Pain point detection patterns
 * These patterns identify user frustrations, needs, and problems
 */
export const PAIN_PATTERNS = [
  // Explicit wishes
  { pattern: /I wish (there was|I could|someone would make|we had)/i, type: "wish", weight: 0.9 },
  { pattern: /wish there was (a|an|some)/i, type: "wish", weight: 0.85 },
  { pattern: /if only (there was|I could|we had)/i, type: "wish", weight: 0.85 },

  // Questions seeking solutions
  { pattern: /does anyone know (a|an|of|how to|where to find)/i, type: "question", weight: 0.8 },
  { pattern: /is there (a|an|any) (tool|app|way|solution|service)/i, type: "question", weight: 0.85 },
  { pattern: /looking for (a|an|some) (tool|app|way|solution|service)/i, type: "search", weight: 0.8 },
  { pattern: /how (do I|can I|to)/i, type: "question", weight: 0.7 },
  { pattern: /where can I (find|get)/i, type: "question", weight: 0.75 },
  { pattern: /anyone know(s)? (of|a|an)/i, type: "question", weight: 0.75 },

  // Problem statements
  { pattern: /this (is|seems) (annoying|frustrating|difficult|hard|impossible)/i, type: "problem", weight: 0.85 },
  { pattern: /(struggling|having trouble|can't figure out|unable to)/i, type: "problem", weight: 0.8 },
  { pattern: /why is (it|this) so (hard|difficult|complicated|confusing)/i, type: "problem", weight: 0.85 },
  { pattern: /(pain|painful|nightmare|headache) (to|when)/i, type: "problem", weight: 0.9 },

  // Needs and wants
  { pattern: /I need (a|an|to|help with|some)/i, type: "need", weight: 0.75 },
  { pattern: /really need (a|an|to|some)/i, type: "need", weight: 0.85 },
  { pattern: /would love (a|an|to|if|some)/i, type: "want", weight: 0.8 },
  { pattern: /desperately need/i, type: "need", weight: 0.95 },

  // Negative experiences
  { pattern: /hate (how|that|when|having to)/i, type: "negative", weight: 0.85 },
  { pattern: /(tired of|sick of|fed up with)/i, type: "negative", weight: 0.9 },
  { pattern: /(annoying|frustrating) (that|when|how)/i, type: "negative", weight: 0.8 },

  // Missing features
  { pattern: /don't have (a|an|any) (way to|tool|solution)/i, type: "missing", weight: 0.85 },
  { pattern: /no (way to|tool for|solution for)/i, type: "missing", weight: 0.8 },
  { pattern: /missing (a|an|the)/i, type: "missing", weight: 0.75 },

  // Comparisons and complaints
  { pattern: /should be easier to/i, type: "complaint", weight: 0.7 },
  { pattern: /(there has to be|must be) (a better way|an easier way)/i, type: "complaint", weight: 0.85 },
  { pattern: /why (can't|don't|isn't there)/i, type: "complaint", weight: 0.75 },
];

export class PainPatternDetector {
  /**
   * Detect pain points in text
   */
  detectPainPoints(text: string): PainPoint[] {
    const painPoints: PainPoint[] = [];
    const sentences = this.splitIntoSentences(text);

    sentences.forEach((sentence) => {
      PAIN_PATTERNS.forEach(({ pattern, type, weight }) => {
        const match = sentence.match(pattern);
        if (match) {
          // Extract context around the match
          const context = sentence.trim();

          painPoints.push({
            text: match[0],
            pattern: type,
            intensity: this.calculateIntensity(sentence, weight),
            context,
          });
        }
      });
    });

    return painPoints;
  }

  /**
   * Calculate pain intensity based on text and pattern
   */
  private calculateIntensity(text: string, baseWeight: number): number {
    let intensity = baseWeight;

    // Boost for intensity words
    const intensifiers = [
      { word: /really/i, boost: 0.1 },
      { word: /desperately/i, boost: 0.15 },
      { word: /seriously/i, boost: 0.1 },
      { word: /urgent(ly)?/i, boost: 0.15 },
      { word: /critical(ly)?/i, boost: 0.15 },
      { word: /must/i, boost: 0.1 },
    ];

    intensifiers.forEach(({ word, boost }) => {
      if (word.test(text)) {
        intensity = Math.min(1, intensity + boost);
      }
    });

    // Boost for negative emotion words
    const negativeEmotions = /(terrible|awful|horrible|disaster|nightmare|unbearable)/i;
    if (negativeEmotions.test(text)) {
      intensity = Math.min(1, intensity + 0.1);
    }

    return intensity;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Aggregate pain points from multiple texts
   */
  aggregatePainPoints(texts: string[]): { pattern: string; count: number; avgIntensity: number }[] {
    const patterns = new Map<string, { count: number; totalIntensity: number }>();

    texts.forEach((text) => {
      const painPoints = this.detectPainPoints(text);
      painPoints.forEach((pp) => {
        const existing = patterns.get(pp.pattern) || { count: 0, totalIntensity: 0 };
        patterns.set(pp.pattern, {
          count: existing.count + 1,
          totalIntensity: existing.totalIntensity + pp.intensity,
        });
      });
    });

    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        avgIntensity: data.totalIntensity / data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }
}

// Standalone function export for ease of use
const painPatternDetector = new PainPatternDetector();
export const detectPainPoints = (text: string): PainPoint[] => {
  return painPatternDetector.detectPainPoints(text);
};
