import { query } from "../db";

export interface ProcessBatchInput {
  hoursBack?: number;
  maxTrends?: number;
  minMentions?: number;
}

export interface ProcessBatchResult {
  scannedDiscussions: number;
  createdTrends: number;
  processedAt: string;
}

interface DiscussionRow {
  id: string;
  title: string | null;
  content: string | null;
  created_at: Date;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "have",
  "your",
  "about",
  "into",
  "just",
  "what",
  "when",
  "where",
  "which",
  "they",
  "them",
  "their",
  "there",
  "then",
  "than",
  "also",
  "been",
  "would",
  "could",
  "should",
  "http",
  "https",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(token => token.length >= 4 && token.length <= 30 && !STOP_WORDS.has(token));
}

function scoreFromMentions(mentions: number, maxMentions: number): number {
  if (maxMentions <= 0) return 0;
  const normalized = mentions / maxMentions;
  return Math.round(normalized * 100);
}

async function fetchRecentDiscussions(hoursBack: number): Promise<DiscussionRow[]> {
  const result = await query<DiscussionRow>(
    `SELECT id, title, content, created_at
     FROM discussions
     WHERE created_at > NOW() - ($1::text || ' hours')::interval
     ORDER BY created_at DESC
     LIMIT 2000`,
    [hoursBack]
  );

  return result.rows;
}

async function trendExistsRecently(title: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count
     FROM trends
     WHERE lower(title) = lower($1)
       AND created_at > NOW() - INTERVAL '3 days'`,
    [title]
  );

  return Number(result.rows[0]?.count ?? "0") > 0;
}

async function createTrend(title: string, mentionCount: number, discussionIds: string[], maxMentions: number): Promise<boolean> {
  const alreadyExists = await trendExistsRecently(title);
  if (alreadyExists) {
    return false;
  }

  const opportunityScore = scoreFromMentions(mentionCount, maxMentions);
  const velocityScore = Math.max(0.05, Math.min(0.95, mentionCount / Math.max(mentionCount + 5, 12)));
  const problemIntensity = Math.max(0.1, Math.min(0.9, opportunityScore / 120));
  const noveltyScore = Math.max(0.1, Math.min(0.9, 1 - mentionCount / Math.max(maxMentions * 1.5, 1)));
  const status = opportunityScore >= 75 ? "growing" : opportunityScore >= 45 ? "emerging" : "stable";

  const trendInsert = await query<{ id: string }>(
    `INSERT INTO trends (
      title,
      summary,
      opportunity_score,
      velocity_score,
      problem_intensity,
      novelty_score,
      discussion_count,
      source_count,
      status,
      category,
      suggested_ideas,
      market_potential_estimate
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING id`,
    [
      title,
      `Topic cluster for '${title}' detected in recent discussions.`,
      opportunityScore,
      velocityScore,
      problemIntensity,
      noveltyScore,
      mentionCount,
      1,
      status,
      "General",
      [`Build tools for ${title}`, `Create content around ${title}`],
      opportunityScore >= 70 ? "high" : opportunityScore >= 40 ? "medium" : "low",
    ]
  );

  const trendId = trendInsert.rows[0]?.id;
  if (!trendId) {
    return false;
  }

  for (const discussionId of discussionIds.slice(0, 50)) {
    await query(
      `INSERT INTO trend_discussions (trend_id, discussion_id, relevance_score)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [trendId, discussionId, 0.8]
    );
  }

  return true;
}

export async function runProcessingBatch(input: ProcessBatchInput = {}): Promise<ProcessBatchResult> {
  const hoursBack = Math.min(Math.max(input.hoursBack ?? 24, 1), 168);
  const maxTrends = Math.min(Math.max(input.maxTrends ?? 15, 1), 50);
  const minMentions = Math.min(Math.max(input.minMentions ?? 4, 2), 20);

  const discussions = await fetchRecentDiscussions(hoursBack);
  const tokenMap = new Map<string, Set<string>>();

  for (const discussion of discussions) {
    const text = `${discussion.title ?? ""} ${discussion.content ?? ""}`;
    const tokens = tokenize(text);
    for (const token of tokens) {
      if (!tokenMap.has(token)) {
        tokenMap.set(token, new Set<string>());
      }
      tokenMap.get(token)?.add(discussion.id);
    }
  }

  const rankedTopics = Array.from(tokenMap.entries())
    .map(([token, ids]) => ({ token, ids: Array.from(ids), mentions: ids.size }))
    .filter(item => item.mentions >= minMentions)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, maxTrends);

  const maxMentions = rankedTopics[0]?.mentions ?? 1;
  let createdTrends = 0;

  for (const topic of rankedTopics) {
    const created = await createTrend(topic.token, topic.mentions, topic.ids, maxMentions);
    if (created) {
      createdTrends += 1;
    }
  }

  return {
    scannedDiscussions: discussions.length,
    createdTrends,
    processedAt: new Date().toISOString(),
  };
}
