'use client';

import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
    secondary: 'bg-card text-foreground hover:bg-card-hover border border-border',
    outline: 'border border-border text-foreground hover:bg-card',
    ghost: 'text-foreground hover:bg-card/50',
    danger: 'bg-danger text-white hover:bg-danger/90',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {isLoading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
