'use client';

import { useEffect, useState } from 'react';
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
import { TrendingUp, Activity, AlertCircle } from 'lucide-react';

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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(!metrics || metrics.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (metrics && metrics.length > 0) {
      // Use provided metrics
      const transformed = metrics.map((m) => ({
        date: new Date(m.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        mentions: m.mention_count,
        velocity: Math.round(m.velocity * 100) / 100,
        acceleration: Math.round(m.acceleration * 100) / 100,
        sentiment: Math.round((m.sentiment_avg + 1) * 50),
      }));
      setData(transformed);
      setLoading(false);
      return;
    }

    // Fetch real data from API
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/trends/${trend.id}/timeseries?period=30d`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch trend history');
        }

        const result = await response.json();
        
        if (result.success && result.data?.data && Array.isArray(result.data.data)) {
          setData(result.data.data);
        } else {
          setError('No historical data available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trend history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trend.id, metrics]);

  if (error) {
    return (
      <Card>
        <CardBody className="py-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-warning mx-auto" />
          <p className="text-muted">{error}</p>
          <p className="text-xs text-muted">Timeline data will be available as trend data accumulates</p>
        </CardBody>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-muted">Loading trend history...</p>
        </CardBody>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-muted">Trend data not yet available</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discussion Volume Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Discussion Volume Trend</h3>
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
            <h3 className="font-semibold text-foreground">Growth Velocity & Community Sentiment</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" yAxisId="left" label={{ value: 'Velocity', angle: -90, position: 'insideLeft' }} />
                <YAxis stroke="#999" yAxisId="right" orientation="right" label={{ value: 'Sentiment %', angle: 90, position: 'insideRight' }} />
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
                  yAxisId="left"
                  type="monotone"
                  dataKey="velocity"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Growth Velocity"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Community Sentiment"
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
