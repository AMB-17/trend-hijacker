'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTrendById } from '@/lib/hooks';
import { Card, CardBody, CardHeader, Button, Badge, StatusBadge, OpportunityScore, MomentumChart, VelocityIndicator } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { DEMO_USER_ID } from '@/lib/user-context';

export default function TrendDetailPage() {
  const userId = DEMO_USER_ID;
  const params = useParams();
  const trendId = params?.id as string;
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: trend, loading, error, retry } = useTrendById(trendId);

  useEffect(() => {
    if (!trendId || !userId) {
      return;
    }

    apiClient
      .getSavedTrends(userId, 200, 0)
      .then(response => {
        setIsSaved(response.data.some(item => item.id === trendId));
      })
      .catch(() => {
        setIsSaved(false);
      });
  }, [trendId, userId]);

  const toggleSaved = async () => {
    if (!trendId || saving) {
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await apiClient.removeSavedTrend(userId, trendId);
        setIsSaved(false);
      } else {
        await apiClient.saveTrend(userId, trendId);
        setIsSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6 pb-8">
        <Link href="/trends">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Trends
          </Button>
        </Link>

        <Card>
          <CardBody className="text-center py-12">
            <p className="text-danger mb-4 text-lg">{error}</p>
            <Button onClick={retry} variant="outline">
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (loading || !trend) {
    return (
      <div className="space-y-6 pb-8">
        <div className="h-10 w-32 bg-card rounded-lg animate-pulse" />

        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="h-8 w-3/4 bg-card rounded-lg animate-pulse" />
              <div className="h-4 w-full bg-card rounded-lg animate-pulse" />
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="h-4 w-full bg-card rounded-lg animate-pulse" />
            <div className="h-4 w-5/6 bg-card rounded-lg animate-pulse" />
          </CardBody>
        </Card>
      </div>
    );
  }

  const chartData = [
    { timestamp: 'Week 1', value: 10 },
    { timestamp: 'Week 2', value: 15 },
    { timestamp: 'Week 3', value: 25 },
    { timestamp: 'Week 4', value: 40 },
    { timestamp: 'Week 5', value: 65 },
    { timestamp: 'Week 6', value: 95 },
  ];

  const sourceLinks = (trend.posts || [])
    .map((entry: any) => {
      const post = entry?.post || entry;
      if (!post?.url) return null;
      return {
        url: post.url as string,
        title: (post.title as string) || 'Source discussion',
        sourceName: (post?.source?.name as string) || 'source',
      };
    })
    .filter((item: { url: string; title: string; sourceName: string } | null): item is { url: string; title: string; sourceName: string } => Boolean(item));

  const uniqueSourceLinks = Array.from(new Map(sourceLinks.map(item => [item.url, item])).values());
  const mainSource = uniqueSourceLinks[0];

  return (
    <div className="space-y-6 pb-8">
      {/* Back Button */}
      <Link href="/trends">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Trends
        </Button>
      </Link>

      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-foreground mb-2">{trend.title}</h1>
                <p className="text-muted text-lg mb-4">{trend.summary}</p>

                <div className="flex flex-wrap gap-2 items-center">
                  <StatusBadge stage={trend.stage} />
                  <Badge variant="primary">{trend.status}</Badge>
                  {isSaved && <Badge variant="success">Saved</Badge>}
                  {trend.momentum && (
                    <Badge variant={trend.momentum === 'accelerating' ? 'danger' : 'success'}>
                      {trend.momentum.charAt(0).toUpperCase() + trend.momentum.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 min-w-[140px]">
                <OpportunityScore score={trend.opportunityScore} size="lg" />
                <p className="text-sm text-muted">Opportunity Score</p>
                <Button size="sm" variant="outline" onClick={toggleSaved} isLoading={saving} className="w-full">
                  {isSaved ? 'Unsave Trend' : 'Save Trend'}
                </Button>
                {mainSource ? (
                  <a href={mainSource.url} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button size="sm" variant="secondary" className="w-full">
                      Open Main Source
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="secondary" className="w-full" disabled>
                    Open Main Source
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {uniqueSourceLinks.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Source Links</h3>
            <p className="text-sm text-muted mt-1">Primary websites or repositories where this trend was detected</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {uniqueSourceLinks.slice(0, 5).map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border border-border bg-card/40 hover:bg-card transition-colors"
              >
                <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                <p className="text-xs text-muted mt-1">Source: {item.sourceName}</p>
              </a>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Velocity Growth */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Velocity Growth</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-success">
                {(trend.velocityGrowth * 100).toFixed(0)}%
              </span>
              <VelocityIndicator percentage={trend.velocityGrowth * 100} />
            </div>
            <p className="text-sm text-muted">Rate of topic acceleration</p>
          </CardBody>
        </Card>

        {/* Problem Intensity */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Problem Intensity</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-warning to-danger transition-all"
                    style={{ width: `${trend.problemIntensity * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-foreground w-12 text-right">
                {(trend.problemIntensity * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-muted">How urgent this problem is</p>
          </CardBody>
        </Card>

        {/* Discussion Volume */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Discussion Volume</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-accent">{trend.discussionVolume}</span>
              <span className="text-sm text-muted">mentions</span>
            </div>
            <p className="text-sm text-muted">Total posts discussing this</p>
          </CardBody>
        </Card>
      </div>

      {/* Momentum Chart */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground">Trend Momentum Over Time</h3>
          <p className="text-sm text-muted mt-1">How the conversation velocity is changing</p>
        </CardHeader>
        <CardBody>
          <MomentumChart data={chartData} height={200} color="rgb(59, 130, 246)" />
        </CardBody>
      </Card>

      {/* Keywords Section */}
      {trend.keywords && trend.keywords.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Related Keywords</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {trend.keywords.map((keyword) => (
                <Badge key={keyword} variant="default">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Business Insights Section */}
      {trend.suggestedIdeas && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Business Insights</h3>
            <p className="text-sm text-muted mt-1">AI-generated startup ideas based on this trend</p>
          </CardHeader>
          <CardBody className="space-y-4">
            {Array.isArray(trend.suggestedIdeas) ? (
              trend.suggestedIdeas.slice(0, 3).map((idea, index) => (
                <div key={index} className="p-4 bg-card/50 rounded-lg border border-border/50">
                  <h4 className="font-semibold text-foreground mb-1">{idea}</h4>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">{trend.suggestedIdeas}</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Target Audience Section */}
      {trend.targetAudience && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Target Audience</h3>
          </CardHeader>
          <CardBody>
            <p className="text-foreground">{trend.targetAudience}</p>
          </CardBody>
        </Card>
      )}

      {/* Market Potential Section */}
      {trend.marketPotential && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Market Potential</h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  trend.marketPotential === 'high'
                    ? 'bg-success/20 text-success'
                    : trend.marketPotential === 'medium'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-muted/20 text-muted'
                }`}
              >
                {trend.marketPotential?.toUpperCase()}
              </div>
              <p className="text-muted">Estimated market opportunity</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Meta Information */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground">Trend Information</h3>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted mb-1">First Detected</p>
            <p className="text-foreground font-medium">
              {new Date(trend.firstDetected).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted mb-1">Last Updated</p>
            <p className="text-foreground font-medium">
              {new Date(trend.lastUpdated).toLocaleDateString()}
            </p>
          </div>
          {trend.peakDate && (
            <div>
              <p className="text-muted mb-1">Peak Activity</p>
              <p className="text-foreground font-medium">{new Date(trend.peakDate).toLocaleDateString()}</p>
            </div>
          )}
          <div>
            <p className="text-muted mb-1">Growth Rate</p>
            <p className="text-foreground font-medium">{(trend.growthRate * 100).toFixed(1)}%</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
