'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TrendFilters } from '@packages/types';
import { apiClient, type Trend } from '../api/client';

interface UseTrendsOptions {
  autoFetch?: boolean;
  refetchInterval?: number;
}

export function useTrends(filters?: TrendFilters, options?: UseTrendsOptions) {
  const [data, setData] = useState<Trend[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { autoFetch = true, refetchInterval } = options || {};

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getTrends(filters);
      setData(response.data);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchTrends();
    }
  }, [autoFetch, fetchTrends]);

  // Setup refetch interval if specified
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(() => {
      fetchTrends();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, fetchTrends]);

  const retry = useCallback(() => {
    fetchTrends();
  }, [fetchTrends]);

  return {
    data,
    total,
    hasMore,
    loading,
    error,
    retry,
    refetch: fetchTrends,
  };
}

export function useEarlySignals(limit: number = 20, autoFetch = true) {
  const [data, setData] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEarlySignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const trends = await apiClient.getEarlySignals(limit);
      setData(trends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch early signals');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchEarlySignals();
    }
  }, [autoFetch, fetchEarlySignals]);

  const retry = useCallback(() => {
    fetchEarlySignals();
  }, [fetchEarlySignals]);

  return {
    data,
    loading,
    error,
    retry,
    refetch: fetchEarlySignals,
  };
}

export function useExplodingTrends(limit: number = 20, autoFetch = true) {
  const [data, setData] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplodingTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const trends = await apiClient.getExplodingTrends(limit);
      setData(trends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exploding trends');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchExplodingTrends();
    }
  }, [autoFetch, fetchExplodingTrends]);

  const retry = useCallback(() => {
    fetchExplodingTrends();
  }, [fetchExplodingTrends]);

  return {
    data,
    loading,
    error,
    retry,
    refetch: fetchExplodingTrends,
  };
}

export function useTrendById(id: string, autoFetch = true) {
  const [data, setData] = useState<Trend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const trend = await apiClient.getTrendById(id);
      setData(trend);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trend');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (autoFetch && id) {
      fetchTrend();
    }
  }, [autoFetch, fetchTrend, id]);

  const retry = useCallback(() => {
    fetchTrend();
  }, [fetchTrend]);

  return {
    data,
    loading,
    error,
    retry,
    refetch: fetchTrend,
  };
}
