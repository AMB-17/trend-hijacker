import React from 'react';
import { Button } from '@/components/ui';

interface TrendDetailLayoutProps {
  children: React.ReactNode;
}

export default function TrendDetailLayout({
  children,
}: TrendDetailLayoutProps) {
  return (
    <div className="space-y-6 pb-8">
      {children}
    </div>
  );
}
