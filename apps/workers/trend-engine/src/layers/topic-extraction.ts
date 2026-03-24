import {
  TFIDFAnalyzer,
  KeywordExtractor,
  PhraseDetector,
} from "@packages/nlp";
import { logger } from "@packages/utils";

export interface ExtractedTopic {
  keyword: string;
  score: number;
  type: "keyword" | "phrase";
}

export interface TopicExtractionResult {
  postId: string;
  topics: ExtractedTopic[];
  primaryTopics: string[]; // Top 3-5 topics
  allKeywords: string[];
  phrases: string[];
}

/**
 * Layer 1: Topic Extraction
 * Extracts keywords, phrases, and topics from post content using NLP
 */
export class TopicExtractionLayer {
  private tfidfAnalyzer: TFIDFAnalyzer;
  private keywordExtractor: KeywordExtractor;
  private phraseDetector: PhraseDetector;

  constructor() {
    this.tfidfAnalyzer = new TFIDFAnalyzer();
    this.keywordExtractor = new KeywordExtractor();
    this.phraseDetector = new PhraseDetector();
  }

  /**
   * Extract topics from a single post
   */
  async extractFromPost(
    postId: string,
    title: string,
    content: string
  ): Promise<TopicExtractionResult> {
    try {
      // Combine title and content (title is more important, so repeat it)
      const text = `${title} ${title} ${content}`;

      // Extract keywords using frequency-based extraction
      const keywords = this.keywordExtractor.extract(text, 20);

      // Extract phrases (2-3 word combinations)
      const phrases = this.phraseDetector.extract(text, 2, 3, 10);

      // Extract topics using TF-IDF (for better semantic understanding)
      const tfidfKeywords = this.tfidfAnalyzer.extractKeywords(text, 15);

      // Combine and deduplicate
      const allTopics: ExtractedTopic[] = [];
      const seenTopics = new Set<string>();

      // Add TF-IDF keywords (highest priority)
      for (const item of tfidfKeywords) {
        const normalized = item.keyword.toLowerCase().trim();
        if (!seenTopics.has(normalized) && normalized.length >= 3) {
          allTopics.push({
            keyword: normalized,
            score: item.score,
            type: "keyword",
          });
          seenTopics.add(normalized);
        }
      }

      // Add frequency-based keywords
      for (const item of keywords) {
        const normalized = item.keyword.toLowerCase().trim();
        if (!seenTopics.has(normalized) && normalized.length >= 3) {
          allTopics.push({
            keyword: normalized,
            score: item.score * 0.7, // Lower weight than TF-IDF
            type: "keyword",
          });
          seenTopics.add(normalized);
        }
      }

      // Add phrases
      for (const item of phrases) {
        const normalized = item.phrase.toLowerCase().trim();
        if (!seenTopics.has(normalized)) {
          allTopics.push({
            keyword: normalized,
            score: item.score * 1.2, // Phrases are valuable, boost them
            type: "phrase",
          });
          seenTopics.add(normalized);
        }
      }

      // Sort by score and take top topics
      allTopics.sort((a, b) => b.score - a.score);

      // Get primary topics (top 3-5)
      const primaryTopics = allTopics
        .slice(0, 5)
        .map((t: ExtractedTopic) => t.keyword)
        .filter((k) => k.length >= 3);

      // Filter out common tech words that aren't meaningful
      const filtered = this.filterCommonWords(allTopics);

      logger.debug(
        `[TopicExtraction] Extracted ${filtered.length} topics from post ${postId}`
      );

      return {
        postId,
        topics: filtered,
        primaryTopics,
        allKeywords: Array.from(seenTopics),
        phrases: phrases.map((p) => p.phrase),
      };
    } catch (error) {
      logger.error(
        `[TopicExtraction] Error extracting topics from post ${postId}:`,
        error instanceof Error ? error.message : error
      );
      return {
        postId,
        topics: [],
        primaryTopics: [],
        allKeywords: [],
        phrases: [],
      };
    }
  }

  /**
   * Extract topics from multiple posts (batch processing)
   */
  async extractFromPosts(
    posts: Array<{ id: string; title: string; content: string }>
  ): Promise<TopicExtractionResult[]> {
    const results: TopicExtractionResult[] = [];

    for (const post of posts) {
      const result = await this.extractFromPost(
        post.id,
        post.title,
        post.content
      );
      results.push(result);
    }

    logger.info(
      `[TopicExtraction] Processed ${posts.length} posts, extracted topics from ${results.length}`
    );

    return results;
  }

  /**
   * Filter out common meaningless words
   */
  private filterCommonWords(topics: ExtractedTopic[]): ExtractedTopic[] {
    const commonWords = new Set([
      "app",
      "tool",
      "service",
      "platform",
      "software",
      "website",
      "product",
      "solution",
      "system",
      "feature",
      "people",
      "thing",
      "things",
      "something",
      "someone",
      "anyone",
      "everyone",
      "way",
      "time",
      "make",
      "made",
      "need",
      "want",
      "get",
      "use",
      "using",
      "used",
      "work",
      "working",
      "like",
      "good",
      "better",
      "best",
      "new",
      "different",
    ]);

    return topics.filter((topic) => !commonWords.has(topic.keyword));
  }

  /**
   * Aggregate topics across multiple posts to find trending ones
   */
  aggregateTopics(results: TopicExtractionResult[]): Map<string, number> {
    const topicCounts = new Map<string, number>();

    for (const result of results) {
      for (const topic of result.primaryTopics) {
        const current = topicCounts.get(topic) || 0;
        topicCounts.set(topic, current + 1);
      }
    }

    // Sort by count
    const sorted = new Map(
      Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1])
    );

    return sorted;
  }
}
