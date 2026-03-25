import { db } from '../db';
import { logger } from '@packages/utils';
import { cache } from './cache.service';
import { openAI } from './openai.service';

/**
 * Advanced Insights Service
 * Generates AI-powered insights, drivers, risk assessment, and tags
 */
export class AdvancedInsightsService {
  /**
   * Generate AI summary for a trend (1-2 paragraphs)
   */
  async generateAISummary(trendId: string): Promise<string> {
    const cacheKey = `ai-summary:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const trend = await db.trend.findUnique({
      where: { id: trendId },
      include: {
        posts: { include: { post: true }, take: 10 },
        sentiments: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    if (!trend) throw new Error('Trend not found');

    // Prepare context for AI
    const topPosts = trend.posts.map(tp => tp.post.title).join('\n');
    const sentiment = trend.sentiments[0];
    const sentimentContext = sentiment 
      ? `Sentiment: ${sentiment.positiveScore * 100}% positive, ${sentiment.negativeScore * 100}% negative`
      : '';

    const prompt = `
Generate a concise 1-2 paragraph summary of this emerging trend. Be specific about what makes it noteworthy.

Trend Title: ${trend.title}
Summary: ${trend.summary}
Discussion Volume: ${trend.discussionVolume} mentions
Velocity: ${trend.velocityGrowth}x growth
Opportunity Score: ${trend.opportunityScore}/100
${sentimentContext}

Top discussions:
${topPosts}

Write the summary in a professional but accessible tone. Include key statistics naturally.
Start directly with the analysis, no introduction needed.
`;

    try {
      const summary = await openAI.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.7,
      });

      // Cache for 7 days
      await cache.set(cacheKey, summary, 604800);
      return summary;
    } catch (error) {
      logger.error('Failed to generate AI summary', { trendId, error });
      // Fallback to template-based summary
      return this.generateTemplateSummary(trend);
    }
  }

  /**
   * Generate fallback template summary
   */
  private generateTemplateSummary(trend: any): string {
    const intensity = trend.discussionVolume > 1000 ? 'significant' : 'growing';
    const trajectory = trend.velocityGrowth > 1.5 ? 'accelerating' : 'steady';
    const sentiment = trend.sentiments?.[0]?.overallScore > 0.1 ? 'positive' : 'mixed';

    return `
"${trend.title}" is attracting ${intensity} attention with ${trend.discussionVolume} mentions and ${trajectory} momentum (${trend.velocityGrowth.toFixed(1)}x growth rate). 
The trend is receiving ${sentiment} sentiment with an opportunity score of ${Math.round(trend.opportunityScore)}/100, indicating ${trend.opportunityScore > 70 ? 'strong market potential' : 'emerging but uncertain'} in this space.
    `.trim();
  }

  /**
   * Extract key drivers (why trend is growing)
   */
  async extractKeyDrivers(trendId: string): Promise<string[]> {
    const cacheKey = `drivers:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trend = await db.trend.findUnique({
      where: { id: trendId },
      include: {
        posts: { include: { post: true }, take: 20 },
      },
    });

    if (!trend) throw new Error('Trend not found');

    const topPosts = trend.posts.map(tp => tp.post.content).join('\n\n');

    const prompt = `
Analyze these discussions about "${trend.title}" and identify 3-5 KEY DRIVERS explaining why this trend is growing.
Focus on concrete reasons, not just generic statements.

Recent Discussions:
${topPosts.substring(0, 2000)}

Return ONLY a JSON array of strings, each being a specific driver. Example format:
["Driver 1: Specific reason with context", "Driver 2: Another concrete reason"]

Be specific and actionable. No introductions or explanations.
`;

    try {
      const response = await openAI.generateText(prompt, {
        maxTokens: 400,
        temperature: 0.5,
      });

      const drivers = JSON.parse(response);
      const result = Array.isArray(drivers) ? drivers : [response];

      await cache.set(cacheKey, JSON.stringify(result), 604800);
      return result;
    } catch (error) {
      logger.error('Failed to extract drivers', { trendId, error });
      return this.getDefaultDrivers(trend);
    }
  }

  private getDefaultDrivers(trend: any): string[] {
    return [
      `High discussion volume (${trend.discussionVolume} mentions) indicating strong community interest`,
      `Growing velocity rate (${trend.velocityGrowth.toFixed(1)}x) showing accelerating adoption`,
      `Diverse keyword mentions suggesting multi-industry applicability`,
    ];
  }

