'use client';

import { OpportunityMap as CanvasOpportunityMap } from '@/components/OpportunityMap';
import type { OpportunityMapData, OpportunityMapItem } from '@/lib/api/client';

interface OpportunityMapProps {
  data: OpportunityMapData;
  onSelectTrend?: (trend: OpportunityMapItem) => void;
}

export function OpportunityMap({ data, onSelectTrend }: OpportunityMapProps) {
  const trends = data.items.map(item => ({
    id: item.id,
    title: item.title,
    opportunityScore: item.opportunityScore,
    discussionCount: item.discussionVolume,
    status: item.stage,
    velocityGrowth: item.velocityGrowth,
    problemIntensity: item.problemIntensity,
    keywords: item.keywords,
  }));

  // Current canvas map is read-only; select callback is kept for API compatibility.
  void onSelectTrend;

  return <CanvasOpportunityMap trends={trends} />;
}
