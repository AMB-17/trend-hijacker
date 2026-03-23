'use client';

import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  icon,
  className,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={clsx(
            'w-full px-4 py-2 bg-card border border-border rounded-lg',
            'text-foreground placeholder-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'transition-all duration-200',
            icon && 'pl-10',
            error && 'border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