  /**
   * Perform risk assessment
   */
  async performRiskAssessment(trendId: string): Promise<any> {
    const cacheKey = `risk:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trend = await db.trend.findUnique({
      where: { id: trendId },
      include: {
        sentiments: { orderBy: { timestamp: 'desc' }, take: 1 },
        timeseries: { orderBy: { date: 'desc' }, take: 30 },
      },
    });

    if (!trend) throw new Error('Trend not found');

    // Calculate hype score (1-10)
    const hypeScore = this.calculateHypeScore(trend);

    // Calculate market validation score
    const marketValidation = this.calculateMarketValidation(trend);

    // Estimate competitive saturation
    const competitorTrends = await db.trend.findMany({
      where: {
        keywords: { hasSome: trend.keywords },
        id: { not: trendId },
      },
      select: { id: true, opportunityScore: true },
    });
    const competitiveSaturation = Math.min(10, Math.ceil((competitorTrends.length / 10) * 10));

    // Identify risk indicators
    const riskIndicators = this.identifyRiskIndicators(trend);

    // Calculate overall opportunity score
    const opportunityScore = (
      (10 - hypeScore) * 0.3 +
      marketValidation * 0.4 +
      (10 - competitiveSaturation) * 0.3
    ) / 10;

    const assessment = {
      hypeScore: Math.round(hypeScore),
      marketValidation: Math.round(marketValidation),
      competitiveSaturation: Math.round(competitiveSaturation),
      riskIndicators,
      opportunityScore: Math.round(opportunityScore),
      recommendation: this.getOpportunityRecommendation(opportunityScore),
      goNoGo: opportunityScore > 6 ? 'GO' : opportunityScore > 4 ? 'REVIEW' : 'NO-GO',
    };

    await cache.set(cacheKey, JSON.stringify(assessment), 604800);
    return assessment;
  }

  private calculateHypeScore(trend: any): number {
    // Higher velocity = higher hype score
    let score = Math.min(10, trend.velocityGrowth * 2);

    // Adjust based on discussion volume volatility
    if (trend.timeseries && trend.timeseries.length > 7) {
      const volumes = trend.timeseries.map(t => t.discussionVolume);
      const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const variance = volumes.reduce((sq, v) => sq + (v - mean) ** 2, 0) / volumes.length;
      const cv = Math.sqrt(variance) / mean; // Coefficient of variation

      if (cv > 1) score += 2; // High volatility = higher hype
    }

    return Math.min(10, score);
  }

  private calculateMarketValidation(trend: any): number {
    let score = 0;

    // Discussion volume (normalized)
    if (trend.discussionVolume > 1000) score += 3;
    else if (trend.discussionVolume > 500) score += 2;
    else if (trend.discussionVolume > 100) score += 1;

    // Problem intensity
    if (trend.problemIntensity > 0.7) score += 3;
    else if (trend.problemIntensity > 0.5) score += 2;
    else if (trend.problemIntensity > 0.3) score += 1;

    // Sentiment (positive validation)
    if (trend.sentiments && trend.sentiments[0]) {
      const sentiment = trend.sentiments[0];
      if (sentiment.positiveScore > 0.6) score += 2;
      else if (sentiment.positiveScore > 0.4) score += 1;
    }

    // Novelty (new = less validated)
    if (trend.noveltyScore < 0.5) score += 1; // More established = better validation

    return Math.min(10, score);
  }

  private identifyRiskIndicators(): string[] {
    // Would analyze various risk factors
    return [
      // Examples: "High competitor count", "Declining sentiment", "Low market size"
    ];
  }

  private getOpportunityRecommendation(score: number): string {
    if (score > 8) return 'Exceptional opportunity - strong validation and low hype risk';
    if (score > 7) return 'Strong opportunity - good market signals with manageable hype';
    if (score > 6) return 'Moderate opportunity - watch for market validation';
    if (score > 4) return 'Uncertain - requires further analysis before commitment';
    return 'Poor opportunity - high hype-to-validation ratio';
  }

  /**
   * Generate AI-powered auto tags
   */
  async generateAutoTags(trendId: string): Promise<any[]> {
    const cacheKey = `auto-tags:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trend = await db.trend.findUnique({
      where: { id: trendId },
      include: {
        posts: { include: { post: true }, take: 15 },
      },
    });

    if (!trend) throw new Error('Trend not found');

    const topContent = trend.posts.map(tp => tp.post.title).join(' ');

    const prompt = `
Analyze "${trend.title}" and generate 8-12 semantic tags in these categories:
- industry (e.g., "SaaS", "Healthcare", "Finance")
- difficulty (e.g., "Easy to build", "Complex", "Infrastructure")
- market_size (e.g., "Small niche", "Large market", "Emerging segment")
- timeframe (e.g., "1-3 months", "6-12 months", "2+ years")
- risk_level (e.g., "Low risk", "Moderate", "High risk")

Top content: ${topContent.substring(0, 500)}

Return ONLY a JSON array of tag objects with "tag", "category", and "confidence" (0-1) fields.
Example: [{"tag":"SaaS","category":"industry","confidence":0.95},...]

No explanations, just the JSON array.
`;

    try {
      const response = await openAI.generateText(prompt, {
        maxTokens: 500,
        temperature: 0.6,
      });

      const tags = JSON.parse(response);
      const result = Array.isArray(tags) ? tags : [];

      // Save to database
      for (const tag of result) {
        await db.trendTag.upsert({
          where: { trendId_tag: { trendId, tag: tag.tag } },
          create: {
            trendId,
            tag: tag.tag,
            category: tag.category,
            confidence: tag.confidence,
          },
          update: {
            confidence: tag.confidence,
          },
        });
      }

      await cache.set(cacheKey, JSON.stringify(result), 604800);
      return result;
    } catch (error) {
      logger.error('Failed to generate tags', { trendId, error });
      return [];
    }
  }

  /**
   * Classify industry impact
   */
  async classifyIndustryImpact(trendId: string): Promise<any> {
    const cacheKey = `industry-impact:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trend = await db.trend.findUnique({
      where: { id: trendId },
      include: {
        posts: { include: { post: true }, take: 10 },
      },
    });

    if (!trend) throw new Error('Trend not found');

    const topContent = trend.posts.map(tp => tp.post.content).join('\n').substring(0, 1500);

    const prompt = `
Analyze the potential industry impact of "${trend.title}" and return JSON with:
- industries: array of affected industries
- impactSeverity: "high", "medium", or "low"
- timelineImpact: "immediate", "6-month", or "12-month"
- justification: brief explanation

Content context: ${topContent}

Return ONLY the JSON object, no explanation.
`;

    try {
      const response = await openAI.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.6,
      });

      const impact = JSON.parse(response);

      await cache.set(cacheKey, JSON.stringify(impact), 604800);
      return impact;
    } catch (error) {
      logger.error('Failed to classify industry impact', { trendId, error });
      return {
        industries: [],
        impactSeverity: 'unknown',
        timelineImpact: 'unknown',
      };
    }
  }
}

export const advancedInsights = new AdvancedInsightsService();
