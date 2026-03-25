import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ThumbsUp, ThumbsDown, Copy, X, Zap } from 'lucide-react';

interface Idea {
  id: string;
  name: string;
  description: string;
  targetMarket: string;
  difficultScore: number;
  marketSize: string;
  competitionScore: number;
  viabilityScore: number;
  recommendation: string;
}

interface IdeaGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideas: Idea[];
  loading: boolean;
  onFeedback: (ideaId: string, rating: number, feedback?: string) => void;
}

export const IdeaGeneratorModal: React.FC<IdeaGeneratorModalProps> = ({
  isOpen,
  onClose,
  ideas,
  loading,
  onFeedback,
}) => {
  const [userFeedback, setUserFeedback] = useState<{
    [ideaId: string]: { rating: number; feedback: string };
  }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'GO':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'NO-GO':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'GO':
        return '✓';
      case 'NO-GO':
        return '✕';
      default:
        return '⚡';
    }
  };

  const getDifficultyColor = (score: number) => {
    if (score <= 3) return 'text-green-600';
    if (score <= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getViabilityColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleCopy = (ideaName: string, ideaId: string) => {
    const ideaText = `Idea: ${ideaName}\n\nGenerated from Trend Hijacker`;
    navigator.clipboard.writeText(ideaText);
    setCopiedId(ideaId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (ideaId: string, rating: number) => {
    const feedback = userFeedback[ideaId];
    onFeedback(ideaId, rating, feedback?.feedback);
    setUserFeedback({
      ...userFeedback,
      [ideaId]: { ...feedback, rating },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl z-50"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between border-b border-blue-700">
              <div className="flex items-center gap-2 text-white">
                <Lightbulb size={24} />
                <h2 className="text-2xl font-bold">AI-Generated Ideas</h2>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-1 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
                  />
                  <span className="ml-4 text-gray-600">Generating ideas...</span>
                </div>
              ) : ideas.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No ideas generated yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ideas.map((idea, index) => (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {idea.name}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded text-sm font-semibold flex items-center gap-1 ${getRecommendationColor(
                                idea.recommendation
                              )}`}
                            >
                              {getRecommendationIcon(idea.recommendation)}{' '}
                              {idea.recommendation}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {idea.description}
                          </p>
                          <p className="text-sm text-gray-500 mb-3">
                            <strong>Target Market:</strong> {idea.targetMarket}
                          </p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-600 uppercase font-semibold">
                            Difficulty
                          </p>
                          <p className={`text-lg font-bold ${getDifficultyColor(idea.difficultScore)}`}>
                            {idea.difficultScore}/10
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase font-semibold">
                            Market Size
                          </p>
                          <p className="text-lg font-bold text-blue-600 capitalize">
                            {idea.marketSize}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase font-semibold">
                            Competition
                          </p>
                          <p className="text-lg font-bold text-orange-600">
                            {idea.competitionScore}/10
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase font-semibold">
                            Viability
                          </p>
                          <p className={`text-lg font-bold ${getViabilityColor(idea.viabilityScore)}`}>
                            {(idea.viabilityScore * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(idea.name, idea.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700 transition"
                        >
                          <Copy size={16} />
                          {copiedId === idea.id ? 'Copied!' : 'Copy'}
                        </button>

                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={() => handleFeedback(idea.id, 5)}
                            className={`p-2 rounded transition ${
                              userFeedback[idea.id]?.rating === 5
                                ? 'bg-green-100 text-green-600'
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                            title="Great idea"
                          >
                            <ThumbsUp size={18} />
                          </button>
                          <button
                            onClick={() => handleFeedback(idea.id, 1)}
                            className={`p-2 rounded transition ${
                              userFeedback[idea.id]?.rating === 1
                                ? 'bg-red-100 text-red-600'
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                            title="Not interested"
                          >
                            <ThumbsDown size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default IdeaGeneratorModal;
