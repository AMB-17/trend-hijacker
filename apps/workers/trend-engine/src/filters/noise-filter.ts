import { logger } from "@packages/utils";

export interface NoiseFilterResult {
  isNoise: boolean;
  reasons: string[];
  score: number; // 0-1, where 1 = definitely noise
}

/**
 * Noise Filter
 * Filters out spam, memes, duplicates, and low-quality posts
 */
export class NoiseFilter {
  // Spam indicators
  private readonly SPAM_PATTERNS = [
    /\b(buy now|click here|limited time|act fast|discount code|promo code)\b/i,
    /\b(viagra|cialis|casino|lottery|winner)\b/i,
    /\b(make money fast|work from home|passive income guaranteed)\b/i,
    /\$\$\$+/,
    /FREE!!!/i,
    /🔥{3,}/, // Multiple fire emojis
  ];

  // Meme/joke indicators
  private readonly MEME_PATTERNS = [
    /\b(lol|lmao|rofl|haha){2,}\b/i,
    /\b(meme|shitpost)\b/i,
    /😂{2,}/, // Multiple laughing emojis
  ];

  // Low-quality indicators
  private readonly LOW_QUALITY_PATTERNS = [
    /^(test|testing|hello|hi|hey)$/i,
    /\[deleted\]/i,
    /\[removed\]/i,
  ];

  /**
   * Check if a post is noise
   */
  filter(title: string, content: string, upvotes: number = 0): NoiseFilterResult {
    const reasons: string[] = [];
    let score = 0;

    const fullText = `${title} ${content}`;

    // Check for spam
    for (const pattern of this.SPAM_PATTERNS) {
      if (pattern.test(fullText)) {
        reasons.push("Contains spam patterns");
        score += 0.4;
        break;
      }
    }

    // Check for memes/jokes
    for (const pattern of this.MEME_PATTERNS) {
      if (pattern.test(fullText)) {
        reasons.push("Appears to be meme/joke content");
        score += 0.3;
        break;
      }
    }

    // Check for low quality
    for (const pattern of this.LOW_QUALITY_PATTERNS) {
      if (pattern.test(fullText)) {
        reasons.push("Low quality content");
        score += 0.5;
        break;
      }
    }

    // Check content length
    if (content.length < 20) {
      reasons.push("Content too short");
      score += 0.2;
    }

    // Check title length
    if (title.length < 10) {
      reasons.push("Title too short");
      score += 0.1;
    }

    // Check for excessive capitalization
    const capsRatio = this.calculateCapsRatio(fullText);
    if (capsRatio > 0.5 && fullText.length > 50) {
      reasons.push("Excessive capitalization");
      score += 0.3;
    }

    // Check for excessive punctuation
    const punctRatio = this.calculatePunctuationRatio(fullText);
    if (punctRatio > 0.15) {
      reasons.push("Excessive punctuation");
      score += 0.2;
    }

    // Check upvotes (negative upvotes = downvoted = probably bad)
    if (upvotes < -5) {
      reasons.push("Heavily downvoted");
      score += 0.3;
    }

    // Cap score at 1.0
    score = Math.min(1, score);

    const isNoise = score >= 0.5;

    if (isNoise) {
      logger.debug(
        `[NoiseFilter] Filtered out post: ${reasons.join(", ")} (score: ${score.toFixed(2)})`
      );
    }

    return { isNoise, reasons, score };
  }

  /**
   * Filter multiple posts
   */
  filterPosts(
    posts: Array<{
      id: string;
      title: string;
      content: string;
      upvotes: number;
    }>
  ): Array<{ id: string; title: string; content: string }> {
    const filtered = posts.filter((post) => {
      const result = this.filter(post.title, post.content, post.upvotes);
      return !result.isNoise;
    });

    logger.info(
      `[NoiseFilter] Filtered ${posts.length - filtered.length}/${posts.length} noisy posts`
    );

    return filtered;
  }

  /**
   * Check for duplicate or near-duplicate content
   */
  isDuplicate(
    text1: string,
    text2: string,
    threshold: number = 0.8
  ): boolean {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word))
    );
    const union = new Set([...words1, ...words2]);

    const similarity = intersection.size / union.size;

    return similarity >= threshold;
  }

  /**
   * Deduplicate posts by content similarity
   */
  deduplicatePosts<T extends { title: string; content: string }>(
    posts: T[]
  ): T[] {
    const unique: T[] = [];

    for (const post of posts) {
      const isDupe = unique.some((existing) =>
        this.isDuplicate(
          `${post.title} ${post.content}`,
          `${existing.title} ${existing.content}`,
          0.85
        )
      );

      if (!isDupe) {
        unique.push(post);
      }
    }

    logger.info(
      `[NoiseFilter] Removed ${posts.length - unique.length} duplicate posts`
    );

    return unique;
  }

  /**
   * Calculate ratio of capital letters
   */
  private calculateCapsRatio(text: string): number {
    const letters = text.replace(/[^a-zA-Z]/g, "");
    if (letters.length === 0) return 0;

    const caps = text.replace(/[^A-Z]/g, "");
    return caps.length / letters.length;
  }

  /**
   * Calculate ratio of punctuation marks
   */
  private calculatePunctuationRatio(text: string): number {
    if (text.length === 0) return 0;

    const punct = text.replace(/[^!?.,:;]/g, "");
    return punct.length / text.length;
  }

  /**
   * Check if post is self-promotion
   */
  isSelfPromotion(title: string, content: string): boolean {
    const promoPatterns = [
      /\b(my (new )?(startup|app|tool|product|service|website|company))\b/i,
      /\b(check out|built|launched|made|created) (my|our)\b/i,
      /\b(feedback|thoughts|opinions) (on|about) (my|our)\b/i,
      /\b(shameless plug)\b/i,
    ];

    const fullText = `${title} ${content}`;

    return promoPatterns.some((pattern) => pattern.test(fullText));
  }
}
