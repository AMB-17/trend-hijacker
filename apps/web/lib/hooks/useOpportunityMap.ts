'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type OpportunityMapData, type OpportunityMapItem } from '../api/client';

export function useOpportunityMap(autoFetch = true) {
  const [data, setData] = useState<OpportunityMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunityMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mapData = await apiClient.getOpportunityMap();
      setData(mapData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunity map');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchOpportunityMap();
    }
  }, [autoFetch, fetchOpportunityMap]);

  const retry = useCallback(() => {
    fetchOpportunityMap();
  }, [fetchOpportunityMap]);

  return {
    data,
    loading,
    error,
    retry,
    refetch: fetchOpportunityMap,
  };
}

export function useQuickWins(limit: number = 20, autoFetch = true) {
  const [data, setData] = useState<OpportunityMapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuickWins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const quickWins = await apiClient.getQuickWins(limit);
      setData(quickWins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quick wins');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchQuickWins();
    }
  }, [autoFetch, fetchQuickWins]);

  const retry = useCallback(() => {
    fetchQuickWins();
  }, [fetchQuickWins]);

  return {
    data,
    loading,
    error,
    retry,
    refetch: fetchQuickWins,
  };
}

export function useOpportunityInsights(autoFetch = true) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const insights = await apiClient.getOpportunityInsights();
      setData(insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchInsights();
    }
  }, [autoFetch, fetchInsights]);

  const retry = useCallback(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    data,
    loading,
    error,
    retry,
    refetch: fetchInsights,
  };
}
