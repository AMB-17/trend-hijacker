'use client';

import Link from 'next/link';
import { Card, CardBody, Button, Badge, StatusBadge, OpportunityScore } from './ui';

export function TrendCard({ trend }: { trend: any }) {
  return (
    <Link href={`/trends/${trend.id}`}>
      <Card hover>
        <CardBody className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground truncate hover:text-primary">
                {trend.title}
              </h3>
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

          {/* CTA Button */}
          <Button size="sm" className="w-full">
            View Details →
          </Button>
        </CardBody>
      </Card>
    </Link>
  );
}
