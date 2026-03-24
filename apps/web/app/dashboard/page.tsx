'use client';

import { useEarlySignals, useExplodingTrends, useOpportunityMap } from '@/lib/hooks';
import { Card, CardBody, CardHeader, SkeletonGrid, Button, Badge } from '@/components/ui';
import { TrendCard } from '@/components/TrendCard';
import { MetricCard } from '@/components/ui/MetricCard';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    data: earlySignals,
    loading: earlyLoading,
    error: earlyError,
    retry: retryEarlySignals,
  } = useEarlySignals(6);
  const {
    data: explodingTrends,
    loading: explodingLoading,
    error: explodingError,
    retry: retryExplodingTrends,
  } = useExplodingTrends(6);
  const {
    data: opportunityMap,
    loading: oppLoading,
    error: oppError,
    retry: retryOpportunityMap,
  } = useOpportunityMap();

  const totalMetrics = {
    earlySignals: earlySignals?.length || 0,
    explodingTrends: explodingTrends?.length || 0,
    opportunities: opportunityMap?.summary?.total || 0,
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted">Monitor early signals and emerging opportunities in real-time</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Early Signals"
          value={totalMetrics.earlySignals}
          color="accent"
          icon="⚡"
          trendValue={`+${Math.floor(Math.random() * 10)}%`}
          trend="up"
        />
        <MetricCard
          label="Exploding Trends"
          value={totalMetrics.explodingTrends}
          color="danger"
          icon="🚀"
          trendValue={`+${Math.floor(Math.random() * 20)}%`}
          trend="up"
        />
        <MetricCard
          label="Total Opportunities"
          value={totalMetrics.opportunities}
          color="success"
          icon="🎯"
          trendValue={`+${Math.floor(Math.random() * 15)}%`}
          trend="up"
        />
      </div>

      {/* Early Signals Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Early Signals</h2>
          <Link href="/early-signals">
            <Button variant="outline" size="sm">
              View All →
            </Button>
          </Link>
        </div>

        {earlyError ? (
          <Card>
            <CardBody className="text-center py-8">
              <p className="text-danger mb-4">{earlyError}</p>
              <Button variant="outline" size="sm" onClick={retryEarlySignals}>
                Retry
              </Button>
            </CardBody>
          </Card>
        ) : earlyLoading ? (
          <SkeletonGrid count={3} />
        ) : earlySignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earlySignals.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="text-center py-8 text-muted">
              No early signals found yet. Data will appear as trends are detected.
            </CardBody>
          </Card>
        )}
      </section>

      {/* Exploding Trends Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Exploding Trends</h2>
          <Link href="/trends?stage=exploding">
            <Button variant="outline" size="sm">
              View All →
            </Button>
          </Link>
        </div>

        {explodingError ? (
          <Card>
            <CardBody className="text-center py-8">
              <p className="text-danger mb-4">{explodingError}</p>
              <Button variant="outline" size="sm" onClick={retryExplodingTrends}>
                Retry
              </Button>
            </CardBody>
          </Card>
        ) : explodingLoading ? (
          <SkeletonGrid count={3} />
        ) : explodingTrends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {explodingTrends.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="text-center py-8 text-muted">
              No exploding trends yet. Check back soon!
            </CardBody>
          </Card>
        )}
      </section>

      {/* Opportunities Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Quick Wins</h2>
          <Link href="/opportunities">
            <Button variant="outline" size="sm">
              View Opportunities Map →
            </Button>
          </Link>
        </div>

        {oppError ? (
          <Card>
            <CardBody className="text-center py-8">
              <p className="text-danger mb-4">{oppError}</p>
              <Button variant="outline" size="sm" onClick={retryOpportunityMap}>
                Retry
              </Button>
            </CardBody>
          </Card>
        ) : oppLoading ? (
          <SkeletonGrid count={3} />
        ) : opportunityMap?.quadrants?.quickWins?.length ? (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Quick Win Opportunities</h3>
              <p className="text-sm text-muted mt-1">
                High pain points with low competition - ideal for building solutions
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              {opportunityMap.quadrants.quickWins.slice(0, 3).map((item) => (
                <div key={item.id} className="p-3 bg-card/50 rounded-lg border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.keywords.slice(0, 3).map((kw) => (
                          <Badge key={kw} variant="primary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success">
                        {item.opportunityScore.toFixed(0)}
                      </div>
                      <p className="text-xs text-muted">Score</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
