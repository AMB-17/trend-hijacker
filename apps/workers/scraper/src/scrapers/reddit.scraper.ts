import { BaseScraper, ScraperConfig, ScrapeResult, ScrapedPost } from "./base.scraper";
import { logger } from "@packages/utils";

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: string;
    created_utc: number;
    ups: number;
    num_comments: number;
    permalink: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
    after: string | null;
    before: string | null;
  };
}

export interface RedditScrapeOptions {
  subreddit: string;
  sort?: "hot" | "new" | "top" | "rising";
  limit?: number;
  after?: string; // Pagination cursor
}

export class RedditScraper extends BaseScraper {
  // Target subreddits for entrepreneurship and SaaS discussions
  public static readonly TARGET_SUBREDDITS = [
    "Entrepreneur",
    "startups",
    "SaaS",
    "SideProject",
    "buildinpublic",
    "indiebiz",
    "smallbusiness",
    "Business_Ideas",
    "growmybusiness",
    "InternetIsBeautiful",
  ];

  constructor() {
    const config: ScraperConfig = {
      name: "reddit",
      baseUrl: "https://www.reddit.com",
      rateLimit: {
        requestsPerMinute: 30, // Reddit allows ~60/min, we use 30 to be safe
        delayBetweenRequests: 2000, // 2 seconds between requests
      },
      timeout: 10000,
      retries: 3,
      userAgent: "TrendHijacker/1.0 (Trend Analysis Bot)",
    };

    super(config);
  }

  /**
   * Scrape posts from a subreddit
   */
  async scrape(options?: RedditScrapeOptions): Promise<ScrapeResult> {
    const {
      subreddit = "Entrepreneur",
      sort = "new",
      limit = 100,
      after,
    } = options || {};

    try {
      // Check robots.txt before scraping
      const path = `/r/${subreddit}/${sort}.json`;
      const isAllowed = await this.checkRobotsTxt(path);
      if (!isAllowed) {
        logger.warn(
          `[${this.config.name}] Skipping /r/${subreddit} - disallowed by robots.txt`
        );
        return { posts: [], hasMore: false };
      }

      // Build request URL
      const params = new URLSearchParams({
        limit: String(Math.min(limit, 100)), // Reddit max is 100 per request
        raw_json: "1", // Prevents HTML escaping
      });

      if (after) {
        params.append("after", after);
      }

      const url = `${path}?${params.toString()}`;
      logger.info(`[${this.config.name}] Scraping /r/${subreddit} (${sort})`);

      // Make request with rate limiting
      const response = await this.makeRequest<RedditResponse>(url);

      // Extract posts
      const posts: ScrapedPost[] = [];
      for (const item of response.data.children) {
        const normalized = this.normalizeRedditPost(item);
        if (normalized) {
          posts.push(normalized);
        }
      }

      logger.info(
        `[${this.config.name}] Scraped ${posts.length} posts from /r/${subreddit}`
      );

      return {
        posts,
        nextCursor: response.data.after || undefined,
        hasMore: !!response.data.after,
      };
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error scraping /r/${subreddit}:`,
        error instanceof Error ? error.message : error
      );
      return { posts: [], hasMore: false };
    }
  }

  /**
   * Scrape multiple subreddits in sequence
   */
  async scrapeMultiple(
    subreddits: string[] = RedditScraper.TARGET_SUBREDDITS,
    options?: Omit<RedditScrapeOptions, "subreddit">
  ): Promise<ScrapeResult> {
    const allPosts: ScrapedPost[] = [];

    for (const subreddit of subreddits) {
      const result = await this.scrape({ ...options, subreddit });
      allPosts.push(...result.posts);
    }

    logger.info(
      `[${this.config.name}] Scraped ${allPosts.length} total posts from ${subreddits.length} subreddits`
    );

    return {
      posts: allPosts,
      hasMore: false, // We don't support pagination across multiple subreddits
    };
  }

  /**
   * Normalize Reddit post to our standard format
   */
  private normalizeRedditPost(item: RedditPost): ScrapedPost | null {
    try {
      const post = item.data;

      // Skip if removed, deleted, or no content
      if (
        post.author === "[deleted]" ||
        post.selftext === "[removed]" ||
        (!post.selftext && !post.title)
      ) {
        return null;
      }

      const normalized: ScrapedPost = {
        externalId: post.id,
        title: post.title,
        content: post.selftext || "",
        url: post.url.startsWith("http")
          ? post.url
          : `https://www.reddit.com${post.permalink}`,
        author: post.author,
        publishedAt: new Date(post.created_utc * 1000), // Convert Unix timestamp to Date
        upvotes: post.ups || 0,
        comments: post.num_comments || 0,
      };

      return this.normalizePost(normalized);
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error normalizing Reddit post:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Scrape comments from a post (optional - for deeper analysis)
   * URL format: /r/{subreddit}/comments/{post_id}.json
   */
  async scrapeComments(subreddit: string, postId: string): Promise<string[]> {
    try {
      const url = `/r/${subreddit}/comments/${postId}.json`;
      const response = await this.makeRequest<any[]>(url);

      // Reddit returns [post_data, comments_data]
      if (!response || response.length < 2) {
        return [];
      }

      const commentsData = response[1].data.children;
      const comments: string[] = [];

      // Extract comment text (recursive for nested comments)
      const extractCommentText = (item: any) => {
        if (item.kind === "t1" && item.data.body) {
          comments.push(item.data.body);
        }
        if (item.data.replies && item.data.replies.data) {
          for (const reply of item.data.replies.data.children) {
            extractCommentText(reply);
          }
        }
      };

      for (const item of commentsData) {
        extractCommentText(item);
      }

      return comments;
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error scraping comments:`,
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }
}
