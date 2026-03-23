'use client';

import React from 'react';
import { clsx } from 'clsx';

interface OpportunityScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function OpportunityScore({
  score,
  size = 'md',
  showLabel = true,
}: OpportunityScoreProps) {
  // Normalize score to 0-1 for circle
  const normalizedScore = Math.min(100, Math.max(0, score)) / 100;
  const circumference = 2 * Math.PI * 45; // radius 45
  const offset = circumference * (1 - normalizedScore);

  // Color based on score
  const getScoreColor = () => {
    if (score >= 85) return '#8B5CF6'; // Purple
    if (score >= 61) return '#10B981'; // Green
    if (score >= 31) return '#F59E0B'; // Amber
    return '#6B7280'; // Gray
  };

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const textSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
  };

  return (
    <div className="flex flex-col items-center">
      <div className={clsx('relative', sizeClasses[size])}>
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#27272A"
            strokeWidth="2"
          />
        </svg>

        {/* Progress circle */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={getScoreColor()}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={clsx('font-bold', textSizes[size], 'text-foreground')}>
            {Math.round(score)}
          </div>
          <div className="text-xs text-muted">Score</div>
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <p className="text-xs font-medium text-muted">Opportunity Score</p>
        </div>
      )}
    </div>
  );
}
