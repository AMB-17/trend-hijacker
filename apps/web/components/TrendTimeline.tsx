'use client';

import { useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { TrendingUp, Activity, Target } from 'lucide-react';

interface TimelineData {
  timestamp: string;
  mention_count: number;
  velocity: number;
  acceleration: number;
  sentiment_avg: number;
}

interface TrendTimelineProps {
  trend: any;
  metrics?: TimelineData[];
}

export function TrendTimeline({ trend, metrics = [] }: TrendTimelineProps) {
  // Generate simulated historical data if metrics not provided
  const data = useMemo(() => {
    if (metrics && metrics.length > 0) {
      return metrics.map((m) => ({
        date: new Date(m.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        mentions: m.mention_count,
        velocity: Math.round(m.velocity * 100) / 100,
        acceleration: Math.round(m.acceleration * 100) / 100,
        sentiment: Math.round((m.sentiment_avg + 1) * 50), // Convert -1 to 1 scale to 0-100
      }));
    }

    // Generate 30 days of simulated data for demo
    const generated = [];
    const today = new Date();
    const growthRate = trend.velocityScore || 1.5;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const baseVelocity = 0.5 + Math.random() * 0.5;
      const mentions = Math.floor(
        (trend.discussionCount || 100) *
          (Math.pow(growthRate, i / 30) * (0.5 + Math.random() * 0.5))
      );
      const sentiment = 50 + Math.sin(i / 10) * 20 + (Math.random() - 0.5) * 10;

      generated.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mentions: Math.max(mentions, 0),
        velocity: baseVelocity + Math.sin(i / 5) * 0.3,
        acceleration: (Math.random() - 0.5) * 0.5,
        sentiment: Math.max(20, Math.min(80, sentiment)),
      });
    }

    return generated;
  }, [metrics, trend]);

  return (
    <div className="space-y-4">
      {/* Discussion Volume Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Discussion Volume Over Time</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorMentions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#222',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) =>
                    typeof value === 'number' ? value.toLocaleString() : value
                  }
                />
                <Area
                  type="monotone"
                  dataKey="mentions"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#colorMentions)"
                  name="Mentions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Velocity & Sentiment Overlay */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <h3 className="font-semibold text-foreground">Velocity & Sentiment Trend</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#222',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) =>
                    typeof value === 'number' ? value.toFixed(2) : value
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="velocity"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Velocity"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Sentiment (0-100)"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm text-muted">Peak Volume</p>
            <p className="text-2xl font-bold text-primary">
              {Math.max(...data.map((d) => d.mentions)).toLocaleString()}
            </p>
            <p className="text-xs text-muted">mentions</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm text-muted">Average Velocity</p>
            <p className="text-2xl font-bold text-success">
              {(
                data.reduce((a, b) => a + b.velocity, 0) / data.length
              ).toFixed(2)}
            </p>
            <p className="text-xs text-muted">growth rate</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm text-muted">Average Sentiment</p>
            <p className="text-2xl font-bold text-accent">
              {Math.round(
                data.reduce((a, b) => a + b.sentiment, 0) / data.length
              )}%
            </p>
            <p className="text-xs text-muted">positive</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
