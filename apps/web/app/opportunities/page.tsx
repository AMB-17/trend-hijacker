'use client';

import { useState } from 'react';
import { useOpportunityMap } from '@/lib/hooks';
import { Card, CardBody, CardHeader, Button, Badge, SkeletonGrid } from '@/components/ui';
import { OpportunityMap } from '@/components/dashboard/OpportunityMap';
import Link from 'next/link';

export default function OpportunitiesPage() {
  const { data: opportunityMap, loading, error, retry } = useOpportunityMap();
  const [selectedTrend, setSelectedTrend] = useState<any>(null);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Opportunity Map</h1>
        <p className="text-muted">
          Explore trends by velocity and problem intensity to find your market gaps
        </p>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground">How to Read This Map</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Quick Wins */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-success" />
                <span className="font-semibold text-foreground">Quick Wins</span>
              </div>
              <p className="text-sm text-muted">
                High pain points with low competition. These are the most attractive opportunities.
              </p>
            </div>

            {/* Big Bets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-accent" />
                <span className="font-semibold text-foreground">Big Bets</span>
              </div>
              <p className="text-sm text-muted">
                High growth potential but higher competition. Requires more resources.
              </p>
            </div>

            {/* Fill-Ins */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-warning" />
                <span className="font-semibold text-foreground">Fill-Ins</span>
              </div>
              <p className="text-sm text-muted">
                Smaller, niche opportunities. Lower risk but smaller market potential.
              </p>
            </div>

            {/* Hard Slogs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-danger" />
                <span className="font-semibold text-foreground">Hard Slogs</span>
              </div>
              <p className="text-sm text-muted">
                Low pain points with high competition. High risk, low reward.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Loading State */}
      {loading && (
        <div>
          <SkeletonGrid count={4} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-danger mb-4">{error}</p>
            <Button variant="outline" onClick={retry}>
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Main Content */}
      {!loading && !error && opportunityMap && (
        <div className="rounded-2xl border border-border bg-card/20 p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Opportunity Map Visualization */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-foreground">Opportunity Landscape</h3>
                <p className="text-sm text-muted mt-1">
                  X-axis: Velocity Growth | Y-axis: Problem Intensity | Size: Discussion Volume
                </p>
              </CardHeader>
              <CardBody>
                <div style={{ height: '500px' }}>
                  <OpportunityMap data={opportunityMap} onSelectTrend={setSelectedTrend} />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Quadrant Summary */}
          <div className="space-y-4">
            {/* Quick Wins Summary */}
            {opportunityMap.quadrants?.quickWins && opportunityMap.quadrants.quickWins.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <h4 className="font-semibold text-foreground">Quick Wins</h4>
                  </div>
                  <p className="text-2xl font-bold text-success mt-2">
                    {opportunityMap.quadrants.quickWins.length}
                  </p>
                </CardHeader>
                <CardBody className="space-y-3">
                  {opportunityMap.quadrants.quickWins.slice(0, 2).map((item) => (
                    <Link
                      key={item.id}
                      href={`/trends/${item.id}`}
                      className="block p-2 rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
                    >
                      <h5 className="font-medium text-foreground text-sm hover:text-primary">
                        {item.title}
                      </h5>
                      <p className="text-xs text-muted mt-1">Score: {item.opportunityScore.toFixed(0)}</p>
                    </Link>
                  ))}
                  {opportunityMap.quadrants.quickWins.length > 2 && (
                    <p className="text-xs text-muted pt-2">
                      +{opportunityMap.quadrants.quickWins.length - 2} more
                    </p>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Big Bets Summary */}
            {opportunityMap.quadrants?.bigBets && opportunityMap.quadrants.bigBets.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <h4 className="font-semibold text-foreground">Big Bets</h4>
                  </div>
                  <p className="text-2xl font-bold text-accent mt-2">
                    {opportunityMap.quadrants.bigBets.length}
                  </p>
                </CardHeader>
                <CardBody className="space-y-3">
                  {opportunityMap.quadrants.bigBets.slice(0, 2).map((item) => (
                    <Link
                      key={item.id}
                      href={`/trends/${item.id}`}
                      className="block p-2 rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
                    >
                      <h5 className="font-medium text-foreground text-sm hover:text-primary">
                        {item.title}
                      </h5>
                      <p className="text-xs text-muted mt-1">Score: {item.opportunityScore.toFixed(0)}</p>
                    </Link>
                  ))}
                  {opportunityMap.quadrants.bigBets.length > 2 && (
                    <p className="text-xs text-muted pt-2">
                      +{opportunityMap.quadrants.bigBets.length - 2} more
                    </p>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Market Summary */}
            {opportunityMap.summary && (
              <Card>
                <CardHeader>
                  <h4 className="font-semibold text-foreground">Market Summary</h4>
                </CardHeader>
                <CardBody className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Total Trends</span>
                    <span className="font-semibold text-foreground">{opportunityMap.summary.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Hot Opportunities</span>
                    <span className="font-semibold text-success">
                      {opportunityMap.quadrants.quickWins.length + opportunityMap.quadrants.bigBets.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Avg. Opportunity</span>
                    <span className="font-semibold text-foreground">
                      {(opportunityMap.summary.avgOpportunityScore || 0).toFixed(1)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Selected Trend Detail Panel */}
      {selectedTrend && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">{selectedTrend.title}</h3>
                <p className="text-sm text-muted mt-1">{selectedTrend.summary}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTrend(null)}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted mb-1">Opportunity Score</p>
                <p className="text-2xl font-bold text-accent">{selectedTrend.opportunityScore.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Growth Rate</p>
                <p className="text-2xl font-bold text-success">
                  {(selectedTrend.velocityGrowth * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted mb-1">Discussion Volume</p>
                <p className="text-2xl font-bold text-primary">{selectedTrend.discussionVolume}</p>
              </div>
            </div>

            {selectedTrend.keywords && (
              <div>
                <p className="text-sm text-muted mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTrend.keywords.slice(0, 5).map((kw: string) => (
                    <Badge key={kw} variant="default">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Link href={`/trends/${selectedTrend.id}`}>
              <Button className="w-full">View Full Details</Button>
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && (!opportunityMap || opportunityMap.summary.total === 0) && (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-muted text-lg mb-4">No opportunity data available yet</p>
            <p className="text-sm text-muted mb-4">Check back soon as more trends are detected</p>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
