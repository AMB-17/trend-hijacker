export type { BaseScraper, ScraperConfig, ScrapedPost, ScrapeResult } from "./base.scraper";
export type { RedditScraper, RedditScrapeOptions } from "./reddit.scraper";
export type { HackerNewsScraper, HNScrapeOptions } from "./hackernews.scraper";

import { BaseScraper } from "./base.scraper";
import { RedditScraper } from "./reddit.scraper";
import { HackerNewsScraper } from "./hackernews.scraper";

/**
 * Scraper Registry - Manages all available scrapers
 */
export class ScraperRegistry {
  private scrapers: Map<string, BaseScraper>;

  constructor() {
    this.scrapers = new Map();
    this.registerDefaultScrapers();
  }

  /**
   * Register default scrapers
   */
  private registerDefaultScrapers() {
    this.register(new RedditScraper());
    this.register(new HackerNewsScraper());
  }

  /**
   * Register a scraper
   */
  register(scraper: BaseScraper) {
    this.scrapers.set(scraper.getName(), scraper);
  }

  /**
   * Get a scraper by name
   */
  get(name: string): BaseScraper | undefined {
    return this.scrapers.get(name);
  }

  /**
   * Get all scraper names
   */
  getNames(): string[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Get all scrapers
   */
  getAll(): BaseScraper[] {
    return Array.from(this.scrapers.values());
  }

  /**
   * Check if a scraper exists
   */
  has(name: string): boolean {
    return this.scrapers.has(name);
  }
}

// Export singleton instance
export const scraperRegistry = new ScraperRegistry();
