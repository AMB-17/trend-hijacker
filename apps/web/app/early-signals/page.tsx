'use client';

import { useState } from 'react';
import { useAlertMatches, useTrends } from '@/lib/hooks';
import { Card, CardBody, Button, Input, SkeletonGrid } from '@/components/ui';
import { TrendCard } from '@/components/TrendCard';
import type { TrendFilters } from '@packages/types';
import { Search } from 'lucide-react';
import { DEMO_USER_ID } from '@/lib/user-context';

export default function EarlySignalsPage() {
  const userId = DEMO_USER_ID;
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TrendFilters>({
    userId,
    stage: 'early_signal',
    sortBy: 'score',
    limit: 20,
    offset: 0,
  });

  const { data: trends, loading, error, total, hasMore, refetch } = useTrends(filters);
  const { matchCountByTrendId } = useAlertMatches(userId);

  const handleSortChange = (sortBy: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: sortBy as any,
    }));
  };

  const handleLoadMore = () => {
    setFilters((prev) => ({
      ...prev,
      offset: prev.offset! + (prev.limit || 20),
    }));
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Early Signals</h1>
        <p className="text-muted">
          Catch emerging trends before they become mainstream. These are early indicators of market demand.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-l-4 border-l-accent">
        <CardBody>
          <p className="text-foreground">
            💡{' '}
            <strong>Early signals</strong> are trends in their first stages of detection. They show the earliest
            signs of market interest and can represent the highest-upside opportunities if capitalized on early.
          </p>
        </CardBody>
      </Card>

      {/* Filters */}
      <Card>
        <CardBody className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search early signals..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort */}
          <div>
            <p className="text-sm text-muted mb-2 font-medium">Sort By</p>
            <div className="flex gap-2 flex-wrap">
              {['score', 'date', 'velocity', 'volume'].map((sort) => (
                <Button
                  key={sort}
                  onClick={() => handleSortChange(sort)}
                  variant="outline"
                  size="sm"
                  className={
                    filters.sortBy === sort
                      ? 'bg-primary text-white border-primary hover:bg-primary/90'
                      : ''
                  }
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Showing {trends.length} of {total} early signals</p>
      </div>

      {/* Error State */}
      {error && (
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-danger mb-4">{error}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Loading State */}
      {loading && filters.offset === 0 && <SkeletonGrid count={6} />}

      {/* Trends Grid */}
      {!loading && trends.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((trend) => (
              <TrendCard
                key={trend.id}
                trend={trend}
                userId={userId}
                alertMatchCount={matchCountByTrendId[trend.id] || 0}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button onClick={handleLoadMore} variant="outline">
                Load More Early Signals
              </Button>
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-muted text-lg mb-4">No early signals detected yet</p>
              <p className="text-sm text-muted">
                Early signals appear when the system detects emerging patterns in public discussions. Check back soon!
              </p>
            </CardBody>
          </Card>
        )
      )}

      {/* Info Section */}
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-foreground mb-3">What Makes a Good Early Signal?</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="text-accent font-bold">✓</span>
              <span className="text-foreground">
                <strong>Rapid growth:</strong> Sudden spike in mentions or discussions
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-bold">✓</span>
              <span className="text-foreground">
                <strong>Strong pain points:</strong> Multiple people discussing the same problem
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-bold">✓</span>
              <span className="text-foreground">
                <strong>Authentic demand:</strong> Real user questions and needs, not marketing hype
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent font-bold">✓</span>
              <span className="text-foreground">
                <strong>Limited saturation:</strong> Few existing solutions already addressing it
              </span>
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
