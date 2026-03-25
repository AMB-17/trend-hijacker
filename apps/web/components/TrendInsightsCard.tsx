import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { AlertCircle, TrendingUp, BookOpen, Tag, GitBranch } from 'lucide-react';

interface TrendInsightData {
  summary: string;
  drivers: string[];
  riskLevel: number;
  industries: string[];
  impact: string;
}

interface SentimentData {
  positiveScore: number;
  negativeScore: number;
  neutralScore: number;
  overallScore: number;
}

interface TagData {
  tag: string;
  category: string;
  confidence: number;
}

interface SubTrendData {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  growth: number;
}

interface TrendInsightsCardProps {
  insights: TrendInsightData | null;
  sentiment: SentimentData | null;
  tags: TagData[];
  subTrends: SubTrendData[];
  loading: boolean;
}

const getRiskColor = (riskLevel: number) => {
  if (riskLevel <= 3) return 'bg-green-100 text-green-800 border-green-300';
  if (riskLevel <= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

const getRiskBadge = (riskLevel: number) => {
  if (riskLevel <= 3) return 'Low Risk';
  if (riskLevel <= 6) return 'Medium Risk';
  return 'High Risk';
};

const getTagColor = (category: string) => {
  const colors: { [key: string]: string } = {
    industry: 'bg-blue-100 text-blue-800',
    difficulty: 'bg-orange-100 text-orange-800',
    market_size: 'bg-green-100 text-green-800',
    timeframe: 'bg-purple-100 text-purple-800',
    risk_level: 'bg-red-100 text-red-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
};

export const TrendInsightsCard: React.FC<TrendInsightsCardProps> = ({
  insights,
  sentiment,
  tags,
  subTrends,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sentiment' | 'tags' | 'subtends'>('overview');

  const sentimentData = sentiment
    ? [
        { name: 'Positive', value: Math.round(sentiment.positiveScore * 100) },
        { name: 'Neutral', value: Math.round(sentiment.neutralScore * 100) },
        { name: 'Negative', value: Math.round(sentiment.negativeScore * 100) },
      ]
    : [];

  const SENTIMENT_COLORS = ['#10b981', '#9ca3af', '#ef4444'];

  const growthData = subTrends.map(st => ({
    name: st.name,
    growth: Math.round(st.growth * 100),
  }));

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full"
          />
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-center">No insights available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Trend Insights</h2>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-1 ${getRiskColor(
              insights.riskLevel
            )}`}
          >
            <AlertCircle size={16} />
            {getRiskBadge(insights.riskLevel)} ({insights.riskLevel}/10)
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {['overview', 'sentiment', 'tags', 'subtends'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab === 'subtends' ? 'Sub-Trends' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
              <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
            </div>

            {/* Impact */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={20} className="text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Market Impact</h3>
              </div>
              <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                insights.impact === 'HIGH'
                  ? 'bg-red-100 text-red-800'
                  : insights.impact === 'MEDIUM'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {insights.impact} Impact
              </div>
            </div>

            {/* Key Drivers */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Drivers</h3>
              <ul className="space-y-2">
                {insights.drivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex-shrink-0 text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 pt-0.5">{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Industries */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Affected Industries</h3>
              <div className="flex flex-wrap gap-2">
                {insights.industries.map((industry, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'sentiment' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {sentiment ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sentiment Pie Chart */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sentimentData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sentiment Breakdown */}
                  <div className="flex flex-col justify-center space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-600 font-semibold">Positive</span>
                      <span className="text-2xl font-bold text-green-600">
                        {Math.round(sentiment.positiveScore * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${sentiment.positiveScore * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <span className="text-gray-600 font-semibold">Neutral</span>
                      <span className="text-2xl font-bold text-gray-600">
                        {Math.round(sentiment.neutralScore * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-500 h-2 rounded-full"
                        style={{ width: `${sentiment.neutralScore * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <span className="text-red-600 font-semibold">Negative</span>
                      <span className="text-2xl font-bold text-red-600">
                        {Math.round(sentiment.negativeScore * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${sentiment.negativeScore * 100}%` }}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Overall</span>
                        <span className={`text-lg font-bold ${
                          sentiment.overallScore > 0 ? 'text-green-600' : sentiment.overallScore < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {(sentiment.overallScore * 100).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No sentiment data available.</p>
            )}
          </motion.div>
        )}

        {activeTab === 'tags' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {tags.map((tag, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${getTagColor(tag.category)} flex items-center gap-2 cursor-default`}
                    title={`Confidence: ${(tag.confidence * 100).toFixed(0)}%`}
                  >
                    <Tag size={14} />
                    {tag.tag}
                    <span className="text-xs opacity-75">({(tag.confidence * 100).toFixed(0)}%)</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tags available.</p>
            )}
          </motion.div>
        )}

        {activeTab === 'subtends' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {subTrends.length > 0 ? (
              <div className="space-y-4">
                {growthData.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sub-Trend Growth</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={growthData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Bar dataKey="growth" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="space-y-3">
                  {subTrends.map((st, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1">
                          <GitBranch size={18} className="text-indigo-600 mt-1 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{st.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{st.description}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-indigo-600 flex-shrink-0">
                          +{Math.round(st.growth * 100)}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {st.keywords.map((kw, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No sub-trends detected yet.</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TrendInsightsCard;
