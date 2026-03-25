import { Redis } from "ioredis";
import { logger } from "@packages/utils";

/**
 * Redis Cache Service
 * Provides caching functionality for API responses
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes default

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on("connect", () => {
      logger.info("✅ Redis cache connected");
    });

    this.redis.on("error", (err) => {
      logger.error("Redis cache error:", err);
    });
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value);
      logger.debug(`[Cache] HIT: ${key}`);
      return parsed as T;
    } catch (error) {
      logger.error(
        `[Cache] Error getting key ${key}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const expiry = ttl || this.defaultTTL;
      await this.redis.setex(key, expiry, JSON.stringify(value));
      logger.debug(`[Cache] SET: ${key} (TTL: ${expiry}s)`);
    } catch (error) {
      logger.error(
        `[Cache] Error setting key ${key}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug(`[Cache] DEL: ${key}`);
    } catch (error) {
      logger.error(
        `[Cache] Error deleting key ${key}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      logger.debug(`[Cache] DEL pattern ${pattern}: ${keys.length} keys`);
      return keys.length;
    } catch (error) {
      logger.error(
        `[Cache] Error deleting pattern ${pattern}:`,
        error instanceof Error ? error.message : error
      );
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(
        `[Cache] Error checking key ${key}:`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * Get or set cached value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    logger.debug(`[Cache] MISS: ${key}`);
    const value = await factory();

    // Set in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Increment counter
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      const result = await this.redis.incrby(key, by);
      return result;
    } catch (error) {
      logger.error(
        `[Cache] Error incrementing key ${key}:`,
        error instanceof Error ? error.message : error
      );
      return 0;
    }
  }

  /**
   * Set expiry on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error(
        `[Cache] Error setting expiry on key ${key}:`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(
        `[Cache] Error getting TTL for key ${key}:`,
        error instanceof Error ? error.message : error
      );
      return -1;
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
      logger.info("[Cache] Flushed all cache");
    } catch (error) {
      logger.error(
        "[Cache] Error flushing cache:",
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info("[Cache] Connection closed");
  }

  /**
   * Generate cache key for trends
   */
  static trendKey(params: {
    stage?: string;
    status?: string;
    minScore?: number;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): string {
    const parts = ["trends"];
    if (params.stage) parts.push(`stage:${params.stage}`);
    if (params.status) parts.push(`status:${params.status}`);
    if (params.minScore) parts.push(`score:${params.minScore}`);
    parts.push(`sort:${params.sortBy || "score"}`);
    parts.push(`limit:${params.limit || 20}`);
    parts.push(`offset:${params.offset || 0}`);
    return parts.join(":");
  }

  /**
   * Generate cache key for search
   */
  static searchKey(query: string, limit: number = 20): string {
    return `search:${query.toLowerCase().trim()}:${limit}`;
  }

  /**
   * Generate cache key for single trend
   */
  static trendByIdKey(id: string): string {
    return `trend:${id}`;
  }

  /**
   * Generate cache key for personalized trend feeds
   */
  static personalizedTrendKey(
    userId: string,
    params: {
      stage?: string;
      status?: string;
      minScore?: number;
      sortBy?: string;
      limit?: number;
      offset?: number;
    }
  ): string {
    return `user:${userId}:${CacheService.trendKey(params)}`;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
