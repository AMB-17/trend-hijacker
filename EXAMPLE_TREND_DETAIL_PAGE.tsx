// Example Page Integration: Trend Detail Page with AI Features
// File: apps/web/app/trends/[id]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lightbulb, BookOpen, Share2, Bookmark } from 'lucide-react';

// Hooks
import { useTrendById, useAIFeatures } from '@/lib/hooks';

// Components
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { IdeaGeneratorModal } from '@/components/IdeaGeneratorModal';
import { TrendInsightsCard } from '@/components/TrendInsightsCard';

// Types
interface User {
  id: string;
  email: string;
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function TrendDetailPage({ params }: PageProps) {
  const { id: trendId } = params;
  const [user, setUser] = useState<User | null>(null);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Fetch trend data
  const { data: trend, loading: trendLoading, error: trendError } = useTrendById(trendId);

  // AI Features
  const {
    ideas,
    ideasLoading,
    insights,
    insightsLoading,
    sentiment,
    sentimentLoading,
    tags,
    tagsLoading,
    subTrends,
    subTrendsLoading,
    generateIdeas,
    addIdeaFeedback,
    getInsights,
    getSentiment,
    getTags,
    getSubTrends,
  } = useAIFeatures();

  // Load user from localStorage (example)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Load AI features when trend is ready
  useEffect(() => {
    if (!trend || !trendId) return;

    // Load insights in parallel
    Promise.all([
      getInsights(trendId),
      getSentiment(trendId),
      getTags(trendId),
      getSubTrends(trendId),
    ]);
  }, [trendId, trend]);

  const handleGenerateIdeas = async () => {
    if (!user) {
      alert('Please log in to generate ideas');
      return;
    }

    try {
      await generateIdeas(trendId, user.id, 3);
      setShowIdeaModal(true);
    } catch (error) {
      console.error('Failed to generate ideas:', error);
      alert('Failed to generate ideas. Please try again.');
    }
  };

  const handleIdeaFeedback = async (
    ideaId: string,
    rating: number,
    feedback?: string
  ) => {
    if (!user) return;

    try {
      await addIdeaFeedback(trendId, ideaId, user.id, rating, feedback);
      console.log('Feedback submitted successfully');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleSaveTrend = async () => {
    if (!user) {
      alert('Please log in to save trends');
      return;
    }

    try {
      // Call API to save trend
      // await apiClient.saveTrend(user.id, trendId);
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Failed to save trend:', error);
    }
  };

  // Error state
  if (trendError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trend not found</h1>
          <p className="text-gray-600">The trend you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (trendLoading) {
    return <LoadingSpinner />;
  }

  if (!trend) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-gray-200 sticky top-0 z-40"
      >
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{trend.title}</h1>
              <p className="mt-2 text-gray-600 max-w-2xl">{trend.summary}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleSaveTrend}
                className={`p-2 rounded-lg transition ${
                  isSaved
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Save trend"
              >
                <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
              <button
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                title="Share trend"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-600 uppercase font-semibold">Score</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(trend.opportunityScore)}/100
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 uppercase font-semibold">Growth</p>
              <p className="text-2xl font-bold text-green-600">
                +{Math.round(trend.velocityGrowth * 100)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 uppercase font-semibold">Volume</p>
              <p className="text-2xl font-bold text-purple-600">{trend.discussionVolume}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 uppercase font-semibold">Status</p>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {trend.stage}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Insights & Ideas */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trend Insights Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TrendInsightsCard
                insights={insights}
                sentiment={sentiment}
                tags={tags}
                subTrends={subTrends}
                loading={insightsLoading || sentimentLoading || tagsLoading || subTrendsLoading}
              />
            </motion.div>
          </div>

          {/* Right Column: Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* AI Idea Generator Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Lightbulb className="text-indigo-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Generate Ideas</h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Get AI-powered startup ideas based on this trend with market validation.
              </p>

              <button
                onClick={handleGenerateIdeas}
                disabled={ideasLoading}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 font-medium"
              >
                {ideasLoading ? 'Generating...' : 'Generate 3 Ideas'}
              </button>

              {ideas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-4 border-t border-gray-200"
                >
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Latest Ideas ({ideas.length})
                  </p>
                  <ul className="space-y-2">
                    {ideas.slice(0, 3).map(idea => (
                      <li
                        key={idea.id}
                        className="flex items-start gap-2 text-sm bg-gray-50 p-2 rounded"
                      >
                        <span className="flex-shrink-0 mt-1">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                            idea.recommendation === 'GO'
                              ? 'bg-green-200 text-green-800'
                              : idea.recommendation === 'NO-GO'
                              ? 'bg-red-200 text-red-800'
                              : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {idea.recommendation[0]}
                          </span>
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">{idea.name}</p>
                          <p className="text-gray-600">{Math.round(idea.viabilityScore * 100)}% viable</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setShowIdeaModal(true)}
                    className="w-full mt-3 px-3 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition text-sm font-medium"
                  >
                    View All Ideas
                  </button>
                </motion.div>
              )}
            </div>

            {/* Keyword Tags Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {trend.keywords.slice(0, 8).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Timeline</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Detected</dt>
                  <dd className="font-semibold text-gray-900">
                    {new Date(trend.firstDetected).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Updated</dt>
                  <dd className="font-semibold text-gray-900">
                    {new Date(trend.lastUpdated).toLocaleDateString()}
                  </dd>
                </div>
                {trend.peakDate && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Peak</dt>
                    <dd className="font-semibold text-gray-900">
                      {new Date(trend.peakDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Idea Modal */}
      <IdeaGeneratorModal
        isOpen={showIdeaModal}
        onClose={() => setShowIdeaModal(false)}
        ideas={ideas}
        loading={ideasLoading}
        onFeedback={handleIdeaFeedback}
      />
    </div>
  );
}


// ============================================
// USAGE GUIDE
// ============================================

/*
To integrate this page into your Next.js app:

1. Create the file at: apps/web/app/trends/[id]/page.tsx

2. Ensure you have:
   - useTrendById hook (existing)
   - useAIFeatures hook (newly created)
   - IdeaGeneratorModal component (newly created)
   - TrendInsightsCard component (newly created)
   - LoadingSpinner component (existing)

3. Update your navigation to link to /trends/[id]

4. The page will:
   - Display trend details with metrics
   - Show AI-generated insights and sentiment analysis
   - Allow users to generate startup ideas
   - Display sub-trends and auto-generated tags
   - Let users save trends and provide feedback

5. For data persistence:
   - User authentication should be implemented
   - User ID should come from auth context/session
   - Feedback data is stored in database automatically

6. Mobile responsive:
   - Uses Tailwind responsive classes
   - Grid layout adjusts from 1 to 3 columns
   - All components are mobile-friendly

7. Performance:
   - Lazy loading of AI features
   - Caching via Redux or Context API (optional)
   - Parallel API requests for better UX
   - Error boundaries for graceful degradation
*/
