/**
 * Trend Detection Engine
 * Analyzes discussions and detects trending opportunities
 */

import {
  detectPainPoints,
  detectQuestions,
  calculateSentiment,
  extractKeywords,
  extractNgrams,
} from '@packages/nlp';
import {
  calculateOpportunityScore,
  calculateVelocity,
  calculateAcceleration,
  normalizeMentionCount,
  calculateNoveltyScore,
  calculateProblemIntensity,
  isEarlySignal,
  estimateMarketPotential,
} from '@packages/scoring';

export interface DiscussionAnalysis {
  discussionId: string;
  painPoints: string[];
  questions: string[];
  keywords: string[];
  sentiment: number;
  problems: string[];
}

export interface TrendCandidate {
  title: string;
  summary: string;
  opportunityScore: number;
  velocityScore: number;
  problemIntensity: number;
  noveltyScore: number;
  discussionCount: number;
  status: 'emerging' | 'growing' | 'peak' | 'declining' | 'stable';
  category?: string;
  suggestedIdeas: string[];
  marketPotential: string;
  isEarlySignal: boolean;
}

/**
 * Analyze individual discussion
 */
export function analyzeDiscussion(discussion: {
  title?: string;
  content: string;
  createdAt: Date;
}): DiscussionAnalysis {
  const text = (discussion.title || '') + ' ' + discussion.content;

  const painPoints = detectPainPoints(text);
  const questions = detectQuestions(text);
  const keywords = extractKeywords(text, { maxKeywords: 8 });
  const sentiment = calculateSentiment(text);

  return {
    discussionId: '',
    painPoints: painPoints.slice(0, 5),
    questions: questions.slice(0, 5),
    keywords,
    sentiment,
    problems: [...painPoints, ...questions].slice(0, 10),
  };
}

/**
 * Detect trends from keyword clusters
 */
export function detectTrendsFromKeywords(
  discussions: any[],
  minOccurrences: number = 3
): Map<string, { count: number; discussions: any[] }> {
  const keywordClusters = new Map<string, { count: number; discussions: any[] }>();

  for (const discussion of discussions) {
    const analysis = analyzeDiscussion(discussion);

    for (const keyword of analysis.keywords) {
      if (!keywordClusters.has(keyword)) {
        keywordClusters.set(keyword, { count: 0, discussions: [] });
      }

      const cluster = keywordClusters.get(keyword)!;
      cluster.count += 1;
      cluster.discussions.push(discussion);
    }
  }

  // Filter by minimum occurrences
  const filtered = new Map<string, { count: number; discussions: any[] }>();
  for (const [keyword, data] of keywordClusters.entries()) {
    if (data.count >= minOccurrences) {
      filtered.set(keyword, data);
    }
  }

  return filtered;
}

/**
 * Detect phrase/topic clusters
 */
export function detectPhraseClusters(
  discussions: any[],
  minOccurrences: number = 2
): Map<string, { count: number; intensity: number; discussions: any[] }> {
  const phraseClusters = new Map<string, { count: number; intensity: number; discussions: any[] }>();

  for (const discussion of discussions) {
    const text = (discussion.title || '') + ' ' + discussion.content;
    const phrases = extractNgrams(text, 2, { maxPhrases: 5 });
    const painPoints = detectPainPoints(text);

    for (const phrase of phrases) {
      if (!phraseClusters.has(phrase)) {
        phraseClusters.set(phrase, { count: 0, intensity: 0, discussions: [] });
      }

      const cluster = phraseClusters.get(phrase)!;
      cluster.count += 1;

      // Boost intensity if pain point mentioned
      if (painPoints.length > 0) {
        cluster.intensity += calculateSentiment(text);
      }

      cluster.discussions.push(discussion);
    }
  }

  // Filter by minimum occurrences
  const filtered = new Map<string, { count: number; intensity: number; discussions: any[] }>();
  for (const [phrase, data] of phraseClusters.entries()) {
    if (data.count >= minOccurrences) {
      filtered.set(phrase, data);
    }
  }

  return filtered;
}

/**
 * Convert cluster to trend candidate
 */
