import { prisma } from '@packages/database';
import { openaiService } from './openai.service';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';
import OpenAI from '@openai/sdk';

interface TrendInsightData {
  summary: string;
  drivers: string[];
  riskLevel: number;
  industries: string[];
  impact: string;
}

interface SentimentData {
  positiveScore: number;
  negativeScore: number;
  neutralScore: number;
  overallScore: number;
}

interface TagData {
  tag: string;
  category: 'industry' | 'difficulty' | 'market_size' | 'timeframe' | 'risk_level';
  confidence: number;
}

class TrendInsightsService {
  private readonly CACHE_TTL = 604800; // 7 days
  private readonly INSIGHT_EXPIRY_DAYS = 7;

  async generateInsights(trendId: string, trendData: {
    title: string;
    summary: string;
    keywords: string[];
  }): Promise<TrendInsightData> {
    // Check cache first
    const cacheKey = `insights:${trendId}`;
    const cachedInsights = await cacheService.get<TrendInsightData>(cacheKey);
    if (cachedInsights) {
      logger.info('Returning cached insights', { trendId });
      return cachedInsights;
    }

    if (!openaiService.isInitialized()) {
      logger.warn('OpenAI not initialized, returning fallback insights');
      return this.getFallbackInsights(trendData.title);
    }

    try {
      const insights = await this.callOpenAIForInsights(trendData);

      // Cache the insights
      await cacheService.set(cacheKey, insights, this.CACHE_TTL);

      // Save to database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.INSIGHT_EXPIRY_DAYS);

      await prisma.trendInsight.upsert({
        where: { trendId },
        create: {
          trendId,
          summary: insights.summary,
          drivers: insights.drivers,
          riskLevel: insights.riskLevel,
          industries: insights.industries,
          impact: insights.impact,
          metadata: {
            generatedAt: new Date().toISOString(),
          },
          expiresAt,
        },
        update: {
          summary: insights.summary,
          drivers: insights.drivers,
          riskLevel: insights.riskLevel,
          industries: insights.industries,
          impact: insights.impact,
          metadata: {
            generatedAt: new Date().toISOString(),
          },
          expiresAt,
        },
      });

      return insights;
    } catch (error) {
      logger.error('Error generating insights', { trendId, error });
      return this.getFallbackInsights(trendData.title);
    }
  }

