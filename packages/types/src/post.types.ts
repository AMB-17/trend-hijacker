export interface PostData {
  id: string;
  sourceId: string;
  externalId: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt: Date;
  scrapedAt: Date;
  upvotes: number;
  comments: number;
  engagement: number;
  processed: boolean;
  processedAt?: Date;
}

export interface PainPointData {
  id: string;
  postId: string;
  text: string;
  pattern: string;
  intensity: number;
  detectedAt: Date;
}

export interface ExtractedKeyword {
  keyword: string;
  score: number;
  frequency: number;
}

export interface ExtractedPhrase {
  phrase: string;
  score: number;
  occurrences: number;
}
