/**
 * Retry logic with exponential backoff
 * Automatically retries failed operations with increasing delays
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: Array<new (...args: unknown[]) => Error>;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryableErrors = [Error],
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = retryableErrors.some(
        ErrorClass => lastError instanceof ErrorClass
      );

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt === maxAttempts) {
        if (attempt === maxAttempts) {
          throw new RetryError(
            `Failed after ${maxAttempts} attempts: ${lastError.message}`,
            maxAttempts,
            lastError
          );
        }
        throw lastError;
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt, lastError, delayMs);
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Increase delay for next attempt
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Retry with default options optimized for network requests
 */
export async function retryNetworkRequest<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return retry(fn, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
    ...options,
    onRetry: (attempt, error, delayMs) => {
      console.warn(`Network request failed (attempt ${attempt}), retrying in ${delayMs}ms:`, error.message);
      options.onRetry?.(attempt, error, delayMs);
    },
  });
}

/**
 * Retry with default options optimized for database operations
 */
export async function retryDatabaseOperation<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return retry(fn, {
    maxAttempts: 5,
    initialDelayMs: 500,
    backoffMultiplier: 1.5,
    maxDelayMs: 5000,
    ...options,
    onRetry: (attempt, error, delayMs) => {
      console.warn(`Database operation failed (attempt ${attempt}), retrying in ${delayMs}ms:`, error.message);
      options.onRetry?.(attempt, error, delayMs);
    },
  });
}
