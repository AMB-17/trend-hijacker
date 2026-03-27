'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { LoadingSpinner } from './LoadingSpinner';

interface TimeSeriesData {
  period: string;
  data: any[];
  metrics: any;
  anomalies: any[];
}

interface TrendComparisonData {
  trends: any[];
  similarityScore: number;
  overlayMetrics: any;
  recommendation: string;
}

interface SentimentData {
  latest: any;
  timeSeries: any[];
  summary: any;
  trend: any;
  distribution: any;
}

interface InsightsData {
  summary: string;
  drivers: string[];
  riskAssessment: any;
  industryImpact: any;
  tags: any[];
}

// Time Series Visualization Component
export const TimeSeriesChart: React.FC<{ data: TimeSeriesData }> = ({ data }) => {
  if (!data.data || data.data.length === 0) {
    return <Card className="p-6"><p>No time-series data available</p></Card>;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Trend Velocity Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data.data}>
          <defs>
            <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="velocityGrowth" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVelocity)" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Avg Velocity</p>
          <p className="text-2xl font-bold">{data.metrics.averageVelocity.toFixed(2)}x</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Growth Rate</p>
          <p className="text-2xl font-bold">{data.metrics.growthRate.toFixed(0)}%</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Peak Volume</p>
          <p className="text-2xl font-bold">{data.metrics.peakDay?.discussionVolume || 0}</p>
        </div>
      </div>

      {data.anomalies.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Detected Anomalies</h4>
          <div className="space-y-2">
            {data.anomalies.map((anomaly, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <Badge variant={anomaly.type === 'spike' ? 'success' : 'warning'}>
                  {anomaly.type.toUpperCase()}
                </Badge>
                <span className="text-sm">{new Date(anomaly.date).toLocaleDateString()}</span>
                <span className="ml-auto text-sm font-semibold">{anomaly.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

// Trend Comparison Component
export const TrendComparisonChart: React.FC<{ data: TrendComparisonData }> = ({ data }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Trend Comparison</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {data.trends.map((trend) => (
          <div key={trend.id} className="border rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3 truncate">{trend.title}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Score</span>
                <span className="font-bold">{Math.round(trend.opportunityScore)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Velocity</span>
                <span className="font-bold">{trend.velocityGrowth.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Volume</span>
                <span className="font-bold">{trend.discussionVolume}</span>
              </div>
              <Badge variant="default" className="mt-2">
                {trend.stage}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-gray-600 mb-1">Similarity Score</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${data.similarityScore * 100}%` }}
            />
          </div>
          <span className="font-bold">{(data.similarityScore * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm font-semibold mb-2">Recommendation</p>
        <p className="text-sm">{data.recommendation}</p>
      </div>

      {/* Overlay Metrics Chart */}
      <div className="mt-6">
        <h4 className="font-semibold mb-4">Metric Ranges</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={[
              {
                name: 'Score',
                min: data.overlayMetrics.scoreRange.min,
                max: data.overlayMetrics.scoreRange.max,
                avg: data.overlayMetrics.scoreRange.avg,
              },
              {
                name: 'Velocity',
                min: data.overlayMetrics.velocityRange.min,
                max: data.overlayMetrics.velocityRange.max,
                avg: data.overlayMetrics.velocityRange.avg,
              },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="min" fill="#ef4444" />
            <Bar dataKey="avg" fill="#3b82f6" />
            <Bar dataKey="max" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Sentiment Analysis Component
export const SentimentAnalysisChart: React.FC<{ data: SentimentData }> = ({ data }) => {
  const colors = ['#22c55e', '#ef4444', '#8b5cf6'];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-semibold mb-4">Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Positive', value: (data.distribution.positive * 100) },
                  { name: 'Negative', value: (data.distribution.negative * 100) },
                  { name: 'Neutral', value: (data.distribution.neutral * 100) },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1, 2].map((index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${typeof value === 'number' ? value.toFixed(1) : value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Positive</p>
            <p className="text-2xl font-bold">{(data.summary.latest.positive * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Negative</p>
            <p className="text-2xl font-bold">{(data.summary.latest.negative * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Overall Score</p>
            <p className="text-2xl font-bold">{(data.summary.latest.overall).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Sentiment Trend */}
      {data.timeSeries.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-4">Sentiment Trend</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[-1, 1]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="overallScore" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold mb-1">Trend Direction</p>
            <p className="text-lg">{data.trend.direction === 'improving' ? '📈' : data.trend.direction === 'declining' ? '📉' : '➡️'} {data.trend.direction}</p>
          </div>
        </div>
      )}
    </Card>
  );
};

// AI Insights Widget
export const AIInsightsWidget: React.FC<{ trendId: string }> = ({ trendId }) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const [summary, drivers, risk, impact, tags] = await Promise.all([
          fetch(`/api/trends/${trendId}/summary`).then(r => r.json()),
          fetch(`/api/trends/${trendId}/drivers`).then(r => r.json()),
          fetch(`/api/trends/${trendId}/risk-assessment`).then(r => r.json()),
          fetch(`/api/trends/${trendId}/industry-impact`).then(r => r.json()),
          fetch(`/api/trends/${trendId}/tags`).then(r => r.json()),
        ]);

        setInsights({
          summary: summary.data?.summary || '',
          drivers: drivers.data?.drivers || [],
          riskAssessment: risk.data || {},
          industryImpact: impact.data || {},
          tags: tags.data?.tags || [],
        });
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [trendId]);

  if (loading) return <LoadingSpinner />;
  if (!insights) return <Card className="p-6"><p>Failed to load insights</p></Card>;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">AI-Powered Insights</h3>

      {/* Summary */}
      <div className="mb-6 pb-6 border-b">
        <h4 className="font-semibold mb-2">Summary</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{insights.summary}</p>
      </div>

      {/* Key Drivers */}
      {insights.drivers.length > 0 && (
        <div className="mb-6 pb-6 border-b">
          <h4 className="font-semibold mb-2">Key Drivers</h4>
          <ul className="space-y-2">
            {insights.drivers.map((driver, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex gap-2">
                <span className="text-blue-500">→</span>
                {driver}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Assessment */}
      {Object.keys(insights.riskAssessment).length > 0 && (
        <div className="mb-6 pb-6 border-b">
          <h4 className="font-semibold mb-3">Risk Assessment</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-xs text-gray-600">Hype Score</p>
              <p className="text-2xl font-bold">{insights.riskAssessment.hypeScore}/10</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">Market Validation</p>
              <p className="text-2xl font-bold">{insights.riskAssessment.marketValidation}/10</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-gray-600">Saturation</p>
              <p className="text-2xl font-bold">{insights.riskAssessment.competitiveSaturation}/10</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-xs text-gray-600">Opportunity</p>
              <p className="text-2xl font-bold">{insights.riskAssessment.opportunityScore}/10</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <Badge variant={insights.riskAssessment.goNoGo === 'GO' ? 'success' : insights.riskAssessment.goNoGo === 'NO-GO' ? 'danger' : 'warning'}>
              {insights.riskAssessment.goNoGo}
            </Badge>
          </div>
        </div>
      )}

      {/* Industry Impact */}
      {insights.industryImpact && (
        <div className="mb-6 pb-6 border-b">
          <h4 className="font-semibold mb-2">Industry Impact</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {insights.industryImpact.industries?.map((industry: string) => (
              <Badge key={industry} variant="default">{industry}</Badge>
            ))}
          </div>
          <p className="text-sm">
            <span className="font-semibold">Severity:</span> {insights.industryImpact.impactSeverity}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Timeline:</span> {insights.industryImpact.timelineImpact}
          </p>
        </div>
      )}

      {/* Tags */}
      {insights.tags.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {insights.tags.map((tag: any) => (
              <Badge key={tag.tag} variant="primary">
                {tag.tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default { TimeSeriesChart, TrendComparisonChart, SentimentAnalysisChart, AIInsightsWidget };
