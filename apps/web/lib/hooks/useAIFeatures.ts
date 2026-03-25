import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

interface GeneratedIdea {
  id: string;
  name: string;
  description: string;
  targetMarket: string;
  difficultScore: number;
  marketSize: string;
  competitionScore: number;
  viabilityScore: number;
  recommendation: string;
}

interface TrendInsight {
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
  category: string;
  confidence: number;
}

interface SubTrendData {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  growth: number;
}

interface UseAIFeaturesResult {
  // Ideas
  ideas: GeneratedIdea[];
  ideasLoading: boolean;
  ideasError: Error | null;
  generateIdeas: (trendId: string, userId: string, numberOfIdeas: number) => Promise<void>;
  addIdeaFeedback: (trendId: string, ideaId: string, userId: string, rating: number, feedback?: string) => Promise<void>;

  // Insights
  insights: TrendInsight | null;
  insightsLoading: boolean;
  insightsError: Error | null;
  getInsights: (trendId: string) => Promise<void>;

  // Sentiment
  sentiment: SentimentData | null;
  sentimentLoading: boolean;
  sentimentError: Error | null;
  getSentiment: (trendId: string) => Promise<void>;

  // Tags
  tags: TagData[];
  tagsLoading: boolean;
  tagsError: Error | null;
  getTags: (trendId: string) => Promise<void>;

  // Sub-trends
  subTrends: SubTrendData[];
  subTrendsLoading: boolean;
  subTrendsError: Error | null;
  getSubTrends: (trendId: string) => Promise<void>;
}

export const useAIFeatures = (): UseAIFeaturesResult => {
  // Ideas state
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<Error | null>(null);

  // Insights state
  const [insights, setInsights] = useState<TrendInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<Error | null>(null);

  // Sentiment state
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentError, setSentimentError] = useState<Error | null>(null);

  // Tags state
  const [tags, setTags] = useState<TagData[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<Error | null>(null);

  // Sub-trends state
  const [subTrends, setSubTrends] = useState<SubTrendData[]>([]);
  const [subTrendsLoading, setSubTrendsLoading] = useState(false);
  const [subTrendsError, setSubTrendsError] = useState<Error | null>(null);

  // Generate ideas
  const generateIdeas = useCallback(
    async (trendId: string, userId: string, numberOfIdeas: number) => {
      setIdeasLoading(true);
      setIdeasError(null);
      try {
        const response = await apiClient.generateIdeas(trendId, {
          userId,
          numberOfIdeas,
        });
        setIdeas(response);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to generate ideas');
        setIdeasError(err);
      } finally {
        setIdeasLoading(false);
      }
    },
    []
  );

  // Add idea feedback
  const addIdeaFeedback = useCallback(
    async (trendId: string, ideaId: string, userId: string, rating: number, feedback?: string) => {
      try {
        await apiClient.addIdeaFeedback(trendId, ideaId, {
          userId,
          rating,
          feedback,
        });
      } catch (error) {
        console.error('Failed to add feedback:', error);
      }
    },
    []
  );

  // Get insights
  const getInsights = useCallback(async (trendId: string) => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const response = await apiClient.getInsights(trendId);
      setInsights(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch insights');
      setInsightsError(err);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  // Get sentiment
  const getSentiment = useCallback(async (trendId: string) => {
    setSentimentLoading(true);
    setSentimentError(null);
    try {
      const response = await apiClient.getSentiment(trendId);
      setSentiment(response.current);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch sentiment');
      setSentimentError(err);
    } finally {
      setSentimentLoading(false);
    }
  }, []);

  // Get tags
  const getTags = useCallback(async (trendId: string) => {
    setTagsLoading(true);
    setTagsError(null);
    try {
      const response = await apiClient.getTags(trendId);
      setTags(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch tags');
      setTagsError(err);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  // Get sub-trends
  const getSubTrends = useCallback(async (trendId: string) => {
    setSubTrendsLoading(true);
    setSubTrendsError(null);
    try {
      const response = await apiClient.getSubTrends(trendId);
      setSubTrends(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch sub-trends');
      setSubTrendsError(err);
    } finally {
      setSubTrendsLoading(false);
    }
  }, []);

  return {
    ideas,
    ideasLoading,
    ideasError,
    generateIdeas,
    addIdeaFeedback,

    insights,
    insightsLoading,
    insightsError,
    getInsights,

    sentiment,
    sentimentLoading,
    sentimentError,
    getSentiment,

    tags,
    tagsLoading,
    tagsError,
    getTags,

    subTrends,
    subTrendsLoading,
    subTrendsError,
    getSubTrends,
  };
};

export default useAIFeatures;
