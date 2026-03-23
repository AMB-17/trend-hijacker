import axios, { AxiosInstance } from "axios";
import { logger } from "@packages/utils";

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    delayBetweenRequests: number; // milliseconds
  };
  timeout: number; // milliseconds
  retries: number;
  userAgent: string;
}

export interface ScrapedPost {
  externalId: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt: Date;
  upvotes: number;
  comments: number;
}

export interface ScrapeResult {
  posts: ScrapedPost[];
  nextCursor?: string;
  hasMore: boolean;
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected client: AxiosInstance;
  protected lastRequestTime: number = 0;
  protected requestCount: number = 0;
  protected requestWindowStart: number = Date.now();

  constructor(config: ScraperConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        "User-Agent": config.userAgent,
      },
    });
  }

  /**
   * Abstract method that each scraper must implement
   * @param options - Scraper-specific options (subreddit, query, etc.)
   */
  abstract scrape(options?: Record<string, any>): Promise<ScrapeResult>;

  /**
   * Rate limiting logic - ensures we don't exceed requests per minute
   */
  protected async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceWindowStart = now - this.requestWindowStart;

    // Reset window if 1 minute has passed
    if (timeSinceWindowStart >= 60000) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // Check if we've exceeded rate limit
    if (this.requestCount >= this.config.rateLimit.requestsPerMinute) {
      const timeToWait = 60000 - timeSinceWindowStart;
      logger.info(
        `[${this.config.name}] Rate limit reached. Waiting ${timeToWait}ms...`
      );
      await this.sleep(timeToWait);
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    // Enforce delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (
      timeSinceLastRequest < this.config.rateLimit.delayBetweenRequests &&
      this.lastRequestTime > 0
    ) {
      const delay =
        this.config.rateLimit.delayBetweenRequests - timeSinceLastRequest;
      await this.sleep(delay);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Make an HTTP request with rate limiting and retries
   */
  protected async makeRequest<T>(
    url: string,
    options?: Record<string, any>
  ): Promise<T> {
    await this.enforceRateLimit();

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        logger.debug(
          `[${this.config.name}] Making request to ${url} (attempt ${attempt}/${this.config.retries})`
        );

        const response = await this.client.get<T>(url, options);
        return response.data;
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `[${this.config.name}] Request failed (attempt ${attempt}/${this.config.retries}):`,
          error instanceof Error ? error.message : error
        );

        // Don't retry on 404 or 403
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404 || error.response?.status === 403) {
            throw error;
          }
        }

        // Exponential backoff for retries
        if (attempt < this.config.retries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(backoffDelay);
        }
      }
    }

    throw lastError || new Error("Request failed after all retries");
  }

  /**
   * Check robots.txt for the given path
   * Returns true if allowed, false if disallowed
   */
  protected async checkRobotsTxt(path: string): Promise<boolean> {
    try {
      const robotsUrl = `${this.config.baseUrl}/robots.txt`;
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        headers: { "User-Agent": this.config.userAgent },
      });

      const robotsTxt = response.data as string;
      const lines = robotsTxt.split("\n");

      let isRelevantUserAgent = false;
      let isAllowed = true;

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();

        // Check if this section applies to our user agent
        if (trimmed.startsWith("user-agent:")) {
          const agent = trimmed.replace("user-agent:", "").trim();
          isRelevantUserAgent = agent === "*" || agent === "claudebot";
        }

        // Check disallow rules
        if (isRelevantUserAgent && trimmed.startsWith("disallow:")) {
          const disallowPath = trimmed.replace("disallow:", "").trim();
          if (disallowPath && path.startsWith(disallowPath)) {
            isAllowed = false;
          }
        }

        // Check allow rules (override disallow)
        if (isRelevantUserAgent && trimmed.startsWith("allow:")) {
          const allowPath = trimmed.replace("allow:", "").trim();
          if (allowPath && path.startsWith(allowPath)) {
            isAllowed = true;
          }
        }
      }

      if (!isAllowed) {
        logger.warn(
          `[${this.config.name}] Path ${path} is disallowed by robots.txt`
        );
      }

      return isAllowed;
    } catch (error) {
      // If we can't fetch robots.txt, assume allowed but log warning
      logger.warn(
        `[${this.config.name}] Could not fetch robots.txt, proceeding anyway:`,
        error instanceof Error ? error.message : error
      );
      return true;
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Normalize and validate scraped post data
   */
  protected normalizePost(post: Partial<ScrapedPost>): ScrapedPost | null {
    try {
      if (!post.externalId || !post.title || !post.url) {
        logger.warn(
          `[${this.config.name}] Invalid post missing required fields:`,
          post
        );
        return null;
      }

      return {
        externalId: String(post.externalId),
        title: String(post.title).trim(),
        content: String(post.content || "").trim(),
        url: String(post.url),
        author: post.author ? String(post.author) : undefined,
        publishedAt: post.publishedAt || new Date(),
        upvotes: Number(post.upvotes) || 0,
        comments: Number(post.comments) || 0,
      };
    } catch (error) {
      logger.error(
        `[${this.config.name}] Error normalizing post:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Get scraper name
   */
  public getName(): string {
    return this.config.name;
  }
}
