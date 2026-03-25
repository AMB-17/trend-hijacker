import { db } from '../db';
import { logger } from '@packages/utils';
import { cache } from './cache.service';
import { openAI } from './openai.service';

/**
 * Sentiment Analysis Service
 * Analyzes sentiment distribution, trends, and drivers
 */
export class SentimentAnalysisService {
  /**
   * Get sentiment analysis for a trend
   */
  async getSentimentAnalysis(trendId: string) {
    const cacheKey = `sentiment:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const sentiments = await db.trendSentiment.findMany({
      where: { trendId },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });

    if (sentiments.length === 0) {
      return this.getEmptySentimentAnalysis(trendId);
    }

    const analysis = {
      latest: sentiments[0],
      timeSeries: sentiments.reverse(),
      summary: this.calculateSentimentSummary(sentiments),
      trend: this.calculateSentimentTrend(sentiments),
      distribution: this.calculateDistribution(sentiments),
    };

    await cache.set(cacheKey, JSON.stringify(analysis), 3600);
    return analysis;
  }

  /**
   * Calculate sentiment drivers (what comments cause positive/negative)
   */
  async analyzeSentimentDrivers(trendId: string) {
    const cacheKey = `sentiment-drivers:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trend = await db.trend.findUnique({
      where: { id: trendId },
      include: { posts: { include: { post: true } } },
    });

    if (!trend || trend.posts.length === 0) {
      return { positiveDrivers: [], negativeDrivers: [], neutral: [] };
    }

    // Get recent posts
    const recentPosts = trend.posts
      .map(tp => tp.post)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 50);

    // Analyze posts for sentiment drivers
    const drivers = await this.extractSentimentDrivers(recentPosts);

    await cache.set(cacheKey, JSON.stringify(drivers), 7200);
    return drivers;
  }

  /**
   * Extract key phrases that drive sentiment
   */
  private async extractSentimentDrivers(posts: any[]) {
    // Simple extraction based on common phrases
    const positiveKeywords = new Map<string, number>();
    const negativeKeywords = new Map<string, number>();
    const neutralKeywords = new Map<string, number>();

    for (const post of posts) {
      const text = (post.title + ' ' + post.content).toLowerCase();
      
      // Positive indicators
      if (/excellent|great|amazing|love|perfect|best|brilliant|fantastic/.test(text)) {
        const matches = text.match(/excellent|great|amazing|love|perfect|best|brilliant|fantastic/g) || [];
        matches.forEach(m => {
          positiveKeywords.set(m, (positiveKeywords.get(m) || 0) + 1);
        });
      }

      // Negative indicators
      if (/terrible|hate|awful|worst|bad|horrible|disappointing|useless/.test(text)) {
        const matches = text.match(/terrible|hate|awful|worst|bad|horrible|disappointing|useless/g) || [];
        matches.forEach(m => {
          negativeKeywords.set(m, (negativeKeywords.get(m) || 0) + 1);
        });
      }

      // Neutral/Analytical
      if (/however|question|concern|issue|problem|needs|potential|opportunity/.test(text)) {
        const matches = text.match(/however|question|concern|issue|problem|needs|potential|opportunity/g) || [];
        matches.forEach(m => {
          neutralKeywords.set(m, (neutralKeywords.get(m) || 0) + 1);
        });
      }
    }

    const sortByFrequency = (map: Map<string, number>) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([keyword, count]) => ({ keyword, mentions: count }));

    return {
      positiveDrivers: sortByFrequency(positiveKeywords),
      negativeDrivers: sortByFrequency(negativeKeywords),
      neutralIndicators: sortByFrequency(neutralKeywords),
    };
  }

  /**
   * Calculate overall sentiment trend (improving/declining)
   */
  private calculateSentimentTrend(sentiments: any[]) {
    if (sentiments.length < 2) return { direction: 'stable', strength: 0 };

    const firstSentiment = sentiments[sentiments.length - 1].overallScore;
    const lastSentiment = sentiments[0].overallScore;
    const diff = lastSentiment - firstSentiment;

    let direction = 'stable';
    if (diff > 0.1) direction = 'improving';
    if (diff < -0.1) direction = 'declining';

    const strength = Math.abs(diff);

    return { direction, strength, firstScore: firstSentiment, lastScore: lastSentiment };
  }

  /**
   * Calculate sentiment summary statistics
   */
  private calculateSentimentSummary(sentiments: any[]) {
    const latest = sentiments[0];
    const avgPositive = sentiments.reduce((sum, s) => sum + s.positiveScore, 0) / sentiments.length;
    const avgNegative = sentiments.reduce((sum, s) => sum + s.negativeScore, 0) / sentiments.length;
    const avgNeutral = sentiments.reduce((sum, s) => sum + s.neutralScore, 0) / sentiments.length;

    return {
      latest: {
        positive: latest.positiveScore,
        negative: latest.negativeScore,
        neutral: latest.neutralScore,
        overall: latest.overallScore,
      },
      averages: {
        positive: avgPositive,
        negative: avgNegative,
        neutral: avgNeutral,
      },
      dominant: this.getDominantSentiment(latest.positiveScore, latest.negativeScore, latest.neutralScore),
    };
  }

  /**
   * Calculate sentiment distribution
   */
  private calculateDistribution(sentiments: any[]) {
    const total = sentiments.length;
    return {
      positive: sentiments.filter(s => s.overallScore > 0.2).length / total,
      negative: sentiments.filter(s => s.overallScore < -0.2).length / total,
      neutral: sentiments.filter(s => Math.abs(s.overallScore) <= 0.2).length / total,
    };
  }

  private getDominantSentiment(pos: number, neg: number, neut: number): string {
    const max = Math.max(pos, neg, neut);
    if (max === pos) return 'positive';
    if (max === neg) return 'negative';
    return 'neutral';
  }

  private getEmptySentimentAnalysis(trendId: string) {
    return {
      latest: null,
      timeSeries: [],
      summary: {
        latest: { positive: 0, negative: 0, neutral: 0, overall: 0 },
        averages: { positive: 0, negative: 0, neutral: 0 },
        dominant: 'neutral',
      },
      trend: { direction: 'stable', strength: 0 },
      distribution: { positive: 0, negative: 0, neutral: 1 },
    };
  }
}

export const sentimentAnalysis = new SentimentAnalysisService();
