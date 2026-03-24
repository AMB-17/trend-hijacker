import { PrismaClient } from "@packages/database";
import { detectPainPoints, analyzeSentiment } from "@packages/nlp";
import { logger } from "@packages/utils";

export interface DetectedPainPoint {
  postId: string;
  text: string;
  pattern: string;
  intensity: number; // 0-1
  context: string; // Surrounding text for context
}

export interface PainDetectionResult {
  postId: string;
  painPoints: DetectedPainPoint[];
  overallPainIntensity: number; // 0-1 average across all pain points
  hasPainPoints: boolean;
  sentimentScore: number; // -1 to 1
  isProblemFocused: boolean; // True if post expresses problems/needs
}

/**
 * Layer 3: Pain Detection
 * Detects user problems, frustrations, and unmet needs using pattern matching
 */
export class PainDetectionLayer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Detect pain points in a single post
   */
  async detectInPost(
    postId: string,
    title: string,
    content: string
  ): Promise<PainDetectionResult> {
    try {
      // Combine title and content
      const fullText = `${title}\n\n${content}`;

      // Detect pain points using NLP patterns
      const rawPainPoints = detectPainPoints(fullText);

      // Extract context for each pain point
      const painPoints: DetectedPainPoint[] = rawPainPoints.map((pp) => {
        const context = this.extractContext(fullText, pp.text);
        return {
          postId,
          text: pp.text,
          pattern: pp.pattern,
          intensity: pp.intensity,
          context,
        };
      });

      // Calculate overall pain intensity
      const overallPainIntensity =
        painPoints.length > 0
          ? painPoints.reduce((sum, pp) => sum + pp.intensity, 0) /
            painPoints.length
          : 0;

      // Analyze sentiment to identify negative/problem-focused posts
      const sentimentScore = analyzeSentiment(fullText);

      // A post is problem-focused if it has pain points OR negative sentiment
      const isProblemFocused =
        painPoints.length > 0 || sentimentScore < -0.2;

      // Save pain points to database
      if (painPoints.length > 0) {
        await this.savePainPoints(painPoints);
      }

      logger.debug(
        `[PainDetection] Post ${postId}: ${painPoints.length} pain points, intensity: ${overallPainIntensity.toFixed(2)}`
      );

      return {
        postId,
        painPoints,
        overallPainIntensity,
        hasPainPoints: painPoints.length > 0,
        sentimentScore,
        isProblemFocused,
      };
    } catch (error) {
      logger.error(
        `[PainDetection] Error detecting pain in post ${postId}:`,
        error instanceof Error ? error.message : error
      );
      return {
        postId,
        painPoints: [],
        overallPainIntensity: 0,
        hasPainPoints: false,
        sentimentScore: 0,
        isProblemFocused: false,
      };
    }
  }

  /**
   * Detect pain points in multiple posts (batch processing)
   */
  async detectInPosts(
    posts: Array<{ id: string; title: string; content: string }>
  ): Promise<PainDetectionResult[]> {
    const results: PainDetectionResult[] = [];

    for (const post of posts) {
      const result = await this.detectInPost(post.id, post.title, post.content);
      results.push(result);
    }

    const problemFocusedCount = results.filter(
      (r) => r.isProblemFocused
    ).length;

    logger.info(
      `[PainDetection] Processed ${posts.length} posts, ${problemFocusedCount} are problem-focused`
    );

    return results;
  }

  /**
   * Extract surrounding context for a pain point phrase
   */
  private extractContext(text: string, phrase: string): string {
    const index = text.toLowerCase().indexOf(phrase.toLowerCase());
    if (index === -1) {
      return phrase;
    }

    // Get 50 characters before and after
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + phrase.length + 50);

    let context = text.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) {
      context = "..." + context;
    }
    if (end < text.length) {
      context = context + "...";
    }

    return context.trim();
  }

  /**
   * Save pain points to database
   */
  private async savePainPoints(
    painPoints: DetectedPainPoint[]
  ): Promise<void> {
    try {
      // Save all pain points
      await this.prisma.painPoint.createMany({
        data: painPoints.map((pp) => ({
          postId: pp.postId,
          text: pp.text,
          pattern: pp.pattern,
          intensity: pp.intensity,
          context: pp.context,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      logger.error(
        `[PainDetection] Error saving pain points:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Get top pain patterns across all posts
   */
  async getTopPainPatterns(limit: number = 20): Promise<
    Array<{
      pattern: string;
      count: number;
      avgIntensity: number;
      examples: string[];
    }>
  > {
    const painPoints = await this.prisma.painPoint.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000, // Last 1000 pain points
    });

    // Group by pattern
    const patternMap = new Map<
      string,
      { count: number; intensities: number[]; examples: Set<string> }
    >();

    for (const pp of painPoints) {
      if (!patternMap.has(pp.pattern)) {
        patternMap.set(pp.pattern, {
          count: 0,
          intensities: [],
          examples: new Set(),
        });
      }

      const data = patternMap.get(pp.pattern)!;
      data.count++;
      data.intensities.push(pp.intensity);
      if (data.examples.size < 5) {
        data.examples.add(pp.text);
      }
    }

    // Convert to array and calculate averages
    const results = Array.from(patternMap.entries()).map(
      ([pattern, data]) => ({
        pattern,
        count: data.count,
        avgIntensity:
          data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length,
        examples: Array.from(data.examples),
      })
    );

    // Sort by count
    return results.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  /**
   * Calculate problem intensity for a set of posts (for opportunity scoring)
   */
  calculateProblemIntensity(results: PainDetectionResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    // Calculate weighted average:
    // - Posts with pain points: use their intensity
    // - Posts without pain points: 0
    const totalIntensity = results.reduce(
      (sum, result) => sum + result.overallPainIntensity,
      0
    );

    return totalIntensity / results.length;
  }

  /**
   * Get posts with highest pain intensity
   */
  async getHighPainPosts(limit: number = 50): Promise<
    Array<{
      postId: string;
      title: string;
      url: string;
      painPoints: number;
      avgIntensity: number;
    }>
  > {
    const posts = await this.prisma.post.findMany({
      where: {
        painPoints: {
          some: {},
        },
      },
      include: {
        painPoints: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 500,
    });

    // Calculate average intensity for each post
    const postsWithIntensity = posts
      .map((post: any) => {
        const painPoints = post.painPoints.length;
        const avgIntensity =
          painPoints > 0
            ? post.painPoints.reduce((sum: number, pp: any) => sum + pp.intensity, 0) /
              painPoints
            : 0;

        return {
          postId: post.id,
          title: post.title,
          url: post.url,
          painPoints,
          avgIntensity,
        };
      })
      .filter((p: any) => p.painPoints > 0);

    // Sort by average intensity * pain point count (high pain + many pain points = top)
    return postsWithIntensity
      .sort((a: any, b: any) => b.avgIntensity * b.painPoints - a.avgIntensity * a.painPoints)
      .slice(0, limit);
  }
}
