'use client';

import { useState, useMemo } from 'react';
import { useTrends } from '@/lib/hooks';
import { Card, CardBody, CardHeader, Button, Badge, Input } from '@/components/ui';
import { Search, Plus, Trash2, TrendingUp, Users, Zap, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { DEMO_USER_ID } from '@/lib/user-context';

interface SelectedTrend {
  id: string;
  title: string;
  opportunityScore: number;
  growthRate: number;
  problemIntensity: number;
  discussionVolume: number;
  status: string;
  noveltyScore: number;
  stage?: string;
}

export default function ComparePage() {
  const userId = DEMO_USER_ID;
  const trendFilters = useMemo(() => ({ limit: 100, userId }), [userId]);
  const { data: trends, loading } = useTrends(trendFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrends, setSelectedTrends] = useState<SelectedTrend[]>([]);

  const filteredTrends = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return trends;

    return trends.filter((trend) =>
      trend.title?.toLowerCase().includes(normalized) ||
      trend.summary?.toLowerCase().includes(normalized) ||
      (trend.keywords || []).some((k: string) => k.toLowerCase().includes(normalized))
    );
  }, [trends, searchQuery]);

  const handleSelectTrend = (trend: any) => {
    if (selectedTrends.find((t) => t.id === trend.id)) {
      setSelectedTrends(selectedTrends.filter((t) => t.id !== trend.id));
    } else if (selectedTrends.length < 3) {
      setSelectedTrends([
        ...selectedTrends,
        {
          id: trend.id,
          title: trend.title,
          opportunityScore: trend.opportunityScore || 0,
          growthRate: trend.growthRate || 0,
          problemIntensity: trend.problemIntensity || 0,
          discussionVolume: trend.discussionVolume || 0,
          status: trend.status || 'unknown',
          noveltyScore: trend.noveltyScore || 0,
          stage: trend.stage,
        },
      ]);
    }
  };

  const getMetricColor = (value: number, max: number = 100) => {
    const percentage = (value / max) * 100;
    if (percentage >= 75) return 'from-green-600 to-green-400';
    if (percentage >= 50) return 'from-blue-600 to-blue-400';
    if (percentage >= 25) return 'from-yellow-600 to-yellow-400';
    return 'from-red-600 to-red-400';
  };

  const getMetricDisplay = (value: number, max: number = 100) => {
    return `${Math.round((value / max) * 100)}%`;
  };

  const ComparisonMetric = ({
    label,
    values,
    max = 100,
    icon: Icon,
  }: {
    label: string;
    values: number[];
    max?: number;
    icon: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon}
        <span className="font-semibold text-foreground">{label}</span>
      </div>
      <div className="space-y-2">
        {values.map((value, idx) => {
          const percentage = (value / max) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Trend {idx + 1}</span>
                <span className="font-mono font-semibold text-foreground">
                  {value.toFixed(1)}
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getMetricColor(
                    value,
                    max
                  )}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Compare Trends</h1>
        <p className="text-muted">
          {selectedTrends.length === 0
            ? 'Select up to 3 trends to compare side-by-side'
            : `Comparing ${selectedTrends.length} trend${selectedTrends.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-foreground">Select Trends</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
                <Input
                  id="compare-search"
                  name="compare-search"
                  label="Search trends"
                  type="text"
                  placeholder="Search trends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <p className="text-muted text-sm">Loading trends...</p>
                ) : filteredTrends.length === 0 ? (
                  <p className="text-muted text-sm">No trends found</p>
                ) : (
                  filteredTrends.map((trend) => (
                    <button
                      key={trend.id}
                      onClick={() => handleSelectTrend(trend)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedTrends.find((t) => t.id === trend.id)
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-semibold truncate">{trend.title}</p>
                      <p className="text-xs text-muted mt-1">
                        Score: {trend.opportunityScore?.toFixed(0) || 'N/A'}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {selectedTrends.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTrends([])}
                  className="w-full"
                >
                  Clear Selection
                </Button>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Comparison View */}
        <div className="lg:col-span-2">
          {selectedTrends.length === 0 ? (
            <Card>
              <CardBody className="py-16 text-center space-y-4">
                <div className="text-4xl">🔍</div>
                <p className="text-muted">Select trends from the left to compare</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Trend Cards Header */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedTrends.length}, 1fr)` }}>
                {selectedTrends.map((trend, idx) => (
                  <Card key={trend.id}>
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/trends/${trend.id}`}>
                            <h3 className="font-bold text-foreground truncate hover:text-primary">
                              {trend.title}
                            </h3>
                          </Link>
                          <p className="text-xs text-muted mt-1">{trend.stage || 'General'}</p>
                        </div>
                        <button
                          onClick={() =>
                            setSelectedTrends(selectedTrends.filter((_, i) => i !== idx))
                          }
                          className="text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="primary">{trend.status}</Badge>
                        {trend.stage && <Badge variant="accent">{trend.stage}</Badge>}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {/* Comparison Metrics */}
              <Card>
                <CardBody className="space-y-6">
                  <ComparisonMetric
                    label="Opportunity Score"
                    values={selectedTrends.map((t) => t.opportunityScore)}
                    icon={<Zap className="w-5 h-5 text-accent" />}
                  />

                  <div className="border-t border-gray-800" />

                  <ComparisonMetric
                    label="Growth Rate"
                    values={selectedTrends.map((t) => t.growthRate)}
                    icon={<TrendingUp className="w-5 h-5 text-success" />}
                  />

                  <div className="border-t border-gray-800" />

                  <ComparisonMetric
                    label="Problem Intensity"
                    values={selectedTrends.map((t) => t.problemIntensity)}
                    max={100}
                    icon={<AlertCircle className="w-5 h-5 text-warning" />}
                  />

                  <div className="border-t border-gray-800" />

                  <ComparisonMetric
                    label="Novelty Score"
                    values={selectedTrends.map((t) => t.noveltyScore)}
                    icon={<Zap className="w-5 h-5 text-primary" />}
                  />

                  <div className="border-t border-gray-800" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Discussion Volume</span>
                    </div>
                    <div className="space-y-2">
                      {selectedTrends.map((t, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted">Trend {idx + 1}</span>
                          <span className="font-mono font-semibold text-foreground">
                            {t.discussionVolume.toLocaleString()} posts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Insights */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-foreground">Quick Insights</h3>
                </CardHeader>
                <CardBody className="space-y-2 text-sm">
                  {(() => {
                    const highest = selectedTrends.reduce((prev, current) =>
                      prev.opportunityScore > current.opportunityScore ? prev : current
                    );
                    const fastest = selectedTrends.reduce((prev, current) =>
                      prev.growthRate > current.growthRate ? prev : current
                    );
                    const mostProblems = selectedTrends.reduce((prev, current) =>
                      prev.problemIntensity > current.problemIntensity ? prev : current
                    );

                    return (
                      <>
                        <p className="text-muted">
                          <span className="text-primary font-semibold">{highest.title}</span> has
                          the highest overall opportunity score
                        </p>
                        <p className="text-muted">
                          <span className="text-success font-semibold">{fastest.title}</span> is
                          growing the fastest
                        </p>
                        <p className="text-muted">
                          <span className="text-warning font-semibold">{mostProblems.title}</span>{' '}
                          has the most pain points
                        </p>
                      </>
                    );
                  })()}
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
