'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, type Trend } from '../api/client';

export function useSearch(initialQuery: string = '', debounceMs: number = 300) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const trends = await apiClient.searchTrends(searchQuery);
      setResults(trends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new debounced search
      debounceTimer.current = setTimeout(() => {
        performSearch(newQuery);
      }, debounceMs);
    },
    [performSearch, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return {
    query,
    setQuery: handleSearch,
    results,
    loading,
    error,
    clearSearch,
    refetch: () => performSearch(query),
  };
}

export function useSearchSuggestions(query?: string, autoFetch = true) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getSearchSuggestions(query);
        setSuggestions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      } finally {
        setLoading(false);
      }
    };

    if (autoFetch) {
      const timer = setTimeout(() => {
        fetchSuggestions();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [query, autoFetch]);

  return {
    suggestions,
    loading,
    error,
  };
}
