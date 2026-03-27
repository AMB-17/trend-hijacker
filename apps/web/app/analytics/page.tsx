'use client';

import { useState } from 'react';
import { useAlertMatches, useSavedTrends } from '@/lib/hooks';
import { Card, CardBody, CardHeader, Button, Badge, SkeletonGrid, Input } from '@/components/ui';
import { TrendTimeline } from '@/components/TrendTimeline';
import { MarketSizeEstimator } from '@/components/MarketSizeEstimator';
import { Search, Archive, Trash2, ExternalLink, BarChart3, Zap } from 'lucide-react';
import Link from 'next/link';
import { DEMO_USER_ID } from '@/lib/user-context';

export default function AnalyticsPage() {
  const userId = DEMO_USER_ID;
  const { data: savedTrends, loading, error, refetch } = useSavedTrends(userId) || {
    data: [],
    loading: false,
    error: null,
    refetch: () => {},
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);

  const filteredTrends = (savedTrends || []).filter((trend: any) =>
    trend.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trend.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTrend = filteredTrends.find((t: any) => t.id === selectedTrendId);

  const stats = {
    totalSaved: savedTrends?.length || 0,
    averageScore:
      savedTrends && savedTrends.length > 0
        ? Math.round(
            savedTrends.reduce((sum: number, t: any) => sum + (t.opportunityScore || 0), 0) /
              savedTrends.length
          )
        : 0,
    activeTrends: savedTrends?.filter((t: any) => t.status === 'ACTIVE').length || 0,
    averageVelocity:
      savedTrends && savedTrends.length > 0
        ? (
            savedTrends.reduce((sum: number, t: any) => sum + (t.growthRate || 0), 0) /
            savedTrends.length
          ).toFixed(2)
        : '0.00',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Trend Analytics</h1>
        <p className="text-muted">Deep dive into your saved trends and market potential</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm text-muted">Saved Trends</p>
            <p className="text-3xl font-bold text-primary">{stats.totalSaved}</p>
            <p className="text-xs text-muted">total tracked</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm text-muted">Avg Opportunity</p>
            <p className="text-3xl font-bold text-accent">{stats.averageScore}</p>
            <p className="text-xs text-muted">score</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm text-muted">Active Trends</p>
            <p className="text-3xl font-bold text-success">{stats.activeTrends}</p>
            <p className="text-xs text-muted">in growth phase</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm text-muted">Avg Growth Rate</p>
            <p className="text-3xl font-bold text-warning">{stats.averageVelocity}x</p>
            <p className="text-xs text-muted">velocity</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends List (Left Sidebar) */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-foreground">Your Saved Trends</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
                <Input
                  type="text"
                  placeholder="Search trends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {error && (
                <div className="text-danger text-sm mb-4 p-2 bg-red-900/20 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <p className="text-muted text-sm">Loading trends...</p>
                ) : filteredTrends.length === 0 ? (
                  <div className="text-center py-8 text-muted">
                    <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved trends yet</p>
                  </div>
                ) : (
                  filteredTrends.map((trend: any) => (
                    <button
                      key={trend.id}
                      onClick={() => setSelectedTrendId(trend.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedTrendId === trend.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-semibold text-sm truncate text-foreground">{trend.title}</p>
                      <p className="text-xs text-muted mt-1">
                        Score: {trend.opportunityScore?.toFixed(0) || 'N/A'}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {trend.status && (
                          <Badge variant="primary" className="text-xs">
                            {trend.status}
                          </Badge>
                        )}
                        {trend.stage && (
                          <Badge variant="accent" className="text-xs">
                            {trend.stage}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {!loading && filteredTrends.length > 0 && (
                <Link href="/trends">
                  <Button variant="outline" size="sm" className="w-full">
                    Browse All Trends →
                  </Button>
                </Link>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Trend Details (Right Main Area) */}
        <div className="lg:col-span-2">
          {!selectedTrend ? (
            <Card>
              <CardBody className="py-16 text-center space-y-4">
                <div className="text-4xl">👈</div>
                <p className="text-muted">Select a trend from the list to view analytics</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Trend Header Card */}
              <Card>
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-foreground truncate">
                        {selectedTrend.title}
                      </h2>
                      <p className="text-muted mt-1 line-clamp-2">{selectedTrend.summary}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/trends/${selectedTrend.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedTrend.status && (
                      <Badge variant="primary">{selectedTrend.status}</Badge>
                    )}
                    {selectedTrend.stage && <Badge variant="accent">{selectedTrend.stage}</Badge>}
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-gray-800">
                    <div>
                      <p className="text-xs text-muted">Opportunity</p>
                      <p className="text-lg font-bold text-accent">
                        {selectedTrend.opportunityScore?.toFixed(0) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Velocity</p>
                      <p className="text-lg font-bold text-success">
                        {selectedTrend.growthRate?.toFixed(2) || 'N/A'}x
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Problem Intensity</p>
                      <p className="text-lg font-bold text-warning">
                        {Math.round((selectedTrend.problemIntensity || 0) * 100)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Discussions</p>
                      <p className="text-lg font-bold text-primary">
                        {(selectedTrend.discussionVolume || 0).toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Timeline Tab */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Trend Timeline</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <TrendTimeline trend={selectedTrend} />
                </CardBody>
              </Card>

              {/* Market Size Tab */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-foreground">Market Potential</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <MarketSizeEstimator trend={selectedTrend} />
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

