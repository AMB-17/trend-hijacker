'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type Trend } from '../api/client';

export function useSavedTrends(userId?: string) {
  const [data, setData] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedTrends = useCallback(async () => {
    if (!userId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getSavedTrends(userId, 100, 0);
      setData(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch saved trends');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSavedTrends();
  }, [fetchSavedTrends]);

  const refetch = useCallback(() => {
    fetchSavedTrends();
  }, [fetchSavedTrends]);

  return { data, loading, error, refetch };
}
