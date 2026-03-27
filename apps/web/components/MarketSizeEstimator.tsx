'use client';

import { useState, useMemo } from 'react';
import { Card, CardBody, CardHeader, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Users, Zap, TrendingUp } from 'lucide-react';

interface MarketSizeEstimate {
  tam: number; // Total Addressable Market
  sam: number; // Serviceable Addressable Market
  som: number; // Serviceable Obtainable Market
  currency: string;
}

interface MarketEstimatorProps {
  trend: any;
}

export function MarketSizeEstimator({ trend }: MarketEstimatorProps) {
  const [assumptions, setAssumptions] = useState({
    productPrice: 99,
    conversionRate: 0.02, // 2%
    marketMultiplier: 1,
  });

  // Calculate market size based on trend metrics
  const estimates = useMemo((): MarketSizeEstimate => {
    const {
      discussionVolume = 1000,
      growthRate = 1.5,
      opportunityScore = 50,
      problemIntensity = 0.7,
    } = trend;

    // Base market sizing formula
    // TAM = All people who could benefit from the solution
    const baseTAM =
      discussionVolume * 50 * problemIntensity * (opportunityScore / 100) * assumptions.marketMultiplier;

    // SAM = Realistic subset that can be reached
    const sam = baseTAM * 0.3; // 30% of TAM is realistic market

    // SOM = What we can realistically capture
    const som = sam * assumptions.conversionRate;

    // Annual revenue potential
    const annualRevenue = som * assumptions.productPrice;

    return {
      tam: Math.round(annualRevenue * 10),
      sam: Math.round(annualRevenue * 5),
      som: Math.round(annualRevenue),
      currency: 'USD',
    };
  }, [trend, assumptions]);

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
    2 - (trend.problemIntensity || 0.5) - (trend.opportunityScore || 50) / 100
  );

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
            <h3 className="font-semibold text-foreground">Assumptions</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Product Price: ${assumptions.productPrice}
              </label>
              <input
                type="range"
                min="9"
                max="999"
                step="10"
                value={assumptions.productPrice}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, productPrice: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-muted">Set your estimated annual product price</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Conversion Rate: {(assumptions.conversionRate * 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.005"
                value={assumptions.conversionRate}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, conversionRate: parseFloat(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-muted">Expected conversion from audience to customers</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-foreground">Market Analysis</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm text-muted mb-2">Market Maturity</p>
              <div className="flex gap-2">
                {['Early', 'Growing', 'Mature'].map((stage, idx) => (
                  <Badge
                    key={idx}
                    variant={
                      (trend.stage === 'early_signal' && idx === 0) ||
                      (trend.stage === 'emerging' && idx === 1) ||
                      (trend.stage === 'mature' && idx === 2)
                        ? 'primary'
                        : 'default'
                    }
                  >
                    {stage}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted mb-2">Problem Intensity</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    style={{ width: `${(trend.problemIntensity || 0.5) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round((trend.problemIntensity || 0.5) * 100)}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted mb-2">Risk Level</p>
              <Badge variant={riskLevel < 0.5 ? 'success' : riskLevel < 1.0 ? 'warning' : 'danger'}>
                {riskLevel < 0.5 ? 'Low' : riskLevel < 1.0 ? 'Medium' : 'High'} Risk
              </Badge>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-xs text-muted">
              <p className="font-semibold text-blue-300 mb-1">💡 Tip</p>
              <p>
                These estimates are based on discussion volume and trend metrics. Adjust assumptions
                based on your specific market research.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
