'use client';

import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'primary';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variantStyles = {
    default: 'bg-muted/20 text-muted',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
    accent: 'bg-accent/20 text-accent',
    primary: 'bg-primary/20 text-primary',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  stage?: string;
  status?: string;
  className?: string;
}

export function StatusBadge({ stage, status, className }: StatusBadgeProps) {
  // Map stage to badge variant
  const getVariant = () => {
    if (!stage && !status) return 'default';
    const value = stage || status || '';

    if (value.includes('early')) return 'accent';
    if (value.includes('emerg')) return 'warning';
    if (value.includes('explod')) return 'danger';
    if (value.includes('declin')) return 'muted';
    return 'primary';
  };

  const getVariantClass = () => {
    const variant = getVariant();
    if (variant === 'accent') return 'bg-accent/20 text-accent';
    if (variant === 'warning') return 'bg-warning/20 text-warning';
    if (variant === 'danger') return 'bg-danger/20 text-danger';
    if (variant === 'muted') return 'bg-muted/20 text-muted';
    return 'bg-primary/20 text-primary';
  };

  const label = stage || status || 'Unknown';

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
        getVariantClass(),
        className
      )}
    >
      {label}
    </span>
  );
}
