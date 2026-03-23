import { BaseScraper, ScraperConfig, ScrapeResult, ScrapedPost } from "./base.scraper";
import { logger } from "@packages/utils";

interface HNHit {
  created_at: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number | null;
  story_text: string | null;
  comment_text: string | null;
  num_comments: number;
  objectID: string;
  story_id?: number;
  parent_id?: number;
}

interface HNResponse {
  hits: HNHit[];
  page: number;
  nbHits: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
}

export interface HNScrapeOptions {
  query?: string; // Search query (e.g., "SaaS", "startup")
  tags?: string[]; // Filter by tags: story, comment, ask_hn, show_hn
  page?: number; // Pagination (0-indexed)
  hitsPerPage?: number; // Results per page (max 1000)
  numericFilters?: string[]; // e.g., "points>10", "num_comments>5"
}

export class HackerNewsScraper extends BaseScraper {
  // Useful search queries for trend detection
  public static readonly TRENDING_QUERIES = [
    "looking for tool",
    "need help with",
    "anyone building",
    "wish there was",
    "pain point",
    "frustrated with",
    "alternative to",
    "better way to",
  ];

  constructor() {
    const config: ScraperConfig = {
      name: "hackernews",
      baseUrl: "https://hn.algolia.com/api/v1",
      rateLimit: {
        requestsPerMinute: 60, // Algolia is generous with rate limits
        delayBetweenRequests: 1000, // 1 second between requests
      },
      timeout: 10000,
      retries: 3,
      userAgent: "TrendHijacker/1.0 (Trend Analysis Bot)",
    };

    super(config);
  }

  /**
   * Scrape recent posts from HackerNews
   */
  async scrape(options?: HNScrapeOptions): Promise<ScrapeResult> {
    const {
      query = "",
      tags = ["story"],
      page = 0,
      hitsPerPage = 100,
      numericFilters = [],
    } = options || {};

    try {
      // Build query parameters
      const params = new URLSearchParams({
        query,
        page: String(page),
        hitsPerPage: String(Math.min(hitsPerPage, 1000)),
      });

      // Add tags filter (story, comment, ask_hn, show_hn, etc.)
      if (tags.length > 0) {
        params.append("tags", tags.join(","));
      }

      // Add numeric filters (points>10, num_comments>5, etc.)
      if (numericFilters.length > 0) {
        params.append("numericFilters", numericFilters.join(","));
      }

      const url = `/search_by_date?${params.toString()}`;
      logger.info(
        `[${this.config.name}] Scraping HN ${query ? `query="${query}"` : "recent posts"} (page ${page})`
      );

      // Make request with rate limiting
      const response = await this.makeRequest<HNResponse>(url);

      // Extract and normalize posts
      const posts: ScrapedPost[] = [];
      for (const hit of response.hits) {
        const normalized = this.normalizeHNPost(hit);
        if (normalized) {
          posts.push(normalized);
        }
      }

      logger.info(
        `[${this.config.name}] Scraped ${posts.length} posts from HN (page ${page}/${response.nbPages})`
      );

      return {
        posts,
        nextCursor: page < response.nbPages - 1 ? String(page + 1) : undefined,
        hasMore: page < response.nbPages - 1,
      };
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error scraping HN:`,
        error instanceof Error ? error.message : error
      );
      return { posts: [], hasMore: false };
    }
  }

  /**
   * Scrape with multiple trending queries to find pain points
   */
  async scrapeTrendingQueries(
    queries: string[] = HackerNewsScraper.TRENDING_QUERIES,
    options?: Omit<HNScrapeOptions, "query">
  ): Promise<ScrapeResult> {
    const allPosts: ScrapedPost[] = [];
    const seenIds = new Set<string>();

    for (const query of queries) {
      const result = await this.scrape({ ...options, query });

      // Deduplicate posts
      for (const post of result.posts) {
        if (!seenIds.has(post.externalId)) {
          seenIds.add(post.externalId);
          allPosts.push(post);
        }
      }
    }

    logger.info(
      `[${this.config.name}] Scraped ${allPosts.length} unique posts from ${queries.length} queries`
    );

    return {
      posts: allPosts,
      hasMore: false,
    };
  }

  /**
   * Scrape Ask HN and Show HN posts (high-value for trend detection)
   */
  async scrapeAskShowHN(options?: Omit<HNScrapeOptions, "tags">): Promise<ScrapeResult> {
    const askHN = await this.scrape({ ...options, tags: ["ask_hn"] });
    const showHN = await this.scrape({ ...options, tags: ["show_hn"] });

    const allPosts = [...askHN.posts, ...showHN.posts];

    logger.info(
      `[${this.config.name}] Scraped ${askHN.posts.length} Ask HN + ${showHN.posts.length} Show HN posts`
    );

    return {
      posts: allPosts,
      hasMore: askHN.hasMore || showHN.hasMore,
    };
  }

  /**
   * Scrape comments for a specific story (for deeper analysis)
   */
  async scrapeComments(storyId: string): Promise<ScrapeResult> {
    try {
      const params = new URLSearchParams({
        tags: "comment",
        numericFilters: `story_id:${storyId}`,
        hitsPerPage: "100",
      });

      const url = `/search_by_date?${params.toString()}`;
      const response = await this.makeRequest<HNResponse>(url);

      const posts: ScrapedPost[] = [];
      for (const hit of response.hits) {
        if (hit.comment_text) {
          const normalized = this.normalizeHNComment(hit);
          if (normalized) {
            posts.push(normalized);
          }
        }
      }

      return { posts, hasMore: false };
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error scraping comments for story ${storyId}:`,
        error instanceof Error ? error.message : error
      );
      return { posts: [], hasMore: false };
    }
  }

  /**
   * Normalize HN story to our standard format
   */
  private normalizeHNPost(hit: HNHit): ScrapedPost | null {
    try {
      // Skip if no title (probably a comment)
      if (!hit.title) {
        return null;
      }

      // Build HN URL
      const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;

      const normalized: ScrapedPost = {
        externalId: hit.objectID,
        title: hit.title,
        content: hit.story_text || "",
        url: hit.url || hnUrl, // Use external URL if available, otherwise HN discussion
        author: hit.author,
        publishedAt: new Date(hit.created_at),
        upvotes: hit.points || 0,
        comments: hit.num_comments || 0,
      };

      return this.normalizePost(normalized);
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error normalizing HN post:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Normalize HN comment to our standard format
   */
  private normalizeHNComment(hit: HNHit): ScrapedPost | null {
    try {
      if (!hit.comment_text) {
        return null;
      }

      const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;

      const normalized: ScrapedPost = {
        externalId: hit.objectID,
        title: `Comment on ${hit.story_id || "story"}`,
        content: hit.comment_text,
        url: hnUrl,
        author: hit.author,
        publishedAt: new Date(hit.created_at),
        upvotes: hit.points || 0,
        comments: 0, // Comments don't have nested comments in this API
      };

      return this.normalizePost(normalized);
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error normalizing HN comment:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }
}
