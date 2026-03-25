'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, Button, Badge, StatusBadge, OpportunityScore } from './ui';
import { apiClient } from '@/lib/api/client';

interface TrendCardProps {
  trend: any;
  userId?: string;
}

export function TrendCard({ trend, userId }: TrendCardProps) {
  const [isSaved, setIsSaved] = useState(Boolean(trend.isSaved));
  const [saving, setSaving] = useState(false);

  const toggleSaved = async () => {
    if (!userId || saving) {
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await apiClient.removeSavedTrend(userId, trend.id);
        setIsSaved(false);
      } else {
        await apiClient.saveTrend(userId, trend.id);
        setIsSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card hover>
      <CardBody className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/trends/${trend.id}`}>
              <h3 className="text-lg font-bold text-foreground truncate hover:text-primary">
                {trend.title}
              </h3>
            </Link>
            <p className="text-sm text-muted line-clamp-2 mt-1">{trend.summary}</p>
          </div>
          <OpportunityScore score={trend.opportunityScore} size="sm" />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {trend.stage && <StatusBadge stage={trend.stage} />}
          {trend.status && <Badge variant="primary">{trend.status}</Badge>}
          {trend.momentum && (
            <Badge variant={trend.momentum === 'accelerating' ? 'danger' : 'success'}>
              {trend.momentum === 'accelerating' ? '📈 Accelerating' : '→ Stable'}
            </Badge>
          )}
          {isSaved && <Badge variant="success">Saved</Badge>}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 py-3 px-2 bg-card/50 rounded-lg text-xs">
          <div className="text-center">
            <p className="text-muted">Growth</p>
            <p className="font-bold text-success">{(trend.velocityGrowth * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-muted">Volume</p>
            <p className="font-bold text-accent">{trend.discussionVolume}</p>
          </div>
          <div className="text-center">
            <p className="text-muted">Intensity</p>
            <p className="font-bold text-warning">{(trend.problemIntensity * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Keywords */}
        {trend.keywords && trend.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trend.keywords.slice(0, 3).map((kw: string) => (
              <Badge key={kw} variant="default" className="text-xs">
                {kw}
              </Badge>
            ))}
            {trend.keywords.length > 3 && (
              <span className="text-xs text-muted">+{trend.keywords.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/trends/${trend.id}`}>
            <Button size="sm" className="w-full">
              View Details →
            </Button>
          </Link>
          {userId ? (
            <Button size="sm" variant="outline" className="w-full" onClick={toggleSaved} isLoading={saving}>
              {isSaved ? 'Unsave' : 'Save'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full" disabled>
              Save
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
