/**
 * Multi-source scraper for TREND HIJACKER
 * Handles Reddit, Hacker News, Product Hunt, Indie Hackers, RSS feeds
 */

import fetch from 'node-fetch';
import { normalizeText, extractKeywords, isLikelySpam } from '@packages/nlp';

export interface ScrapedDiscussion {
  source: 'reddit' | 'hackernews' | 'producthunt' | 'indiehackers' | 'rss';
  sourceId: string;
  url: string;
  title?: string;
  content: string;
  author?: string;
  upvotes: number;
  commentsCount: number;
  createdAt: Date;
}

const RATE_LIMITS = {
  reddit: { delay: 2000, requestsPerHour: 1000 },
  hackernews: { delay: 1000, requestsPerHour: 3000 },
  producthunt: { delay: 1000, requestsPerHour: 1000 },
  indiehackers: { delay: 2000, requestsPerHour: 500 },
  rss: { delay: 500, requestsPerHour: 5000 },
};

/**
 * Reddit Scraper
 */
export class RedditScraper {
  private lastRequest = 0;
  private readonly delay = RATE_LIMITS.reddit.delay;

  async scrape(subreddits: string[] = ['startup', 'webdev', 'SaaS', 'Entrepreneur', 'productmanagement']): Promise<ScrapedDiscussion[]> {
    const discussions: ScrapedDiscussion[] = [];

    for (const subreddit of subreddits) {
      try {
        await this.throttle();
        const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=100`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TrendHijacker/1.0 (Learning Bot)',
          },
        });

        if (!response.ok) continue;

        const data = (await response.json()) as any;

        if (!data.data?.children) continue;

        for (const post of data.data.children) {
          const { data: postData } = post;

          if (isLikelySpam(postData.title + ' ' + postData.selftext)) continue;

          discussions.push({
            source: 'reddit',
            sourceId: `reddit_${postData.id}`,
            url: `https://reddit.com${postData.permalink}`,
            title: postData.title,
            content: postData.selftext || postData.title,
            author: postData.author,
            upvotes: postData.score || 0,
            commentsCount: postData.num_comments || 0,
            createdAt: new Date(postData.created_utc * 1000),
          });
        }
      } catch (error) {
        console.error(`Reddit scraper error for r/${subreddit}:`, error);
      }
    }

    return discussions;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.delay) {
      await new Promise(resolve => setTimeout(resolve, this.delay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

/**
 * Hacker News Scraper
 */
export class HackerNewsScraper {
  private lastRequest = 0;
  private readonly delay = RATE_LIMITS.hackernews.delay;

  async scrape(): Promise<ScrapedDiscussion[]> {
    const discussions: ScrapedDiscussion[] = [];

    try {
      // Get top story IDs
      await this.throttle();
      const listResponse = await fetch('https://hacker-news.firebaseio.com/v0/newstories.json');
      const storyIds = (await listResponse.json()) as number[];

      // Fetch top 100 stories
      for (const id of storyIds.slice(0, 100)) {
        try {
          await this.throttle();
          const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const story = (await response.json()) as any;

          if (!story || story.deleted || story.dead) continue;

          discussions.push({
            source: 'hackernews',
            sourceId: `hn_${story.id}`,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            title: story.title,
            content: story.title,
            author: story.by,
            upvotes: story.score || 0,
            commentsCount: story.descendants || 0,
            createdAt: new Date((story.time || 0) * 1000),
          });
        } catch (error) {
          // Continue on individual story fetch failure
        }
      }
    } catch (error) {
      console.error('HN scraper error:', error);
    }

    return discussions;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.delay) {
      await new Promise(resolve => setTimeout(resolve, this.delay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

/**
 * Product Hunt Scraper (public API)
 */
export class ProductHuntScraper {
  private lastRequest = 0;
  private readonly delay = RATE_LIMITS.producthunt.delay;

  async scrape(): Promise<ScrapedDiscussion[]> {
    const discussions: ScrapedDiscussion[] = [];

    try {
      // Note: Product Hunt requires API key for full access
      // Using public page scraping as fallback
      await this.throttle();

      const response = await fetch('https://www.producthunt.com/posts', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) return discussions;

      const html = await response.text();

      // Extract product data from HTML (simplified)
      const productRegex = /<div[^>]*class="[^"]*post[^"]*"[^>]*data-id="(\d+)"[^>]*>/g;
      let match;

      while ((match = productRegex.exec(html)) !== null) {
        try {
          discussions.push({
            source: 'producthunt',
            sourceId: `ph_${match[1]}`,
            url: `https://www.producthunt.com/posts/${match[1]}`,
            content: match[1],
            upvotes: 0,
            commentsCount: 0,
            createdAt: new Date(),
          });
        } catch (error) {
          // Continue
        }
      }
    } catch (error) {
      console.error('Product Hunt scraper error:', error);
    }

    return discussions;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.delay) {
      await new Promise(resolve => setTimeout(resolve, this.delay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

/**
 * Indie Hackers Scraper
 */
export class IndieHackersScraper {
  private lastRequest = 0;
  private readonly delay = RATE_LIMITS.indiehackers.delay;

  async scrape(): Promise<ScrapedDiscussion[]> {
    const discussions: ScrapedDiscussion[] = [];

    try {
      // Indie Hackers doesn't have public API, use discussion page
      await this.throttle();

      const response = await fetch('https://www.indiehackers.com/forum', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) return discussions;

      const html = await response.text();

      // Extract discussion threads (simplified parsing)
      const threadRegex = /<a[^>]*href="\/forum\/threads\/(\d+)[^>]*"[^>]*>([^<]+)<\/a>/g;
      let match;

      while ((match = threadRegex.exec(html)) !== null) {
        discussions.push({
          source: 'indiehackers',
          sourceId: `ih_${match[1]}`,
          url: `https://www.indiehackers.com/forum/threads/${match[1]}`,
          title: match[2],
          content: match[2],
          upvotes: 0,
          commentsCount: 0,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Indie Hackers scraper error:', error);
    }

    return discussions;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.delay) {
      await new Promise(resolve => setTimeout(resolve, this.delay - elapsed));
    }
    this.lastRequest = Date.now();
  }
}

/**
 * RSS Feed Scraper
 */
export class RSSFeedScraper {
  private readonly feeds = [
    'https://feeds.techcrunch.com/techcrunch/',
    'https://www.producthunt.com/feed.rss',
    'https://feeds.indie-hackers.com/latest',
    'https://news.ycombinator.com/rss',
  ];

  async scrape(): Promise<ScrapedDiscussion[]> {
    const discussions: ScrapedDiscussion[] = [];

    for (const feedUrl of this.feeds) {
      try {
        const data = await this.fetchRSS(feedUrl);
        discussions.push(...data);
      } catch (error) {
        console.error(`RSS feed error for ${feedUrl}:`, error);
      }
    }

    return discussions;
  }

  private async fetchRSS(feedUrl: string): Promise<ScrapedDiscussion[]> {
    const response = await fetch(feedUrl);
    const text = await response.text();

    // Parse RSS/Atom XML (simplified)
    const discussions: ScrapedDiscussion[] = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const items = text.match(itemRegex) || [];

    for (const item of items) {
      try {
        const titleMatch = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(item);
        const linkMatch = /<link>(.*?)<\/link>/.exec(item);
        const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(item);

        if (!titleMatch || !linkMatch) continue;

        const title = titleMatch[1] || titleMatch[2];

        discussions.push({
          source: 'rss',
          sourceId: `rss_${Buffer.from(linkMatch[1]).toString('base64').slice(0, 20)}`,
          url: linkMatch[1],
          title: title.slice(0, 500),
          content: title,
          upvotes: 0,
          commentsCount: 0,
          createdAt: pubDateMatch ? new Date(pubDateMatch[1]) : new Date(),
        });
      } catch (error) {
        // Skip malformed items
      }
    }

    return discussions;
  }
}

/**
 * Master Scraper Orchestrator
 */
export class MasterScraper {
  private reddit = new RedditScraper();
  private hackernews = new HackerNewsScraper();
  private producthunt = new ProductHuntScraper();
  private indiehackers = new IndieHackersScraper();
  private rss = new RSSFeedScraper();

  async scrapeAll(): Promise<ScrapedDiscussion[]> {
    console.log('🕷️  Starting multi-source scraping...');

    const results = await Promise.allSettled([
      this.reddit.scrape(),
      this.hackernews.scrape(),
      this.producthunt.scrape(),
      this.indiehackers.scrape(),
      this.rss.scrape(),
    ]);

    const allDiscussions: ScrapedDiscussion[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allDiscussions.push(...result.value);
      } else {
        console.error('Scraper failed:', result.reason);
      }
    }

    console.log(`✅ Scraped ${allDiscussions.length} discussions from all sources`);
    return allDiscussions;
  }
}