  private async callOpenAIForInsights(trendData: {
    title: string;
    summary: string;
    keywords: string[];
  }): Promise<TrendInsightData> {
    const prompt = `You are a market analyst and trend strategist. Analyze this trend and provide comprehensive insights.

Trend: "${trendData.title}"
Description: "${trendData.summary}"
Related Keywords: ${trendData.keywords.join(', ')}

Provide analysis in JSON format with:
1. summary: A compelling 1-paragraph explanation of the trend (why it matters and where it's headed)
2. drivers: Array of 3-5 key reasons why this trend is growing (as strings)
3. riskLevel: Risk assessment 1-10 (1 = low risk, 10 = high risk)
4. industries: Array of 3-5 industries most affected by this trend
5. impact: Overall market impact classification: "LOW", "MEDIUM", or "HIGH"

Be specific and actionable.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    return await openaiService.generateStructuredCompletion<TrendInsightData>(
      messages,
      {
        summary: { type: 'string' },
        drivers: {
          type: 'array',
          items: { type: 'string' },
        },
        riskLevel: { type: 'number' },
        industries: {
          type: 'array',
          items: { type: 'string' },
        },
        impact: { type: 'string' },
      },
      {
        temperature: 0.7,
        maxTokens: 1000,
      }
    );
  }

  async analyzeSentiment(trendId: string, posts: Array<{
    title: string;
    content: string;
  }>): Promise<SentimentData> {
    const cacheKey = `sentiment:${trendId}`;
    const cached = await cacheService.get<SentimentData>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!openaiService.isInitialized()) {
      return this.getFallbackSentiment();
    }

    try {
      const postsText = posts
        .slice(0, 10)
        .map(p => `${p.title}\n${p.content}`)
        .join('\n\n---\n\n');

      const prompt = `Analyze the overall sentiment of these discussions about a trend. Score each sentiment category as a percentage (0-1 range).

Discussions:
${postsText}

Return JSON with:
- positiveScore: Number between 0-1 (proportion of positive sentiment)
- negativeScore: Number between 0-1 (proportion of negative sentiment)
- neutralScore: Number between 0-1 (proportion of neutral sentiment)
- overallScore: Number between -1 and 1 (overall sentiment, -1 = very negative, 1 = very positive)

Ensure positiveScore + negativeScore + neutralScore = 1`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      interface SentimentResponse {
        positiveScore: number;
        negativeScore: number;
        neutralScore: number;
        overallScore: number;
      }

      const sentiment = await openaiService.generateStructuredCompletion<SentimentResponse>(
        messages,
        {
          positiveScore: { type: 'number' },
          negativeScore: { type: 'number' },
          neutralScore: { type: 'number' },
          overallScore: { type: 'number' },
        }
      );

      // Cache for shorter period
      await cacheService.set(cacheKey, sentiment, 86400); // 24 hours

      // Save to database
      await prisma.trendSentiment.create({
        data: {
          trendId,
          positiveScore: sentiment.positiveScore,
          negativeScore: sentiment.negativeScore,
          neutralScore: sentiment.neutralScore,
          overallScore: sentiment.overallScore,
          sampleSize: posts.length,
        },
      });

      return sentiment;
    } catch (error) {
      logger.error('Error analyzing sentiment', { trendId, error });
      return this.getFallbackSentiment();
    }
  }

  async generateTags(trendId: string, trendData: {
    title: string;
    summary: string;
    keywords: string[];
  }): Promise<TagData[]> {
    const cacheKey = `tags:${trendId}`;
    const cached = await cacheService.get<TagData[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    if (!openaiService.isInitialized()) {
      return this.getFallbackTags();
    }

    try {
      const prompt = `Generate 8-12 AI-powered tags for this trend. Each tag should fit into one of these categories:
- industry: What industry/vertical is affected
- difficulty: How hard is it to build in this space (easy/medium/hard)
- market_size: Market size potential (small/medium/large)
- timeframe: How long until mainstream (short_term/medium_term/long_term)
- risk_level: Risk level (low/medium/high)

Trend: "${trendData.title}"
Description: "${trendData.summary}"

Return as JSON array with objects: { tag: string, category: string, confidence: number (0-1) }
Make tags specific, actionable, and not generic.`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      interface TagsResponse {
        tags: TagData[];
      }

      const response = await openaiService.generateStructuredCompletion<TagsResponse>(
        messages,
        {
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tag: { type: 'string' },
                category: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        }
      );

      const tags = response.tags.slice(0, 12);

      // Cache for 7 days
      await cacheService.set(cacheKey, tags, 604800);

      // Save to database
      await Promise.all(
        tags.map(t =>
          prisma.trendTag.upsert({
            where: { trendId_tag: { trendId, tag: t.tag } },
            create: {
              trendId,
              tag: t.tag,
              category: t.category,
              confidence: t.confidence,
            },
            update: {
              category: t.category,
              confidence: t.confidence,
            },
          })
        )
      );

      return tags;
    } catch (error) {
      logger.error('Error generating tags', { trendId, error });
      return this.getFallbackTags();
    }
  }

  async detectSubTrends(trendId: string, posts: Array<{
    title: string;
    content: string;
    upvotes: number;
  }>): Promise<void> {
    if (!openaiService.isInitialized()) {
      return;
    }

    try {
      const topPosts = posts
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 15)
        .map(p => `${p.title}\n${p.content}`)
        .join('\n\n---\n\n');

      const prompt = `Identify 2-4 emerging sub-trends or micro-trends within these discussions. These should be distinct aspects or variations of the main trend.

Posts:
${topPosts}

Return JSON array with objects:
- name: Name of the sub-trend
- description: Brief description (1-2 sentences)
- keywords: Array of 2-4 keywords
- growth: Estimated growth rate (0-1 scale)

Focus on actionable, distinct sub-trends that represent different opportunities within the main trend.`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      interface SubTrendsResponse {
        subTrends: Array<{
          name: string;
          description: string;
          keywords: string[];
          growth: number;
        }>;
      }

      const response = await openaiService.generateStructuredCompletion<SubTrendsResponse>(
        messages,
        {
          subTrends: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                },
                growth: { type: 'number' },
              },
            },
          },
        }
      );

      // Save to database
      await Promise.all(
        response.subTrends.map(st =>
          prisma.trendSubTrend.create({
            data: {
              parentTrendId: trendId,
              name: st.name,
              description: st.description,
              keywords: st.keywords,
              growth: st.growth,
            },
          })
        )
      );

      logger.info('Sub-trends detected', { trendId, count: response.subTrends.length });
    } catch (error) {
      logger.error('Error detecting sub-trends', { trendId, error });
    }
  }

  private getFallbackInsights(trendTitle: string): TrendInsightData {
    return {
      summary: `${trendTitle} represents an emerging opportunity in the market. This trend is gaining traction due to changing consumer preferences, technological advancements, and market consolidation. Early movers in this space have the potential to capture significant market share as the trend continues to mature and gain mainstream adoption.`,
      drivers: [
        'Increasing consumer demand for innovative solutions',
        'Technological advancements enabling new possibilities',
        'Market consolidation driving efficiency',
        'Regulatory changes supporting growth',
        'Network effects accelerating adoption',
      ],
      riskLevel: 5,
      industries: [
        'Technology',
        'Consumer Goods',
        'Financial Services',
        'Healthcare',
        'Enterprise Software',
      ],
      impact: 'MEDIUM',
    };
  }

  private getFallbackSentiment(): SentimentData {
    return {
      positiveScore: 0.6,
      negativeScore: 0.15,
      neutralScore: 0.25,
      overallScore: 0.4,
    };
  }

  private getFallbackTags(): TagData[] {
    return [
      { tag: 'B2B SaaS', category: 'industry', confidence: 0.9 },
      { tag: 'High Growth Potential', category: 'market_size', confidence: 0.85 },
      { tag: 'Medium Difficulty', category: 'difficulty', confidence: 0.8 },
      { tag: 'Long-term Opportunity', category: 'timeframe', confidence: 0.75 },
      { tag: 'Medium Risk', category: 'risk_level', confidence: 0.8 },
      { tag: 'AI-powered', category: 'industry', confidence: 0.9 },
      { tag: 'Large TAM', category: 'market_size', confidence: 0.85 },
      { tag: 'Emerging', category: 'timeframe', confidence: 0.88 },
    ];
  }

  async getInsightsForTrend(trendId: string): Promise<any> {
    const cached = await cacheService.get(`insights:${trendId}`);
    if (cached) return cached;

    return prisma.trendInsight.findUnique({ where: { trendId } });
  }

  async getSentimentHistory(trendId: string, days = 30): Promise<SentimentData[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.trendSentiment.findMany({
      where: {
        trendId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getTagsForTrend(trendId: string): Promise<TagData[]> {
    return prisma.trendTag.findMany({
      where: { trendId },
      orderBy: { confidence: 'desc' },
    });
  }

  async getSubTrendsForTrend(trendId: string): Promise<any[]> {
    return prisma.trendSubTrend.findMany({
      where: { parentTrendId: trendId },
      orderBy: { growth: 'desc' },
    });
  }
}

export const trendInsightsService = new TrendInsightsService();
