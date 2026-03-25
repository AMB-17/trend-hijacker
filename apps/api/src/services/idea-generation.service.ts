import { prisma } from '@packages/database';
import { nlpService } from './nlp.service';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';

interface GeneratedIdeaData {
  name: string;
  description: string;
  targetMarket: string;
  difficultScore: number;
}

interface IdeaGenerationRequest {
  trendId: string;
  userId: string;
  numberOfIdeas: number;
  trendTitle: string;
  trendSummary: string;
}

interface IdeaWithValidation extends GeneratedIdeaData {
  marketSize: string;
  competitionScore: number;
  viabilityScore: number;
  recommendation: string;
}

class IdeaGenerationService {
  private readonly CACHE_TTL = 86400; // 24 hours
  private readonly MAX_RETRIES = 3;

  async generateIdeas(request: IdeaGenerationRequest): Promise<IdeaWithValidation[]> {
    const { trendId, userId, numberOfIdeas, trendTitle, trendSummary } = request;

    // Check cache first
    const cacheKey = `ideas:${trendId}`;
    const cachedIdeas = await cacheService.get<IdeaWithValidation[]>(cacheKey);
    if (cachedIdeas && cachedIdeas.length > 0) {
      logger.info('Returning cached ideas', { trendId, count: cachedIdeas.length });
      return cachedIdeas;
    }

    if (!nlpService.isInitialized()) {
      logger.warn('NLP service not ready - using fallback ideas');
      return this.getFallbackIdeas(numberOfIdeas);
    }

    try {
      const ideas = await this.callNLPForIdeas(
        numberOfIdeas,
        trendTitle,
        trendSummary
      );

      // Validate and score each idea
      const validatedIdeas = await Promise.all(
        ideas.map(idea => this.validateAndScoreIdea(idea, trendTitle))
      );

      // Cache the ideas
      await cacheService.set(cacheKey, validatedIdeas, this.CACHE_TTL);

      // Save to database
      await this.saveIdeasToDatabase(trendId, userId, validatedIdeas);

      return validatedIdeas;
    } catch (error) {
      logger.error('Error generating ideas', { trendId, error });
      return this.getFallbackIdeas(numberOfIdeas);
    }
  }

