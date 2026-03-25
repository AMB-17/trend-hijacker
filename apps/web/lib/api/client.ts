'use client';

import type { TrendFilters } from '@packages/types';

export interface Trend {
  id: string;
  title: string;
  summary: string;
  opportunityScore: number;
  velocityGrowth: number;
  problemIntensity: number;
  discussionVolume: number;
  noveltyScore: number;
  status: string;
  stage: string;
  firstDetected: string;
  lastUpdated: string;
  peakDate?: string;
  growthRate: number;
  momentum: string;
  suggestedIdeas?: string[];
  targetAudience?: string;
  marketPotential?: string;
  keywords: string[];
  posts?: Array<{
    id: string;
    title: string;
    url: string;
    upvotes: number;
    comments: number;
  }>;
}

export interface OpportunityMapItem {
  id: string;
  title: string;
  keywords: string[];
  opportunityScore: number;
  velocityGrowth: number;
  problemIntensity: number;
  discussionVolume: number;
  stage: string;
  postCount: number;
}

export interface OpportunityInsights {
  topQuickWin: OpportunityMapItem | null;
  topBigBet: OpportunityMapItem | null;
  mostDiscussed: OpportunityMapItem | null;
  fastestGrowing: OpportunityMapItem | null;
  recommendations: string[];
}

export interface OpportunityMapData {
  items: OpportunityMapItem[];
  quadrants: {
    quickWins: OpportunityMapItem[];
    bigBets: OpportunityMapItem[];
    fillIns: OpportunityMapItem[];
    hardSlogs: OpportunityMapItem[];
  };
  summary: {
    total: number;
    byStage: { [key: string]: number };
    avgOpportunityScore: number;
  };
}

export interface PaginatedResponse<T> {
  data: T;
  total: number;
  hasMore: boolean;
  meta?: {
    limit: number;
    offset: number;
  };
}

export interface Post {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string | null;
  upvotes: number;
  comments: number;
  publishedAt: string;
  source: string;
}

export interface UserPreferences {
  preferredStages: string[];
  minOpportunityScore: number;
  digestCadence: 'off' | 'daily' | 'weekly';
}

export interface AlertRule {
  minOpportunityScore: number;
  stages: string[];
  keywords: string[];
}

export interface Alert {
  id: string;
  userId: string;
  name: string;
  rule: AlertRule;
  channel: 'in_app' | 'webhook';
  webhookUrl?: string;
  enabled: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvaluation {
  alertId: string;
  matchedTrendIds: string[];
  matchedCount: number;
}

class ApiClient {
  private baseUrl: string;

  private normalizeClientBaseUrl(value?: string): string {
    const candidate = value?.trim();
    if (!candidate) {
      return '/api/proxy';
    }

    // Keep client traffic on same-origin proxy routes to preserve local fallback behavior.
    if (candidate.startsWith('/')) {
      return candidate.replace(/\/$/, '');
    }

    return '/api/proxy';
  }

  constructor() {
    this.baseUrl = this.normalizeClientBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  }

  private isCriticalDashboardEndpoint(endpoint: string): boolean {
    return (
      endpoint.startsWith('/api/signals/early') ||
      endpoint.startsWith('/api/signals/exploding') ||
      endpoint.startsWith('/api/opportunities') ||
      endpoint === '/api/trends' ||
      endpoint.startsWith('/api/trends?') ||
      endpoint.startsWith('/api/trends/')
    );
  }

  private getSafeCriticalFallback(endpoint: string): unknown {
    if (endpoint.startsWith('/api/signals/')) {
      return { success: true, data: [] };
    }

    if (endpoint.startsWith('/api/opportunities/insights')) {
      return {
        success: true,
        data: {
          topQuickWin: null,
          topBigBet: null,
          mostDiscussed: null,
          fastestGrowing: null,
          recommendations: [],
        },
      };
    }

    if (endpoint.startsWith('/api/opportunities/quick-wins')) {
      return { success: true, data: [] };
    }

    if (endpoint.startsWith('/api/opportunities')) {
      return {
        success: true,
        data: {
          items: [],
          quadrants: {
            quickWins: [],
            bigBets: [],
            fillIns: [],
            hardSlogs: [],
          },
          summary: {
            total: 0,
            byStage: {
              early_signal: 0,
              emerging: 0,
              exploding: 0,
            },
            avgOpportunityScore: 0,
          },
        },
      };
    }

    if (endpoint === '/api/trends' || endpoint.startsWith('/api/trends?')) {
      return {
        success: true,
        data: [],
        meta: {
          total: 0,
          hasMore: false,
          limit: 20,
          offset: 0,
        },
      };
    }

    if (endpoint.startsWith('/api/trends/')) {
      const trendId = endpoint.split('/').pop() || 'trend-fallback';
      const now = new Date().toISOString();

      return {
        success: true,
        data: {
          id: trendId,
          title: 'Trend data temporarily unavailable',
          summary: 'Live trend details are temporarily unavailable. Please retry shortly.',
          opportunityScore: 0,
          velocityGrowth: 0,
          problemIntensity: 0,
          discussionVolume: 0,
          noveltyScore: 0,
          status: 'EMERGING',
          stage: 'early_signal',
          firstDetected: now,
          lastUpdated: now,
          growthRate: 0,
          momentum: 'stable',
          keywords: [],
        },
      };
    }

    return null;
  }

