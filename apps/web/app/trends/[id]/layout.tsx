'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

export default function TrendDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <div className="space-y-6 pb-8">
      {/* Navigation */}
      <div className="flex gap-2">
        <Link href="/trends">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Trends
          </Button>
        </Link>
      </div>

      {children}
    </div>
  );
}