  private async callNLPForIdeas(
    numberOfIdeas: number,
    trendTitle: string,
    trendSummary: string
  ): Promise<GeneratedIdeaData[]> {
    const prompt = `Based on the trend "${trendTitle}" about "${trendSummary}", generate ${numberOfIdeas} startup ideas.`;

    interface IdeasResponse {
      ideas: GeneratedIdeaData[];
    }

    const response = await nlpService.generateStructuredCompletion<IdeasResponse>(
      [{ role: 'user', content: prompt }] as any,
      {
        ideas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              targetMarket: { type: 'string' },
              difficultScore: { type: 'number' },
            },
            required: ['name', 'description', 'targetMarket', 'difficultScore'],
          },
        },
      }
    );

    return response.ideas.slice(0, numberOfIdeas);
  }

  private async validateAndScoreIdea(
    idea: GeneratedIdeaData,
    trendTitle: string
  ): Promise<IdeaWithValidation> {
    const { marketSize, competitionScore } = await this.analyzeMarket(
      idea.name,
      idea.targetMarket,
      trendTitle
    );

    // Calculate viability: (market_opportunity - competition) / difficulty
    // Normalize scores
    const marketOpportunity =
      marketSize === 'large' ? 1 : marketSize === 'medium' ? 0.6 : 0.3;
    const normalizedCompetition = competitionScore / 10;
    const normalizedDifficulty = idea.difficultScore / 10;

    const viabilityScore =
      (marketOpportunity - normalizedCompetition) / (normalizedDifficulty || 0.1);

    // Determine recommendation
    let recommendation = 'REVIEW';
    if (viabilityScore > 0.7) {
      recommendation = 'GO';
    } else if (viabilityScore < 0.3) {
      recommendation = 'NO-GO';
    }

    return {
      ...idea,
      marketSize,
      competitionScore,
      viabilityScore: Math.min(1, Math.max(0, viabilityScore)), // Clamp 0-1
      recommendation,
    };
  }

  private async analyzeMarket(
    ideaName: string,
    targetMarket: string,
    trendTitle: string
  ): Promise<{
    marketSize: string;
    competitionScore: number;
  }> {
    if (!openaiService.isInitialized()) {
      return { marketSize: 'medium', competitionScore: 5 };
    }

    try {
      const prompt = `Analyze the market opportunity for this startup idea in the context of the trend.

Idea: "${ideaName}"
Target Market: "${targetMarket}"
Trend: "${trendTitle}"

Provide:
1. Market size category: "small", "medium", or "large"
2. Competition score: 1-10 (1 = no competition, 10 = extremely saturated)

Return as JSON: { marketSize: string, competitionScore: number }`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      interface MarketAnalysis {
        marketSize: string;
        competitionScore: number;
      }

      return await openaiService.generateStructuredCompletion<MarketAnalysis>(
        messages,
        {
          marketSize: { type: 'string' },
          competitionScore: { type: 'number' },
        }
      );
    } catch (error) {
      logger.warn('Market analysis failed, using defaults', error);
      return { marketSize: 'medium', competitionScore: 5 };
    }
  }

  private async saveIdeasToDatabase(
    trendId: string,
    userId: string,
    ideas: IdeaWithValidation[]
  ): Promise<void> {
    try {
      await Promise.all(
        ideas.map(idea =>
          prisma.generatedIdea.create({
            data: {
              trendId,
              userId,
              name: idea.name,
              description: idea.description,
              targetMarket: idea.targetMarket,
              difficultScore: idea.difficultScore,
              marketSize: idea.marketSize,
              competitionScore: idea.competitionScore,
              viabilityScore: idea.viabilityScore,
              recommendation: idea.recommendation,
              metadata: {
                generatedAt: new Date().toISOString(),
              },
            },
          })
        )
      );
    } catch (error) {
      logger.error('Error saving ideas to database', { trendId, error });
      throw error;
    }
  }

  private getFallbackIdeas(count: number): IdeaWithValidation[] {
    const fallbackIdeas: IdeaWithValidation[] = [
      {
        name: 'Market Intelligence Platform',
        description:
          'An analytics dashboard that helps businesses understand emerging trends and make data-driven decisions.',
        targetMarket: 'Mid-market B2B companies',
        difficultScore: 7,
        marketSize: 'large',
        competitionScore: 6,
        viabilityScore: 0.55,
        recommendation: 'REVIEW',
      },
      {
        name: 'Community Engagement Tool',
        description:
          'A platform that connects enthusiasts and professionals in the trend space for collaboration and networking.',
        targetMarket: 'Community organizers',
        difficultScore: 5,
        marketSize: 'medium',
        competitionScore: 4,
        viabilityScore: 0.68,
        recommendation: 'GO',
      },
      {
        name: 'Educational Content Hub',
        description:
          'An online academy providing courses and certifications for professionals entering this new trend space.',
        targetMarket: 'Career changers, professionals',
        difficultScore: 6,
        marketSize: 'medium',
        competitionScore: 7,
        viabilityScore: 0.45,
        recommendation: 'REVIEW',
      },
      {
        name: 'Service Marketplace',
        description:
          'A platform connecting experts and service providers with businesses needing solutions related to this trend.',
        targetMarket: 'Service providers and businesses',
        difficultScore: 8,
        marketSize: 'large',
        competitionScore: 8,
        viabilityScore: 0.25,
        recommendation: 'NO-GO',
      },
      {
        name: 'Niche Software Solution',
        description:
          'A specialized tool addressing a specific pain point within this trend that existing solutions miss.',
        targetMarket: 'Specific niche users',
        difficultScore: 4,
        marketSize: 'small',
        competitionScore: 3,
        viabilityScore: 0.85,
        recommendation: 'GO',
      },
    ];

    return fallbackIdeas.slice(0, count);
  }

  async getIdeasForTrend(trendId: string, limit = 10): Promise<any[]> {
    return prisma.generatedIdea.findMany({
      where: { trendId },
      take: limit,
      orderBy: { viabilityScore: 'desc' },
      include: {
        feedback: true,
      },
    });
  }

  async addFeedback(
    ideaId: string,
    userId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await prisma.ideaFeedback.upsert({
      where: { ideaId_userId: { ideaId, userId } },
      update: { rating, feedback },
      create: { ideaId, userId, rating, feedback },
    });

    // Invalidate cache
    const idea = await prisma.generatedIdea.findUnique({ where: { id: ideaId } });
    if (idea) {
      await cacheService.del(`ideas:${idea.trendId}`);
    }
  }
}

export const ideaGenerationService = new IdeaGenerationService();
