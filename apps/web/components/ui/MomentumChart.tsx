'use client';

import React from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface MomentumChartProps {
  data?: Array<{
    timestamp: string;
    value: number;
  }>;
  height?: number;
  color?: string;
}

export function MomentumChart({
  data = [
    { timestamp: '1d', value: 20 },
    { timestamp: '2d', value: 35 },
    { timestamp: '3d', value: 28 },
    { timestamp: '4d', value: 45 },
    { timestamp: '5d', value: 62 },
    { timestamp: '6d', value: 75 },
    { timestamp: '7d', value: 85 },
  ],
  height = 80,
  color = '#3B82F6',
}: MomentumChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1A1A1A',
            border: '1px solid #27272A',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#EDEDED' }}
        />
        <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
        <XAxis hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
