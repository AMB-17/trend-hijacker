'use client';

import type { TrendFilters, ApiResponse } from '@packages/types';

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
  posts?: any[];
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

class ApiClient {
  private baseUrl: string;

  constructor() {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    this.baseUrl = configuredBaseUrl && configuredBaseUrl.length > 0
      ? configuredBaseUrl.replace(/\/$/, '')
      : '/api/proxy';
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `API error: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
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

    const response = await this.fetch<any>(endpoint);
    return {
      data: response.data,
      total: response.meta?.total || 0,
      hasMore: response.meta?.hasMore || false,
      meta: response.meta,
    };
  }

  async getTrendById(id: string): Promise<Trend> {
    const response = await this.fetch<any>(`/api/trends/${id}`);
    return response.data;
  }

  async getEarlySignals(limit: number = 20): Promise<Trend[]> {
    const response = await this.fetch<any>(`/api/signals/early?limit=${limit}`);
    return response.data;
  }

  async getExplodingTrends(limit: number = 20): Promise<Trend[]> {
    const response = await this.fetch<any>(`/api/signals/exploding?limit=${limit}`);
    return response.data;
  }

  async getOpportunityMap(): Promise<OpportunityMapData> {
    const response = await this.fetch<any>('/api/opportunities');
    return response.data;
  }

  async getQuickWins(limit: number = 20): Promise<OpportunityMapItem[]> {
    const response = await this.fetch<any>(`/api/opportunities/quick-wins?limit=${limit}`);
    return response.data;
  }

  async getOpportunityInsights(): Promise<any> {
    const response = await this.fetch<any>('/api/opportunities/insights');
    return response.data;
  }

  async searchTrends(query: string, limit: number = 20): Promise<Trend[]> {
    const response = await this.fetch<any>(
      `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  }

  async searchPosts(query: string, limit: number = 20): Promise<any[]> {
    const response = await this.fetch<any>(
      `/api/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  }

  async getSearchSuggestions(query?: string, limit: number = 10): Promise<string[]> {
    const endpoint = query
      ? `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`
      : `/api/search/suggestions?limit=${limit}`;

    const response = await this.fetch<any>(endpoint);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
