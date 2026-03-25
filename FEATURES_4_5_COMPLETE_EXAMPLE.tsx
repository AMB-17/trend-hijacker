// FEATURES 4 & 5 - COMPLETE INTEGRATION EXAMPLE
// This file demonstrates how to use all new analytics features together

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  TimeSeriesChart, 
  TrendComparisonChart, 
  SentimentAnalysisChart, 
  AIInsightsWidget 
} from '@/components/AnalyticsCharts';
import { 
  ReportGeneratorModal, 
  ReportHistoryPanel, 
  ScheduledReportManager 
} from '@/components/ReportGenerator';

/**
 * Complete example showing all features working together
 */
export default function CompleteTrendAnalyticsDashboard({ trendId }: { trendId: string }) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'analysis' | 'reports'>('overview');
  const [reportModal, setReportModal] = useState(false);

  // ============================================================
  // FEATURE 4: Trend Analysis & Comparison
  // ============================================================

  const fetchTimeSeriesData = async (period: '1m' | '3m' | '6m' | '12m' = '6m') => {
    try {
      const response = await fetch(`/api/trends/${trendId}/timeseries?period=${period}`);
      const data = await response.json();
      
      // Returns: { period, data[], metrics, anomalies[] }
      // - data: Array of daily snapshots with metrics
      // - metrics: Average velocity, growth rate, peak days
      // - anomalies: Detected spikes/drops with z-score confidence
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch time-series:', error);
    }
  };

  const fetchSeasonalityAnalysis = async (period: '3m' | '6m' | '12m' = '6m') => {
    try {
      const response = await fetch(`/api/trends/${trendId}/seasonality?period=${period}`);
      const data = await response.json();
      
      // Returns: { seasonalityScore (0-1), pattern, peakDay }
      // - seasonalityScore: 0 = random, 1 = strong pattern
      // - pattern: Day-of-week breakdown
      // - peakDay: Which day has highest engagement
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch seasonality:', error);
    }
  };

  const fetchCohortAnalysis = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/cohorts`);
      const data = await response.json();
      
      // Returns: { trendId, cohorts[], heatmap }
      // - cohorts: User segments with engagement metrics
      // - heatmap: Segment x Trend interest matrix
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch cohort analysis:', error);
    }
  };

  const fetchCompetitiveLandscape = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/competitive-landscape`);
      const data = await response.json();
      
      // Returns: { similarTrendIds[], velocityRank, discussionRank, 
      //            lifecycleStage, competitorCount, averageVelocity }
      // - Shows market positioning vs similar trends
      // - Lifecycle stage detection (emerging/growth/mature/decline)
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch competitive landscape:', error);
    }
  };

  const compareTrends = async (trendIds: string[]) => {
    if (trendIds.length < 2 || trendIds.length > 3) {
      alert('Please select 2-3 trends to compare');
      return;
    }

    try {
      const response = await fetch('/api/trends/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trendIds }),
      });
      const data = await response.json();
      
      // Returns: { trends[], similarityScore, overlayMetrics, recommendation }
      // - Side-by-side metrics for each trend
      // - Similarity score (0-1)
      // - Comparative analysis
      
      return data.data;
    } catch (error) {
      console.error('Failed to compare trends:', error);
    }
  };

  // ============================================================
  // FEATURE 5: Advanced Insights & Sentiment
  // ============================================================

  const fetchSentimentAnalysis = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/sentiment`);
      const data = await response.json();
      
      // Returns: { latest, timeSeries[], summary, trend, distribution }
      // - latest: Current sentiment scores (positive/negative/neutral %)
      // - timeSeries: Historical sentiment tracking
      // - summary: Averages and dominant sentiment
      // - trend: Direction (improving/declining) with strength
      // - distribution: Overall percentages
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch sentiment:', error);
    }
  };

  const fetchSentimentDrivers = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/sentiment-drivers`);
      const data = await response.json();
      
      // Returns: { positiveDrivers[], negativeDrivers[], neutralIndicators[] }
      // - Lists keywords/phrases driving sentiment
      // - Includes mention counts
      // - Help understand WHY sentiment is positive/negative
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch sentiment drivers:', error);
    }
  };

  const fetchAISummary = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/summary`);
      const data = await response.json();
      
      // Returns: { summary: "1-2 paragraph AI analysis" }
      // - AI-generated using OpenAI
      // - Explains trend significance
      // - Includes embedded statistics
      // - Cached for 7 days
      
      return data.data.summary;
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const fetchKeyDrivers = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/drivers`);
      const data = await response.json();
      
      // Returns: { drivers: ["Driver 1: ...", "Driver 2: ...", ...] }
      // - 3-5 key reasons trend is growing
      // - Based on discussion content analysis
      // - AI-generated insights
      
      return data.data.drivers;
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  };

  const fetchSubTrends = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/sub-trends`);
      const data = await response.json();
      
      // Returns: { subTrends: [...] }
      // - Micro-trends within main trend
      // - Growth rates for each sub-trend
      // - Related topics and cross-platform correlations
      
      return data.data.subTrends;
    } catch (error) {
      console.error('Failed to fetch sub-trends:', error);
    }
  };

  const fetchRiskAssessment = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/risk-assessment`);
      const data = await response.json();
      
      // Returns: { hypeScore, marketValidation, competitiveSaturation,
      //            opportunityScore, riskIndicators, goNoGo, recommendation }
      // - Comprehensive risk scoring (1-10 scales)
      // - GO/NO-GO/REVIEW recommendation
      // - Considers hype vs validation
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch risk assessment:', error);
    }
  };

  const fetchIndustryImpact = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/industry-impact`);
      const data = await response.json();
      
      // Returns: { industries[], impactSeverity, timelineImpact, justification }
      // - Affected industries (SaaS, Healthcare, Finance, etc.)
      // - Impact severity (high/medium/low)
      // - Timeline (immediate/6-month/12-month)
      
      return data.data;
    } catch (error) {
      console.error('Failed to fetch industry impact:', error);
    }
  };

  const fetchAutoTags = async () => {
    try {
      const response = await fetch(`/api/trends/${trendId}/tags`);
      const data = await response.json();
      
      // Returns: { tags: [{ tag, category, confidence }, ...] }
      // - 8-12 auto-generated semantic tags
      // - Categories: industry, difficulty, market_size, timeframe, risk_level
      // - Confidence scores (0-1)
      
      return data.data.tags;
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  // ============================================================
  // FEATURE 4: Report Generation
  // ============================================================

  const generateReport = async (format: 'pdf' | 'csv' | 'html', trendIds: string[], startDate: Date, endDate: Date) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/generate?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendIds,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      const data = await response.json();
      
      // Returns: { id, title, format, fileUrl, createdAt, ... }
      // - Report stored in database
      // - File URL for download
      
      if (data.data?.fileUrl) {
        window.open(data.data.fileUrl, '_blank');
      }
      
      return data.data;
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const createScheduledReport = async (config: any) => {
    try {
      const response = await fetch('/api/reports/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      
      // Creates recurring report with:
      // - Frequency (DAILY/WEEKLY/MONTHLY)
      // - Specific day/time
      // - Template configuration
      // - Email recipients
      
      return data.data;
    } catch (error) {
      console.error('Failed to create scheduled report:', error);
    }
  };

  // ============================================================
  // UI Rendering
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        {(['overview', 'analysis', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeSection === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab - Feature 5 Insights */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* AI-Powered Insights Widget */}
          <AIInsightsWidget trendId={trendId} />

          {/* Risk Assessment Card */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click to fetch detailed risk metrics including hype score, market validation, and opportunity scoring.
            </p>
            <Button onClick={() => fetchRiskAssessment()}>
              Load Risk Assessment
            </Button>
          </Card>

          {/* Sentiment Analysis */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>
            <p className="text-sm text-gray-600 mb-4">
              View community sentiment with positive/negative/neutral distribution and trend direction.
            </p>
            <Button onClick={() => fetchSentimentAnalysis()}>
              Load Sentiment Data
            </Button>
          </Card>
        </div>
      )}

      {/* Analysis Tab - Feature 4 Analytics */}
      {activeSection === 'analysis' && (
        <div className="space-y-6">
          {/* Time-Series Analysis */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Time-Series Analysis</h3>
            <p className="text-sm text-gray-600 mb-4">
              Historical trend data with growth patterns, anomaly detection, and seasonality analysis.
            </p>
            <div className="flex gap-2">
              {(['1m', '3m', '6m', '12m'] as const).map(period => (
                <Button
                  key={period}
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTimeSeriesData(period)}
                >
                  {period}
                </Button>
              ))}
            </div>
          </Card>

          {/* Trend Comparison */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Trend Comparison</h3>
            <p className="text-sm text-gray-600 mb-4">
              Compare 2-3 trends side-by-side to see competitive positioning and market dynamics.
            </p>
            <Button onClick={() => compareTrends([trendId])}>
              Start Comparison
            </Button>
          </Card>

          {/* Competitive Landscape */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Competitive Landscape</h3>
            <p className="text-sm text-gray-600 mb-4">
              See similar trends, market positioning ranks, and lifecycle stage detection.
            </p>
            <Button onClick={() => fetchCompetitiveLandscape()}>
              Analyze Landscape
            </Button>
          </Card>

          {/* Cohort Analysis */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cohort Analysis</h3>
            <p className="text-sm text-gray-600 mb-4">
              Segment users by characteristics and see which segments engage with this trend.
            </p>
            <Button onClick={() => fetchCohortAnalysis()}>
              Load Cohorts
            </Button>
          </Card>
        </div>
      )}

      {/* Reports Tab - Feature 4 Reporting */}
      {activeSection === 'reports' && (
        <div className="space-y-6">
          <ReportGeneratorModal
            isOpen={reportModal}
            onClose={() => setReportModal(false)}
            trendIds={[trendId]}
            onGenerate={() => {
              // Handle report generation
            }}
          />

          <Button onClick={() => setReportModal(true)}>
            Generate New Report
          </Button>

          <ReportHistoryPanel />
          <ScheduledReportManager />
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingSpinner />}
    </div>
  );
}

/**
 * Usage in your app:
 * 
 * import CompleteTrendAnalyticsDashboard from '@/examples/features-4-5-example';
 * 
 * <CompleteTrendAnalyticsDashboard trendId="trend_123" />
 */
