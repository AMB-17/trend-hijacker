export interface ScraperConfig {
  name: string;
  baseUrl: string;
  rateLimit: number; // requests per minute
  respectRobotsTxt: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ScrapedPost {
  externalId: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt: Date;
  upvotes?: number;
  comments?: number;
  metadata?: Record<string, unknown>;
}

export interface ScraperOptions {
  limit?: number;
  since?: Date;
  keywords?: string[];
  [key: string]: unknown;
}

export interface ScraperResult {
  posts: ScrapedPost[];
  hasMore: boolean;
  nextCursor?: string;
  errors?: ScraperError[];
}

export interface ScraperError {
  message: string;
  code?: string;
  url?: string;
  timestamp: Date;
}
