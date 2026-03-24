'use client';

import { useState } from 'react';
import { useTrends } from '@/lib/hooks';
import { Card, CardBody, Button, Input, SkeletonGrid } from '@/components/ui';
import { TrendCard } from '@/components/TrendCard';
import type { TrendFilters } from '@packages/types';
import { Search } from 'lucide-react';

const stages = ['early_signal', 'emerging', 'exploding'];
const statuses = ['EMERGING', 'ACTIVE', 'DECLINING'];

export default function TrendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TrendFilters>({
    stage: undefined,
    status: undefined,
    sortBy: 'score',
    limit: 20,
    offset: 0,
  });

  const { data: trends, loading, error, total, hasMore, refetch } = useTrends(filters);

  const handleStageChange = (stage: string) => {
    setFilters((prev) => ({
      ...prev,
      stage: prev.stage === stage ? undefined : stage,
      offset: 0,
    }));
  };

  const handleStatusChange = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? undefined : status,
      offset: 0,
    }));
  };

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
        <h1 className="text-4xl font-bold text-foreground">Trends</h1>
        <p className="text-muted">Explore all detected trends with advanced filtering</p>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search trends..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Chips */}
          <div className="space-y-3">
            {/* Stage Filter */}
            <div>
              <p className="text-sm text-muted mb-2 font-medium">Stage</p>
              <div className="flex flex-wrap gap-2">
                {stages.map((stage) => (
                  <Button
                    key={stage}
                    onClick={() => handleStageChange(stage)}
                    variant="outline"
                    size="sm"
                    className={
                      filters.stage === stage
                        ? 'bg-primary text-white border-primary hover:bg-primary/90'
                        : ''
                    }
                  >
                    {stage.replaceAll('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <p className="text-sm text-muted mb-2 font-medium">Status</p>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <Button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    variant="outline"
                    size="sm"
                    className={
                      filters.status === status
                        ? 'bg-primary text-white border-primary hover:bg-primary/90'
                        : ''
                    }
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <p className="text-sm text-muted mb-2 font-medium">Sort By</p>
              <div className="flex gap-2">
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
                    {sort}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.stage || filters.status || filters.sortBy !== 'score') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({
                  stage: undefined,
                  status: undefined,
                  sortBy: 'score',
                  limit: 20,
                  offset: 0,
                })
              }
            >
              Clear Filters
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Showing {trends.length} of {total} trends
        </p>
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
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button onClick={handleLoadMore} variant="outline">
                Load More Trends
              </Button>
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-muted text-lg mb-4">No trends found</p>
              <p className="text-sm text-muted">
                Try adjusting your filters or check back later
              </p>
            </CardBody>
          </Card>
        )
      )}
    </div>
  );
}
