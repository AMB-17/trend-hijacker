'use client';

import React from 'react';
import { clsx } from 'clsx';

interface VelocityIndicatorProps {
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
  showLabel?: boolean;
}

export function VelocityIndicator({
  percentage,
  trend = 'stable',
  showLabel = true,
}: VelocityIndicatorProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-danger';
    return 'text-muted';
  };

  // Clamp percentage between 0 and 100+
  const clampedPercentage = Math.max(0, Math.min(percentage, 200));

  return (
    <div className="flex items-center gap-2">
      <span className={clsx('text-lg font-bold', getTrendColor())}>
        {getTrendIcon()}
      </span>
      <div className="flex-1">
        <div className="h-2 bg-card rounded-full overflow-hidden border border-border">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300',
              percentage > 100 && 'bg-danger',
              percentage >= 50 && percentage <= 100 && 'bg-success',
              percentage < 50 && 'bg-warning'
            )}
            style={{ width: `${Math.min(clampedPercentage, 100)}%` }}
          />
        </div>
      </div>
      {showLabel && (
        <span className={clsx('text-sm font-semibold', getTrendColor())}>
          {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
