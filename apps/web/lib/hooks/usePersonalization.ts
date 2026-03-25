'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiClient,
  type Alert,
  type AlertEvaluation,
  type AlertRule,
  type Trend,
  type UserPreferences,
} from '../api/client';

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredStages: [],
  minOpportunityScore: 0,
  digestCadence: 'off',
};

export function useUserPreferences(userId: string) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getUserPreferences(userId);
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = useCallback(
    async (next: UserPreferences) => {
      setSaving(true);
      setError(null);
      try {
        const updated = await apiClient.updateUserPreferences(userId, next);
        setPreferences(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save preferences');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  return {
    preferences,
    loading,
    saving,
    error,
    setPreferences,
    savePreferences,
    refetch: fetchPreferences,
  };
}

export function useSavedTrends(userId: string) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedTrends = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getSavedTrends(userId, 50, 0);
      setTrends(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved trends');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSavedTrends();
  }, [fetchSavedTrends]);

  const remove = useCallback(
    async (trendId: string) => {
      await apiClient.removeSavedTrend(userId, trendId);
      setTrends(prev => prev.filter(t => t.id !== trendId));
    },
    [userId]
  );

  return {
    trends,
    loading,
    error,
    remove,
    refetch: fetchSavedTrends,
  };
}

export function useAlerts(userId: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listAlerts(userId, false);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const create = useCallback(
    async (input: {
      name: string;
      rule: AlertRule;
      channel?: 'in_app' | 'webhook';
      webhookUrl?: string;
      enabled?: boolean;
    }) => {
      const created = await apiClient.createAlert({ userId, ...input });
      setAlerts(prev => [created, ...prev]);
      return created;
    },
    [userId]
  );

  const toggleEnabled = useCallback(
    async (alert: Alert) => {
      const updated = await apiClient.updateAlert(alert.id, {
        userId,
        enabled: !alert.enabled,
      });
      setAlerts(prev => prev.map(item => (item.id === alert.id ? updated : item)));
    },
    [userId]
  );

  const remove = useCallback(
    async (alertId: string) => {
      await apiClient.deleteAlert(alertId, userId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    },
    [userId]
  );

  const evaluate = useCallback(async () => {
    return apiClient.evaluateAlerts(userId, 25);
  }, [userId]);

  const enabledCount = useMemo(() => alerts.filter(a => a.enabled).length, [alerts]);

  return {
    alerts,
    enabledCount,
    loading,
    error,
    create,
    toggleEnabled,
    remove,
    evaluate,
    refetch: fetchAlerts,
  };
}

export function useAlertMatches(userId: string) {
  const [matchCountByTrendId, setMatchCountByTrendId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!userId) {
      setMatchCountByTrendId({});
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const evaluations: AlertEvaluation[] = await apiClient.evaluateAlerts(userId, 50);
      const counts: Record<string, number> = {};

      for (const item of evaluations) {
        for (const trendId of item.matchedTrendIds) {
          counts[trendId] = (counts[trendId] || 0) + 1;
        }
      }

      setMatchCountByTrendId(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate alert matches');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    matchCountByTrendId,
    loading,
    error,
    refetch: fetchMatches,
  };
}
