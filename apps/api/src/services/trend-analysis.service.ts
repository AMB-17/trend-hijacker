import { db } from '../db';
import { logger } from '@packages/utils';
import { cache } from './cache.service';

/**
 * Trend Analysis Service
 * Handles time-series analysis, cohort analysis, and competitive landscape detection
 */
export class TrendAnalysisService {
  /**
   * Get time-series data for a trend over a specified period
   */
  async getTimeSeriesData(trendId: string, period: '1m' | '3m' | '6m' | '12m' = '6m') {
    const cacheKey = `timeseries:${trendId}:${period}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const days = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const timeseries = await db.trendTimeSeries.findMany({
      where: {
        trendId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const result = {
      period,
      days,
      data: timeseries,
      metrics: this.calculateTimeSeriesMetrics(timeseries),
      anomalies: this.detectAnomalies(timeseries),
    };

    await cache.set(cacheKey, JSON.stringify(result), 3600); // 1 hour TTL
    return result;
  }

  /**
   * Calculate growth patterns and seasonality
   */
  private calculateTimeSeriesMetrics(data: any[]) {
    if (data.length === 0) {
      return {
        averageVelocity: 0,
        averageDiscussionVolume: 0,
        averageSentiment: 0,
        peakDay: null,
        minDay: null,
        growthRate: 0,
      };
    }

    const velocities = data.map(d => d.velocityGrowth);
    const volumes = data.map(d => d.discussionVolume);
    const sentiments = data.map(d => 
      (d.positiveSentiment - d.negativeSentiment)
    );

    // Calculate growth rate (percent change from first to last)
    const firstVolume = data[0].discussionVolume;
    const lastVolume = data[data.length - 1].discussionVolume;
    const growthRate = firstVolume > 0 ? ((lastVolume - firstVolume) / firstVolume) * 100 : 0;

    return {
      averageVelocity: velocities.reduce((a, b) => a + b, 0) / velocities.length,
      averageDiscussionVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      averageSentiment: sentiments.reduce((a, b) => a + b, 0) / sentiments.length,
      peakDay: data.reduce((max, d) => d.discussionVolume > max.discussionVolume ? d : max),
      minDay: data.reduce((min, d) => d.discussionVolume < min.discussionVolume ? d : min),
      growthRate,
    };
  }

  /**
   * Detect anomalies (sudden spikes or drops)
   */
  private detectAnomalies(data: any[]): Array<{ date: string; type: 'spike' | 'drop'; value: number; std_devs: number }> {
    if (data.length < 3) return [];

    const volumes = data.map(d => d.discussionVolume);
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const std_dev = Math.sqrt(volumes.reduce((sq, n) => sq + (n - mean) ** 2, 0) / volumes.length);

    const anomalies: any[] = [];
    volumes.forEach((vol, i) => {
      const z_score = (vol - mean) / std_dev;
      if (Math.abs(z_score) > 2) { // 2+ standard deviations
        anomalies.push({
          date: data[i].date,
          type: vol > mean ? 'spike' : 'drop',
          value: vol,
          std_devs: Math.abs(z_score),
        });
      }
    });

    return anomalies;
  }

  /**
   * Detect seasonality patterns
   */
  async detectSeasonality(trendId: string, period: '3m' | '6m' | '12m' = '6m') {
    const data = await this.getTimeSeriesData(trendId, period);
    const timeseries = data.data;

    if (timeseries.length < 7) {
      return { seasonalityScore: 0, pattern: null };
    }

    // Group by day of week
    const dayOfWeekPatterns: { [key: number]: number[] } = {};
    timeseries.forEach(ts => {
      const day = new Date(ts.date).getDay();
      if (!dayOfWeekPatterns[day]) dayOfWeekPatterns[day] = [];
      dayOfWeekPatterns[day].push(ts.discussionVolume);
    });

    // Calculate variance across days of week
    const dayMeans = Object.values(dayOfWeekPatterns).map(vals => 
      vals.reduce((a, b) => a + b, 0) / vals.length
    );
    const overallMean = dayMeans.reduce((a, b) => a + b, 0) / dayMeans.length;
    const variance = dayMeans.reduce((sq, m) => sq + (m - overallMean) ** 2, 0) / dayMeans.length;
    
    // Seasonality score (0-1): higher variance = stronger pattern
    const seasonalityScore = Math.min(1, variance / (overallMean ** 2));

    return {
      seasonalityScore,
      pattern: dayOfWeekPatterns,
      peakDay: Object.entries(dayOfWeekPatterns).reduce((max, [day, vals]) => {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        return mean > (max.mean || 0) ? { day: parseInt(day), mean } : max;
      }, {} as any),
    };
  }

  /**
   * Get cohort analysis for a trend
   */
  async getCohortAnalysis(trendId: string) {
    const cacheKey = `cohort:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const cohortAnalysis = await db.cohortAnalysis.findMany({
      where: { trendId },
      orderBy: { engagementScore: 'desc' },
    });

    const result = {
      trendId,
      cohorts: cohortAnalysis,
      heatmap: this.buildCohortHeatmap(cohortAnalysis),
    };

    await cache.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  /**
   * Build cohort interest heatmap
   */
  private buildCohortHeatmap(cohortAnalysis: any[]) {
    return cohortAnalysis.reduce((heatmap, cohort) => ({
      ...heatmap,
      [cohort.cohortName]: {
        engagement: cohort.engagementScore,
        mentions: cohort.mentionCount,
        sentiment: cohort.averageSentiment,
      },
    }), {});
  }

  /**
   * Get competitive landscape analysis
   */
  async getCompetitiveLandscape(trendId: string) {
    const cacheKey = `landscape:${trendId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let landscape = await db.competitiveLandscape.findUnique({
      where: { trendId },
    });

    if (!landscape) {
      landscape = await this.analyzeCompetitiveLandscape(trendId);
    }

    // Enrich with similar trend data
    const enrichedData = {
      ...landscape,
      similarTrends: [],
    };

    if (landscape.similarTrendIds && landscape.similarTrendIds.length > 0) {
      enrichedData.similarTrends = await db.trend.findMany({
        where: { id: { in: landscape.similarTrendIds } },
        select: {
          id: true,
          title: true,
          velocityGrowth: true,
          discussionVolume: true,
          opportunityScore: true,
        },
      });
    }

    await cache.set(cacheKey, JSON.stringify(enrichedData), 3600);
    return enrichedData;
  }

  /**
   * Analyze competitive landscape
   */
  private async analyzeCompetitiveLandscape(trendId: string) {
    const trend = await db.trend.findUnique({
      where: { id: trendId },
      include: { keywords: true },
    });

    if (!trend) throw new Error('Trend not found');

    // Find similar trends by keywords overlap
    const similarTrends = await db.trend.findMany({
      where: {
        id: { not: trendId },
        status: { in: ['EMERGING', 'ACTIVE', 'EXPLODING'] },
      },
      select: {
        id: true,
        title: true,
        keywords: true,
        velocityGrowth: true,
        discussionVolume: true,
        opportunityScore: true,
      },
      take: 10,
    });

    // Calculate keyword similarity
    const keywordSet = new Set(trend.keywords);
    const similarityScores = similarTrends.map(t => {
      const intersection = t.keywords.filter(k => keywordSet.has(k)).length;
      const union = new Set([...trend.keywords, ...t.keywords]).size;
      return {
        id: t.id,
        similarity: union > 0 ? intersection / union : 0,
        trend: t,
      };
    });

    const topSimilar = similarityScores
      .filter(s => s.similarity > 0.2) // At least 20% keyword overlap
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(s => s.id);

    // Detect lifecycle stage
    const stage = this.detectLifecycleStage(trend, similarTrends);

    // Calculate market positioning ranks
    const allTrends = [trend, ...similarTrends];
    const velocityRank = Math.round(
      (allTrends.filter(t => t.velocityGrowth > trend.velocityGrowth).length / allTrends.length) * 100
    );
    const discussionRank = Math.round(
      (allTrends.filter(t => t.discussionVolume > trend.discussionVolume).length / allTrends.length) * 100
    );

    return {
      trendId,
      similarTrendIds: topSimilar,
      velocityRank,
      discussionRank,
      lifecycleStage: stage.stage,
      stageConfidence: stage.confidence,
      competitorCount: topSimilar.length,
      averageVelocity: allTrends.reduce((sum, t) => sum + t.velocityGrowth, 0) / allTrends.length,
      analysisData: { similarityScores },
      updatedAt: new Date(),
    };
  }

  /**
   * Detect trend lifecycle stage
   */
  private detectLifecycleStage(trend: any, competitors: any[]) {
    // Based on velocity, discussion volume, and discussion volume trend
    const avgCompetitorVelocity = competitors.reduce((sum, t) => sum + t.velocityGrowth, 0) / competitors.length || 0;
    const avgCompetitorVolume = competitors.reduce((sum, t) => sum + t.discussionVolume, 0) / competitors.length || 0;

    let stage = 'emerging';
    let confidence = 0.5;

    if (trend.velocityGrowth > avgCompetitorVelocity * 2) {
      stage = 'growth';
      confidence = 0.8;
    } else if (trend.velocityGrowth < avgCompetitorVelocity * 0.5 && trend.discussionVolume > avgCompetitorVolume) {
      stage = 'mature';
      confidence = 0.7;
    } else if (trend.velocityGrowth < avgCompetitorVelocity * 0.3) {
      stage = 'decline';
      confidence = 0.6;
    }

    return { stage, confidence };
  }

  /**
   * Compare trends side-by-side
   */
  async compareTrends(trendIds: string[]) {
    if (trendIds.length < 2 || trendIds.length > 3) {
      throw new Error('Please provide 2-3 trend IDs for comparison');
    }

    const trends = await db.trend.findMany({
      where: { id: { in: trendIds } },
      include: {
        sentiments: { orderBy: { timestamp: 'desc' }, take: 1 },
        timeseries: { orderBy: { date: 'desc' }, take: 7 },
      },
    });

    if (trends.length !== trendIds.length) {
      throw new Error('One or more trends not found');
    }

    const comparisonData = trends.map(t => ({
      id: t.id,
      title: t.title,
      opportunityScore: t.opportunityScore,
      velocityGrowth: t.velocityGrowth,
      discussionVolume: t.discussionVolume,
      sentiment: t.sentiments[0] || null,
      recent7DaysTrend: t.timeseries.reverse(),
      stage: t.stage,
      momentum: t.momentum,
    }));

    // Calculate similarity score
    const similarityScore = this.calculateSimilarityScore(comparisonData);

    return {
      trends: comparisonData,
      similarityScore,
      recommendation: this.getComparisonRecommendation(comparisonData),
      overlayMetrics: this.calculateOverlayMetrics(comparisonData),
    };
  }

  private calculateSimilarityScore(trends: any[]): number {
    const scores = trends.map(t => t.opportunityScore);
    const maxDiff = Math.max(...scores) - Math.min(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Similarity is inverse of variance (0-1)
    return Math.max(0, 1 - (maxDiff / (avgScore || 1)));
  }

  private getComparisonRecommendation(trends: any[]): string {
    const avgScore = trends.reduce((sum, t) => sum + t.opportunityScore, 0) / trends.length;
    
    if (avgScore > 80) return 'All trends show strong opportunity potential';
    if (avgScore > 60) return 'Mixed signals - analyze by segment';
    return 'Generally weak signals across compared trends';
  }

  private calculateOverlayMetrics(trends: any[]): any {
    return {
      scoreRange: {
        min: Math.min(...trends.map(t => t.opportunityScore)),
        max: Math.max(...trends.map(t => t.opportunityScore)),
        avg: trends.reduce((s, t) => s + t.opportunityScore, 0) / trends.length,
      },
      volumeRange: {
        min: Math.min(...trends.map(t => t.discussionVolume)),
        max: Math.max(...trends.map(t => t.discussionVolume)),
        avg: trends.reduce((s, t) => s + t.discussionVolume, 0) / trends.length,
      },
      velocityRange: {
        min: Math.min(...trends.map(t => t.velocityGrowth)),
        max: Math.max(...trends.map(t => t.velocityGrowth)),
        avg: trends.reduce((s, t) => s + t.velocityGrowth, 0) / trends.length,
      },
    };
  }

  private getPeriodDays(period: string): number {
    const map: { [key: string]: number } = { '1m': 30, '3m': 90, '6m': 180, '12m': 365 };
    return map[period] || 180;
  }
}

export const trendAnalysis = new TrendAnalysisService();