export function clusterToTrendCandidate(
  topic: string,
  clusterData: { count: number; intensity?: number; discussions: any[] }
): TrendCandidate {
  const { count, intensity = 0, discussions } = clusterData;

  // Analyze all discussions for this cluster
  const analyses = discussions.map(d => analyzeDiscussion(d));

  // Calculate metrics
  const avgSentiment = analyses.reduce((a, b) => a + b.sentiment, 0) / analyses.length;
  const painPointCount = analyses.reduce((a, b) => a + b.painPoints.length, 0);

  // Scoring inputs
  const velocityGrowth = calculateVelocity(discussions.map(() => 1)); // Simplified
  const problemIntensity = calculateProblemIntensity(
    discussions.map(d => ({
      text: (d.title || '') + ' ' + d.content,
      sentiment: calculateSentiment((d.title || '') + ' ' + d.content),
    })),
    painPointCount
  );
  const discussionVolume = normalizeMentionCount(count, 100);
  const noveltyScore = calculateNoveltyScore(
    discussions[0]?.createdAt || new Date(),
    new Date()
  );

  // Get opportunity score
  const scoring = calculateOpportunityScore({
    velocityGrowth,
    problemIntensity,
    discussionVolume,
    noveltyScore,
  });

  // Determine trend status
  const velocity = calculateVelocity(discussions.map(() => 1));
  const status: TrendCandidate['status'] = velocity > 0.7 ? 'growing' : velocity > 0.3 ? 'emerging' : 'stable';

  // Generate suggested ideas
  const suggestedIdeas = generateIdeas(topic, problemIntensity, discussions);

  // Market potential
  const marketPotential = estimateMarketPotential(count, problemIntensity);

  // Check if early signal
  const ageInDays = (new Date().getTime() - (discussions[0]?.createdAt?.getTime() || 0)) / (1000 * 60 * 60 * 24);
  const acceleration = calculateAcceleration(discussions.map(() => 1));

  const isEarlySignalFlag = isEarlySignal({
    ageInDays,
    velocity,
    acceleration,
    discussionCount: count,
  });

  return {
    title: topic,
    summary: generateSummary(topic, problemIntensity, count),
    opportunityScore: scoring.opportunityScore,
    velocityScore: velocity,
    problemIntensity,
    noveltyScore,
    discussionCount: count,
    status,
    category: categorize(topic),
    suggestedIdeas,
    marketPotential,
    isEarlySignal: isEarlySignalFlag,
  };
}

/**
 * Generate summary for trend
 */
function generateSummary(topic: string, intensity: number, count: number): string {
  let intensity_desc = 'moderate';
  if (intensity > 0.7) intensity_desc = 'strong';
  else if (intensity < 0.3) intensity_desc = 'mild';

  return `"${topic}" is showing ${intensity_desc} signals across ${count} discussions. The topic involves ${intensity > 0.5 ? 'significant pain points' : 'emerging interest'} and represents a potential business opportunity.`;
}

/**
 * Generate business ideas
 */
function generateIdeas(topic: string, intensity: number, discussions: any[]): string[] {
  const ideas: string[] = [];

  if (intensity > 0.6) {
    ideas.push(`SaaS solution addressing ${topic}`);
    ideas.push(`AI-powered tool for ${topic}`);
  }

  ideas.push(`Content series about ${topic}`);
  ideas.push(`Consulting service for ${topic}`);
  ideas.push(`Community forum for ${topic} enthusiasts`);

  return ideas.slice(0, 5);
}

/**
 * Categorize topic
 */
function categorize(topic: string): string {
  const topicLower = topic.toLowerCase();

  if (topicLower.includes('ai') || topicLower.includes('ml') || topicLower.includes('automation')) {
    return 'AI/Automation';
  } else if (topicLower.includes('crypto') || topicLower.includes('blockchain') || topicLower.includes('web3')) {
    return 'Web3/Crypto';
  } else if (topicLower.includes('data') || topicLower.includes('analytics')) {
    return 'Data/Analytics';
  } else if (topicLower.includes('dev') || topicLower.includes('code') || topicLower.includes('api')) {
    return 'Developer Tools';
  } else if (topicLower.includes('design') || topicLower.includes('ux') || topicLower.includes('ui')) {
    return 'Design/UX';
  } else if (topicLower.includes('market') || topicLower.includes('sales') || topicLower.includes('growth')) {
    return 'Marketing/Growth';
  } else if (topicLower.includes('health') || topicLower.includes('fitness') || topicLower.includes('wellness')) {
    return 'Health/Wellness';
  } else if (topicLower.includes('productivity') || topicLower.includes('remote') || topicLower.includes('work')) {
    return 'Productivity/Work';
  }

  return 'Other';
}

/**
 * Main trend detection pipeline
 */
export function detectTrends(discussions: any[]): TrendCandidate[] {
  console.log(`🔍 Analyzing ${discussions.length} discussions...`);

  // Detect phrase clusters (more reliable than keywords)
  const phraseClusters = detectPhraseClusters(discussions, 2);

  // Convert to trend candidates
  const candidates: TrendCandidate[] = [];
  for (const [phrase, data] of phraseClusters.entries()) {
    try {
      const candidate = clusterToTrendCandidate(phrase, data);
      if (candidate.opportunityScore > 10 && candidate.discussionCount >= 2) {
        candidates.push(candidate);
      }
    } catch (error) {
      console.error(`Error processing phrase "${phrase}":`, error);
    }
  }

  // Sort by opportunity score
  candidates.sort((a, b) => b.opportunityScore - a.opportunityScore);

  console.log(`✅ Detected ${candidates.length} trend candidates`);
  return candidates;
}
