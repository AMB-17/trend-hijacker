'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle';
}

export function Skeleton({ className, variant = 'card' }: SkeletonProps) {
  const variantStyles = {
    card: 'h-48 rounded-lg',
    text: 'h-4 rounded',
    circle: 'w-10 h-10 rounded-full',
  };

  return (
    <div
      className={clsx(
        'bg-card/50 animate-pulse',
        variantStyles[variant],
        className
      )}
    />
  );
}

interface SkeletonGridProps {
  count: number;
  className?: string;
}

export function SkeletonGrid({ count, className }: SkeletonGridProps) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
}
