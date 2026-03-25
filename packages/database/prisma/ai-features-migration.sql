-- MIGRATION: Add AI-Powered Features (Idea Generator & Trend Insights)
-- This migration adds new tables for:
-- 1. AI-Powered Idea Generator & Market Validator
-- 2. AI-Powered Trend Insights & Sentiment Analysis

-- Create generated_ideas table
CREATE TABLE IF NOT EXISTS "GeneratedIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trendId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetMarket" TEXT NOT NULL,
    "difficultScore" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "marketSize" TEXT NOT NULL,
    "competitionScore" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "viabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "recommendation" TEXT NOT NULL DEFAULT 'REVIEW',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GeneratedIdea_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend" ("id") ON DELETE CASCADE,
    CONSTRAINT "GeneratedIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Create idea_feedback table
CREATE TABLE IF NOT EXISTS "IdeaFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdeaFeedback_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "GeneratedIdea" ("id") ON DELETE CASCADE,
    CONSTRAINT "IdeaFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "IdeaFeedback_ideaId_userId_key" UNIQUE("ideaId", "userId")
);

-- Create trend_insights table
CREATE TABLE IF NOT EXISTS "TrendInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trendId" TEXT NOT NULL UNIQUE,
    "summary" TEXT NOT NULL,
    "drivers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "riskLevel" INTEGER NOT NULL DEFAULT 5,
    "industries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "impact" TEXT NOT NULL DEFAULT 'MEDIUM',
    "metadata" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrendInsight_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend" ("id") ON DELETE CASCADE
);

-- Create trend_sentiment table
CREATE TABLE IF NOT EXISTS "TrendSentiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trendId" TEXT NOT NULL,
    "positiveScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "negativeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "neutralScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TrendSentiment_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend" ("id") ON DELETE CASCADE
);

-- Create trend_sub_trends table
CREATE TABLE IF NOT EXISTS "TrendSubTrend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentTrendId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "mentions" INTEGER NOT NULL DEFAULT 0,
    "growth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrendSubTrend_parentTrendId_fkey" FOREIGN KEY ("parentTrendId") REFERENCES "Trend" ("id") ON DELETE CASCADE
);

-- Create trend_tags table
CREATE TABLE IF NOT EXISTS "TrendTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trendId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrendTag_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend" ("id") ON DELETE CASCADE,
    CONSTRAINT "TrendTag_trendId_tag_key" UNIQUE("trendId", "tag")
);

-- Create indexes
CREATE INDEX "GeneratedIdea_trendId_idx" ON "GeneratedIdea"("trendId");
CREATE INDEX "GeneratedIdea_userId_idx" ON "GeneratedIdea"("userId");
CREATE INDEX "GeneratedIdea_createdAt_idx" ON "GeneratedIdea"("createdAt");
CREATE INDEX "IdeaFeedback_ideaId_idx" ON "IdeaFeedback"("ideaId");
CREATE INDEX "IdeaFeedback_userId_idx" ON "IdeaFeedback"("userId");
CREATE INDEX "TrendInsight_trendId_idx" ON "TrendInsight"("trendId");
CREATE INDEX "TrendInsight_expiresAt_idx" ON "TrendInsight"("expiresAt");
CREATE INDEX "TrendSentiment_trendId_timestamp_idx" ON "TrendSentiment"("trendId", "timestamp");
CREATE INDEX "TrendSentiment_timestamp_idx" ON "TrendSentiment"("timestamp");
CREATE INDEX "TrendSubTrend_parentTrendId_idx" ON "TrendSubTrend"("parentTrendId");
CREATE INDEX "TrendTag_trendId_idx" ON "TrendTag"("trendId");
CREATE INDEX "TrendTag_category_idx" ON "TrendTag"("category");