  private async fetchLocalFirst<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
    if (!this.isCriticalDashboardEndpoint(endpoint)) {
      return null;
    }

    const localResponse = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!localResponse.ok) {
      return null;
    }

    return await localResponse.json();
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const localFirst = await this.fetchLocalFirst<T>(endpoint, options).catch(() => null);
    if (localFirst !== null) {
      return localFirst;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const fallback = await this.fetchLocalFirst<T>(endpoint, options).catch(() => null);
        if (fallback !== null) {
          return fallback;
        }

        if (this.isCriticalDashboardEndpoint(endpoint)) {
          return this.getSafeCriticalFallback(endpoint) as T;
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      const fallback = await this.fetchLocalFirst<T>(endpoint, options).catch(() => null);
      if (fallback !== null) {
        return fallback;
      }

      if (this.isCriticalDashboardEndpoint(endpoint)) {
        return this.getSafeCriticalFallback(endpoint) as T;
      }

      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getTrends(filters?: TrendFilters): Promise<PaginatedResponse<Trend[]>> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.status) params.append('status', filters.status);
      if (filters.minScore) params.append('minScore', String(filters.minScore));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.limit) params.append('limit', String(filters.limit || 20));
      if (filters.offset) params.append('offset', String(filters.offset || 0));
    }

    const queryString = params.toString();
    const endpoint = `/api/trends${queryString ? `?${queryString}` : ''}`;

    const response = await this.fetch<{ data: Trend[]; meta?: { total: number; hasMore: boolean; limit: number; offset: number } }>(endpoint);
    return {
      data: response.data,
      total: response.meta?.total || 0,
      hasMore: response.meta?.hasMore || false,
      meta: response.meta,
    };
  }

  async getTrendById(id: string): Promise<Trend> {
    const response = await this.fetch<{ data: Trend }>(`/api/trends/${id}`);
    return response.data;
  }

  async getEarlySignals(limit: number = 20): Promise<Trend[]> {
    const response = await this.fetch<{ data: Trend[] }>(`/api/signals/early?limit=${limit}`);
    return response.data;
  }

  async getExplodingTrends(limit: number = 20): Promise<Trend[]> {
    const response = await this.fetch<{ data: Trend[] }>(`/api/signals/exploding?limit=${limit}`);
    return response.data;
  }

  async getOpportunityMap(): Promise<OpportunityMapData> {
    const response = await this.fetch<{ data: OpportunityMapData }>('/api/opportunities');
    return response.data;
  }

  async getQuickWins(limit: number = 20): Promise<OpportunityMapItem[]> {
    const response = await this.fetch<{ data: OpportunityMapItem[] }>(`/api/opportunities/quick-wins?limit=${limit}`);
    return response.data;
  }

  async getOpportunityInsights(): Promise<OpportunityInsights> {
    const response = await this.fetch<{ data: OpportunityInsights }>('/api/opportunities/insights');
    return response.data;
  }

  async searchTrends(query: string, limit: number = 20): Promise<Trend[]> {
    const response = await this.fetch<{ data: Trend[] }>(
      `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  }

  async searchPosts(query: string, limit: number = 20): Promise<Post[]> {
    const response = await this.fetch<{ data: Post[] }>(
      `/api/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  }

  async getSearchSuggestions(query?: string, limit: number = 10): Promise<string[]> {
    const endpoint = query
      ? `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`
      : `/api/search/suggestions?limit=${limit}`;

    const response = await this.fetch<{ data: string[] }>(endpoint);
    return response.data;
  }

  async getSavedTrends(userId: string, limit = 50, offset = 0): Promise<PaginatedResponse<Trend[]>> {
    const response = await this.fetch<{
      data: Trend[];
      meta?: { total: number; hasMore: boolean; limit: number; offset: number };
    }>(`/api/trends/saved?userId=${encodeURIComponent(userId)}&limit=${limit}&offset=${offset}`);

    return {
      data: response.data,
      total: response.meta?.total || 0,
      hasMore: response.meta?.hasMore || false,
      meta: response.meta,
    };
  }

  async saveTrend(userId: string, trendId: string): Promise<{ savedAt: string }> {
    const response = await this.fetch<{ data: { savedAt: string } }>(`/api/trends/saved`, {
      method: 'POST',
      body: JSON.stringify({ userId, trendId }),
    });

    return response.data;
  }

  async removeSavedTrend(userId: string, trendId: string): Promise<boolean> {
    const response = await this.fetch<{ data: { removed: boolean } }>(
      `/api/trends/saved/${encodeURIComponent(trendId)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );

    return response.data.removed;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const response = await this.fetch<{ data: UserPreferences }>(
      `/api/users/preferences?userId=${encodeURIComponent(userId)}`
    );
    return response.data;
  }

  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences> {
    const response = await this.fetch<{ data: UserPreferences }>(`/api/users/preferences`, {
      method: 'PUT',
      body: JSON.stringify({ userId, preferences }),
    });

    return response.data;
  }

  async listAlerts(userId: string, enabledOnly = false): Promise<Alert[]> {
    const response = await this.fetch<{ data: Alert[] }>(
      `/api/alerts?userId=${encodeURIComponent(userId)}&enabledOnly=${enabledOnly}`
    );
    return response.data;
  }

  async createAlert(input: {
    userId: string;
    name: string;
    rule: AlertRule;
    channel?: 'in_app' | 'webhook';
    webhookUrl?: string;
    enabled?: boolean;
  }): Promise<Alert> {
    const response = await this.fetch<{ data: Alert }>(`/api/alerts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return response.data;
  }

  async updateAlert(
    id: string,
    input: {
      userId: string;
      name?: string;
      rule?: AlertRule;
      channel?: 'in_app' | 'webhook';
      webhookUrl?: string;
      enabled?: boolean;
    }
  ): Promise<Alert> {
    const response = await this.fetch<{ data: Alert }>(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });

    return response.data;
  }

  async deleteAlert(id: string, userId: string): Promise<boolean> {
    const response = await this.fetch<{ data: { deleted: boolean } }>(
      `/api/alerts/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    );

    return response.data.deleted;
  }

  async evaluateAlerts(userId: string, limit = 20): Promise<AlertEvaluation[]> {
    const response = await this.fetch<{ data: AlertEvaluation[] }>(
      `/api/alerts/evaluate?userId=${encodeURIComponent(userId)}&limit=${limit}`
    );

    return response.data;
  }

  // ============================================
  // FEATURE 1: AI-Powered Idea Generator Methods
  // ============================================

  async generateIdeas(
    trendId: string,
    input: {
      userId: string;
      numberOfIdeas: number;
    }
  ): Promise<any[]> {
    const response = await this.fetch<{ data: any[] }>(`/api/trends/${encodeURIComponent(trendId)}/generate-ideas`, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return response.data;
  }

  async getIdeasForTrend(trendId: string, limit = 10): Promise<any[]> {
    const response = await this.fetch<{ data: any[] }>(
      `/api/trends/${encodeURIComponent(trendId)}/ideas?limit=${limit}`
    );

    return response.data;
  }

  async addIdeaFeedback(
    trendId: string,
    ideaId: string,
    input: {
      userId: string;
      rating: number;
      feedback?: string;
    }
  ): Promise<void> {
    await this.fetch<any>(
      `/api/trends/${encodeURIComponent(trendId)}/ideas/${encodeURIComponent(ideaId)}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  }

  // ============================================
  // FEATURE 5: AI-Powered Insights Methods
  // ============================================

  async getInsights(trendId: string): Promise<any> {
    const response = await this.fetch<{ data: any }>(
      `/api/trends/${encodeURIComponent(trendId)}/insights`
    );

    return response.data;
  }

  async getSentiment(trendId: string): Promise<any> {
    const response = await this.fetch<{ data: any }>(
      `/api/trends/${encodeURIComponent(trendId)}/sentiment`
    );

    return response.data;
  }

  async getTags(trendId: string): Promise<any[]> {
    const response = await this.fetch<{ data: any[] }>(
      `/api/trends/${encodeURIComponent(trendId)}/tags`
    );

    return response.data;
  }

  async getSubTrends(trendId: string): Promise<any[]> {
    const response = await this.fetch<{ data: any[] }>(
      `/api/trends/${encodeURIComponent(trendId)}/sub-trends`
    );

    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
