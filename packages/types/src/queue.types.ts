export interface QueueJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  timestamp: Date;
}

export interface ScraperJobData {
  source: string;
  options?: Record<string, unknown>;
}

export interface TrendDetectionJobData {
  postIds: string[];
  batchSize?: number;
}

export interface ProcessingJobData {
  postId: string;
  forceReprocess?: boolean;
}

export type JobPriority = "low" | "medium" | "high" | "critical";

export interface JobOptions {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}
