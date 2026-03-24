import { query } from "../db";
import { queries } from "../schema";

type DiscussionSource = "reddit" | "hackernews" | "producthunt" | "indiehackers" | "rss";

export interface IngestionDiscussion {
  source: DiscussionSource;
  sourceId: string;
  url: string;
  title?: string;
  content: string;
  author?: string;
  upvotes: number;
  commentsCount: number;
  createdAt: Date;
}

export interface IngestionBatchInput {
  sources?: DiscussionSource[];
  limitPerSource?: number;
}

export interface IngestionBatchResult {
  totalImported: number;
  sourceBreakdown: Record<DiscussionSource, number>;
  discussionSourceIds: string[];
}

const DEFAULT_SOURCES: DiscussionSource[] = ["reddit", "hackernews", "rss"];

function sanitizeText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 5000);
}

async function scrapeReddit(limitPerSource: number): Promise<IngestionDiscussion[]> {
  const subreddits = ["startup", "SaaS", "Entrepreneur", "productmanagement", "webdev"];
  const discussions: IngestionDiscussion[] = [];

  for (const subreddit of subreddits) {
    if (discussions.length >= limitPerSource) break;

    const response = await fetch(`https://www.reddit.com/r/${subreddit}/new.json?limit=30`, {
      headers: {
        "User-Agent": "TrendHijackerBatch/1.0",
      },
    });

    if (!response.ok) {
      continue;
    }

    const data: unknown = await response.json();
    const posts = (data as { data?: { children?: Array<{ data: Record<string, unknown> }> } }).data?.children ?? [];

    for (const post of posts) {
      if (discussions.length >= limitPerSource) break;

      const postData = post.data;
      const id = String(postData.id ?? "");
      if (!id) continue;

      const title = sanitizeText(String(postData.title ?? ""), "Untitled Reddit Post");
      const selfText = sanitizeText(String(postData.selftext ?? ""), title);
      const permalink = String(postData.permalink ?? "");

      discussions.push({
        source: "reddit",
        sourceId: `reddit_${id}`,
        url: permalink ? `https://reddit.com${permalink}` : `https://reddit.com/comments/${id}`,
        title,
        content: selfText,
        author: postData.author ? String(postData.author) : undefined,
        upvotes: Number(postData.score ?? 0),
        commentsCount: Number(postData.num_comments ?? 0),
        createdAt: new Date(Number(postData.created_utc ?? Date.now() / 1000) * 1000),
      });
    }
  }

  return discussions;
}

async function scrapeHackerNews(limitPerSource: number): Promise<IngestionDiscussion[]> {
  const discussions: IngestionDiscussion[] = [];
  const listResponse = await fetch("https://hacker-news.firebaseio.com/v0/newstories.json");

  if (!listResponse.ok) {
    return discussions;
  }

  const storyIds: unknown = await listResponse.json();
  const ids = Array.isArray(storyIds) ? storyIds.slice(0, limitPerSource) : [];

  for (const rawId of ids) {
    const id = String(rawId);
    const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);

    if (!storyResponse.ok) continue;

    const story: unknown = await storyResponse.json();
    const storyData = story as Record<string, unknown>;
    if (!storyData.id) continue;

    const title = sanitizeText(String(storyData.title ?? ""), "Untitled Hacker News Story");
    const url = storyData.url
      ? String(storyData.url)
      : `https://news.ycombinator.com/item?id=${String(storyData.id)}`;

    discussions.push({
      source: "hackernews",
      sourceId: `hn_${String(storyData.id)}`,
      url,
      title,
      content: title,
      author: storyData.by ? String(storyData.by) : undefined,
      upvotes: Number(storyData.score ?? 0),
      commentsCount: Number(storyData.descendants ?? 0),
      createdAt: new Date(Number(storyData.time ?? Date.now() / 1000) * 1000),
    });
  }

  return discussions;
}

async function scrapeRss(limitPerSource: number): Promise<IngestionDiscussion[]> {
  const feedUrls = [
    "https://news.ycombinator.com/rss",
    "https://feeds.techcrunch.com/techcrunch/",
    "https://www.producthunt.com/feed.rss",
  ];
  const discussions: IngestionDiscussion[] = [];

  for (const feedUrl of feedUrls) {
    if (discussions.length >= limitPerSource) break;

    const response = await fetch(feedUrl);
    if (!response.ok) continue;

    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    for (const item of items) {
      if (discussions.length >= limitPerSource) break;

      const titleMatch = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(item);
      const linkMatch = /<link>(.*?)<\/link>/.exec(item);
      if (!titleMatch || !linkMatch) continue;

      const title = sanitizeText(titleMatch[1] || titleMatch[2], "Untitled RSS Item");
      const link = String(linkMatch[1]);

      discussions.push({
        source: "rss",
        sourceId: `rss_${Buffer.from(link).toString("base64").slice(0, 24)}`,
        url: link,
        title,
        content: title,
        upvotes: 0,
        commentsCount: 0,
        createdAt: new Date(),
      });
    }
  }

  return discussions;
}

