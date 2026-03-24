/**
 * Rate Limiter for external API calls
 * Ensures requests don't exceed specified rate limits
 */

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class RateLimiter {
  private queue: QueueItem<unknown>[] = [];
  private running = 0;
  private lastCall = 0;

  constructor(
    private maxConcurrent: number = 1,
    private minDelayMs: number = 1000
  ) {}

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as QueueItem<unknown>);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent ||this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;

    try {
      // Wait for minimum delay since last call
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCall;

      if (timeSinceLastCall < this.minDelayMs) {
        await this.delay(this.minDelayMs - timeSinceLastCall);
      }

      this.lastCall = Date.now();

      // Execute the function
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get number of running requests
   */
  getRunningCount(): number {
    return this.running;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * Create a rate limiter for Reddit API (1 request per 2 seconds)
 */
export function createRedditLimiter() {
  return new RateLimiter(1, 2000);
}

/**
 * Create a rate limiter for general external APIs (5 concurrent, 500ms delay)
 */
export function createGeneralLimiter() {
  return new RateLimiter(5, 500);
}
