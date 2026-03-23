'use client';

import React from 'react';
import { Card, CardBody } from './Card';
import { clsx } from 'clsx';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  color = 'primary',
}: MetricCardProps) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  };

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

  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted font-medium">{label}</p>
            <div
              className={clsx('text-3xl font-bold mt-2', colorClasses[color])}
            >
              {value}
            </div>
          </div>
          {icon && (
            <div className={clsx('text-2xl opacity-50', colorClasses[color])}>
              {icon}
            </div>
          )}
        </div>

        {trend && trendValue && (
          <div className={clsx('text-sm font-semibold flex items-center gap-1', getTrendColor())}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