async function scrapeProductHunt(limitPerSource: number): Promise<IngestionDiscussion[]> {
  // Product Hunt API requires authentication - check for API key
  const apiKey = process.env.PRODUCTHUNT_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.warn('PRODUCTHUNT_API_KEY not set, skipping Product Hunt scraping');
    return [];
  }

  const discussions: IngestionDiscussion[] = [];

  try {
    const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            posts(first: ${limitPerSource}, order: VOTES) {
              edges {
                node {
                  id
                  name
                  tagline
                  description
                  votesCount
                  commentsCount
                  createdAt
                  url
                }
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      console.error(`Product Hunt API error: ${response.status}`);
      return discussions;
    }

    const data: unknown = await response.json();
    const dataObj = data as { data?: { posts?: { edges?: Array<{ node: Record<string, unknown> }> } } };
    const posts = dataObj.data?.posts?.edges ?? [];

    for (const edge of posts) {
      const node = edge.node;
      const id = String(node.id ?? '');
      if (!id) continue;

      const title = sanitizeText(String(node.name ?? ''), 'Untitled Product Hunt Post');
      const description = sanitizeText(String(node.description ?? node.tagline ?? ''), title);
      const url = String(node.url ?? `https://www.producthunt.com/posts/${id}`);

      discussions.push({
        source: 'producthunt',
        sourceId: `ph_${id}`,
        url,
        title,
        content: description,
        upvotes: Number(node.votesCount ?? 0),
        commentsCount: Number(node.commentsCount ?? 0),
        createdAt: new Date(String(node.createdAt ?? new Date().toISOString())),
      });
    }

    console.log(`Scraped ${discussions.length} posts from Product Hunt`);
    return discussions;
  } catch (error) {
    console.error('Error scraping Product Hunt:', error);
    return discussions;
  }
}

async function scrapeIndieHackers(limitPerSource: number): Promise<IngestionDiscussion[]> {
  const discussions: IngestionDiscussion[] = [];

  try {
    // Indie Hackers doesn't have an official API, but we can scrape their public endpoint
    const response = await fetch(
      `https://www.indiehackers.com/api/posts?limit=${limitPerSource}`,
      {
        headers: {
          'User-Agent': 'TrendHijackerBatch/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error(`Indie Hackers scraping error: ${response.status}`);
      return discussions;
    }

    const data: unknown = await response.json();
    const dataObj = data as { posts?: Array<Record<string, unknown>> };
    const posts = dataObj.posts ?? [];

    for (const post of posts) {
      const id = String(post.id ?? '');
      if (!id) continue;

      const title = sanitizeText(String(post.title ?? ''), 'Untitled Indie Hackers Post');
      const content = sanitizeText(String(post.body ?? ''), title);
      const slug = String(post.slug ?? id);
      const url = `https://www.indiehackers.com/post/${slug}`;

      discussions.push({
        source: 'indiehackers',
        sourceId: `ih_${id}`,
        url,
        title,
        content,
        author: post.author && typeof post.author === 'object'
          ? String((post.author as Record<string, unknown>).username ?? '')
          : undefined,
        upvotes: Number(post.votes ?? 0),
        commentsCount: Number(post.comment_count ?? 0),
        createdAt: new Date(String(post.created_at ?? new Date().toISOString())),
      });
    }

    console.log(`Scraped ${discussions.length} posts from Indie Hackers`);
    return discussions;
  } catch (error) {
    console.error('Error scraping Indie Hackers:', error);
    return discussions;
  }
}

async function scrapeSource(source: DiscussionSource, limitPerSource: number): Promise<IngestionDiscussion[]> {
  switch (source) {
    case "reddit":
      return scrapeReddit(limitPerSource);
    case "hackernews":
      return scrapeHackerNews(limitPerSource);
    case "rss":
      return scrapeRss(limitPerSource);
    case "producthunt":
      return scrapeProductHunt(limitPerSource);
    case "indiehackers":
      return scrapeIndieHackers(limitPerSource);
    default:
      return [];
  }
}

async function importDiscussion(discussion: IngestionDiscussion): Promise<void> {
  await query(queries.discussions.import, [
    discussion.source,
    discussion.sourceId,
    discussion.url,
    discussion.title ?? null,
    discussion.content,
    discussion.author ?? null,
    discussion.upvotes,
    discussion.commentsCount,
    discussion.createdAt,
  ]);
}

export async function runIngestionBatch(input: IngestionBatchInput = {}): Promise<IngestionBatchResult> {
  const limitPerSource = Math.min(Math.max(input.limitPerSource ?? 30, 5), 100);
  const requestedSources = input.sources && input.sources.length > 0 ? input.sources : DEFAULT_SOURCES;
  const uniqueSources = Array.from(new Set(requestedSources)) as DiscussionSource[];

  const sourceBreakdown: Record<DiscussionSource, number> = {
    reddit: 0,
    hackernews: 0,
    producthunt: 0,
    indiehackers: 0,
    rss: 0,
  };

  const allDiscussions: IngestionDiscussion[] = [];
  for (const source of uniqueSources) {
    const discussions = await scrapeSource(source, limitPerSource);
    sourceBreakdown[source] = discussions.length;
    allDiscussions.push(...discussions);
  }

  for (const discussion of allDiscussions) {
    await importDiscussion(discussion);
  }

  return {
    totalImported: allDiscussions.length,
    sourceBreakdown,
    discussionSourceIds: allDiscussions.map(item => item.sourceId),
  };
}
