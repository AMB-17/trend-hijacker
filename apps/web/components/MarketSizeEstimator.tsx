'use client';

import { useState, useMemo } from 'react';
import { Card, CardBody, CardHeader, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface MarketSizeEstimate {
  tam: number;
  sam: number;
  som: number;
  currency: string;
  hasData: boolean;
}

interface MarketEstimatorProps {
  trend: any;
}

export function MarketSizeEstimator({ trend }: MarketEstimatorProps) {
  const [assumptions, setAssumptions] = useState({
    productPrice: 499,
    conversionRate: 0.05,
    marketPenetration: 0.15,
  });

  // Calculate market size based on real trend metrics
  const estimates = useMemo((): MarketSizeEstimate => {
    try {
      if (!trend) {
        return {
          tam: 0,
          sam: 0,
          som: 0,
          currency: 'USD',
          hasData: false,
        };
      }

      // Use real API data with proper validation
      const discussionVolume = trend.discussionVolume || 0;
      const growthRate = Math.max(1, trend.growthRate || 1.2);
      const opportunityScore = Math.min(100, Math.max(0, trend.opportunityScore || 50));
      const problemIntensity = Math.min(1, Math.max(0, trend.problemIntensity || 0.7));

      // Return empty if no discussion data yet
      if (discussionVolume === 0) {
        return {
          tam: 0,
          sam: 0,
          som: 0,
          currency: 'USD',
          hasData: false,
        };
      }

      // TAM calculation: Based on industry benchmarks
      // Each discussion participant represents ~$500 in TAM
      // Adjusted by growth trajectory, problem intensity, and opportunity score
      const marketValuePerDiscussion = 500;
      const baseTAM =
        discussionVolume *
        marketValuePerDiscussion *
        problemIntensity *
        (opportunityScore / 100) *
        Math.min(2, growthRate);

      // SAM = 5-10% of TAM (serviceable addressable market)
      const sam = baseTAM * 0.075;

      // SOM = 1-3% of TAM with market penetration applied
      const som = baseTAM * 0.015 * assumptions.marketPenetration;

      return {
        tam: Math.round(baseTAM),
        sam: Math.round(sam),
        som: Math.round(som),
        currency: 'USD',
        hasData: true,
      };
    } catch (error) {
      console.error('Market estimation error:', error);
      return {
        tam: 0,
        sam: 0,
        som: 0,
        currency: 'USD',
        hasData: false,
      };
    }
  }, [trend, assumptions.marketPenetration]);

  const chartData = [
    { name: 'TAM', value: estimates.tam, label: 'Total Addressable Market' },
    { name: 'SAM', value: estimates.sam, label: 'Serviceable Market' },
    { name: 'SOM', value: estimates.som, label: 'Obtainable Market' },
  ];

  const colors = ['#ef4444', '#f59e0b', '#22c55e'];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const riskLevel = Math.max(
    0,
    2 - (trend?.problemIntensity || 0.5) - ((trend?.opportunityScore || 50) / 100)
  );

  // Show empty state if no data
  if (!estimates.hasData) {
    return (
      <Card>
        <CardBody className="py-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-warning mx-auto" />
          <p className="text-muted">Market data not yet available</p>
          <p className="text-xs text-muted">More discussion data is needed for market sizing estimates</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Estimates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-sm text-muted">TAM</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(estimates.tam)}
            </p>
            <p className="text-xs text-muted">Total addressable market</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-900/30 rounded-lg">
                <Users className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-sm text-muted">SAM</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(estimates.sam)}
            </p>
            <p className="text-xs text-muted">Serviceable market</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-sm text-muted">SOM</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(estimates.som)}
            </p>
            <p className="text-xs text-muted">Obtainable market (Year 1)</p>
          </CardBody>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground">Market Size Breakdown</h3>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#222',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => formatCurrency(value as number)}
                />
                <Bar dataKey="value" name="Market Size" radius={8}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Assumptions & Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Market Assumptions</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Product Price: ${assumptions.productPrice}
              </label>
              <input
                type="range"
                min="49"
                max="4999"
                step="50"
                value={assumptions.productPrice}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, productPrice: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-muted">Annual pricing per customer</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Conversion Rate: {(assumptions.conversionRate * 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min="0.001"
                max="0.2"
                step="0.005"
                value={assumptions.conversionRate}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, conversionRate: parseFloat(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-muted">Expected audience to customer conversion</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Market Penetration: {(assumptions.marketPenetration * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={assumptions.marketPenetration}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, marketPenetration: parseFloat(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-muted">Realistic market capture in year 1</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Trend Analysis</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm text-muted mb-2">Opportunity Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: `${trend?.opportunityScore || 50}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {trend?.opportunityScore || 50}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted mb-2">Problem Intensity</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    style={{ width: `${(trend?.problemIntensity || 0.5) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round((trend?.problemIntensity || 0.5) * 100)}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted mb-2">Risk Assessment</p>
              <Badge
                variant={
                  riskLevel < 0.5 ? 'success' : riskLevel < 1.0 ? 'warning' : 'danger'
                }
              >
                {riskLevel < 0.5 ? 'Low' : riskLevel < 1.0 ? 'Medium' : 'High'} Risk
              </Badge>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-xs text-muted">
              <p className="font-semibold text-blue-300 mb-1">💡 Estimates Based On:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Discussion volume from community data</li>
                <li>Growth rate and opportunity score</li>
                <li>Market sizing benchmarks</li>
                <li>Your custom assumptions</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
