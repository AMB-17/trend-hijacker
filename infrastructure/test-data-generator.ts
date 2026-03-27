import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

/**
 * Test Data Generator for Trend Hijacker v2.0
 * Generates realistic test data for load testing and development
 * - 10,000+ trends
 * - 100,000+ discussions
 * - 1,000+ users
 * - Associated collections, alerts, and audit logs
 */

interface GeneratorConfig {
  connectionString: string;
  trendsCount?: number;
  discussionsCount?: number;
  usersCount?: number;
  workspacesCount?: number;
  batchSize?: number;
  logProgress?: boolean;
}

interface GeneratedIds {
  userIds: string[];
  workspaceIds: string[];
  trendIds: string[];
  discussionIds: string[];
  collectionIds: string[];
}

class TestDataGenerator {
  private pool: Pool;
  private config: GeneratorConfig;
  private generatedIds: GeneratedIds = {
    userIds: [],
    workspaceIds: [],
    trendIds: [],
    discussionIds: [],
    collectionIds: [],
  };

  private sources = ['reddit', 'hackernews', 'producthunt', 'indiehackers', 'rss'];
  private categories = [
    'AI/ML',
    'Blockchain',
    'Web3',
    'Sustainability',
    'Remote Work',
    'Quantum Computing',
    'Cybersecurity',
    'DevOps',
    'Low-Code',
    'Fintech',
    'HealthTech',
    'EdTech',
    'Climatetech',
    'Metaverse',
    'IoT',
  ];

  private statuses = ['emerging', 'growing', 'peak', 'declining', 'stable'];
  private trendTitles = [
    'The Future of {industry} with {technology}',
    '{technology} Revolutionizing {industry}',
    'How {company} is Disrupting {industry}',
    'The Rise of {trend}',
    'Why {concept} Will Change {industry}',
    'Building {product} in the Age of {technology}',
    '{technology}: The Next Big Thing',
    'The Hidden Potential of {technology}',
    'Combining {tech1} and {tech2} for {outcome}',
    'The {adjective} Evolution of {industry}',
  ];

  constructor(config: GeneratorConfig) {
    this.config = {
      trendsCount: 10000,
      discussionsCount: 100000,
      usersCount: 1000,
      workspacesCount: 500,
      batchSize: 1000,
      logProgress: true,
      ...config,
    };

    this.pool = new Pool({ connectionString: config.connectionString });
  }

  private log(message: string): void {
    if (this.config.logProgress) {
      console.log(`[${new Date().toISOString()}] ${message}`);
    }
  }

  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomDate(daysAgo: number = 365): Date {
    const date = new Date();
    date.setDate(date.getDate() - this.random(0, daysAgo));
    date.setHours(this.random(0, 23));
    date.setMinutes(this.random(0, 59));
    return date;
  }

  private generateTrendTitle(): string {
    const template = this.randomElement(this.trendTitles);
    const industries = [
      'Technology',
      'Healthcare',
      'Finance',
      'Retail',
      'Manufacturing',
      'Education',
      'Transportation',
    ];
    const technologies = [
      'AI',
      'ML',
      'Blockchain',
      'IoT',
      'Quantum',
      'GraphQL',
      'Rust',
      'WebAssembly',
    ];

    return template
      .replace('{industry}', this.randomElement(industries))
      .replace('{technology}', this.randomElement(technologies))
      .replace('{company}', `Company${this.random(1, 1000)}`)
      .replace('{trend}', 'DeFi')
      .replace('{concept}', 'Zero-Trust Security')
      .replace('{product}', `Product${this.random(1, 100)}`)
      .replace('{tech1}', this.randomElement(technologies))
      .replace('{tech2}', this.randomElement(technologies))
      .replace('{outcome}', 'Better Outcomes')
      .replace('{adjective}', this.randomElement(['Rapid', 'Unprecedented', 'Revolutionary']));
  }

  private generateDiscussionTitle(): string {
    const templates = [
      'Discussion about {topic}',
      'Why {topic} matters',
      'The future of {topic}',
      'Best practices for {topic}',
      'How to get started with {topic}',
    ];

    return this.randomElement(templates).replace(
      '{topic}',
      this.randomElement(this.categories)
    );
  }

  async generateUsers(): Promise<string[]> {
    this.log(`Generating ${this.config.usersCount} users...`);

    const users = [];
    for (let i = 0; i < this.config.usersCount!; i++) {
      const id = uuidv4();
      const passwordHash = await bcrypt.hash(`password${i}`, 10);

      users.push({
        id,
        email: `user${i}@example.com`,
        password_hash: passwordHash,
        tier: this.randomElement(['free', 'premium', 'enterprise']),
        workspace_id: this.randomElement(this.generatedIds.workspaceIds),
        created_at: this.randomDate(),
        updated_at: new Date(),
      });

      this.generatedIds.userIds.push(id);
    }

    await this.batchInsert('users', users);
    this.log(`Generated ${this.config.usersCount} users`);
    return this.generatedIds.userIds;
  }

  async generateWorkspaces(): Promise<string[]> {
    this.log(`Generating ${this.config.workspacesCount} workspaces...`);

    const workspaces = [];
    for (let i = 0; i < this.config.workspacesCount!; i++) {
      const id = uuidv4();

      workspaces.push({
        id,
        name: `Workspace ${i}`,
        slug: `workspace-${i}`,
        created_by: null, // Will be set later
        created_at: this.randomDate(),
        updated_at: new Date(),
        settings: JSON.stringify({}),
      });

      this.generatedIds.workspaceIds.push(id);
    }

    await this.batchInsert('workspaces', workspaces);
    this.log(`Generated ${this.config.workspacesCount} workspaces`);
    return this.generatedIds.workspaceIds;
  }

  async generateTrends(): Promise<string[]> {
    this.log(`Generating ${this.config.trendsCount} trends...`);

    const trends = [];
    for (let i = 0; i < this.config.trendsCount!; i++) {
      const id = uuidv4();

      trends.push({
        id,
        title: this.generateTrendTitle(),
        summary: `Summary of trend ${i}: This is a sample trend about emerging technologies.`,
        opportunity_score: Math.random() * 10,
        velocity_score: Math.random() * 5,
        problem_intensity: Math.random() * 10,
        novelty_score: Math.random() * 10,
        discussion_count: this.random(0, 500),
        source_count: this.random(0, 50),
        status: this.randomElement(this.statuses),
        category: this.randomElement(this.categories),
        suggested_ideas: Array(this.random(3, 10))
          .fill(null)
          .map(() => `Idea ${this.random(1, 1000)}`),
        market_potential_estimate: this.randomElement([
          '$1M-$10M',
          '$10M-$100M',
          '$100M-$1B',
          '$1B+',
        ]),
        created_at: this.randomDate(),
        updated_at: new Date(),
        peak_date: this.randomDate(90),
      });

      this.generatedIds.trendIds.push(id);

      if (trends.length % this.config.batchSize! === 0) {
        await this.batchInsert('trends', trends);
        this.log(`Generated ${i + 1}/${this.config.trendsCount} trends`);
        trends.length = 0;
      }
    }

    if (trends.length > 0) {
      await this.batchInsert('trends', trends);
    }

    this.log(`Generated ${this.config.trendsCount} trends`);
    return this.generatedIds.trendIds;
  }

  async generateDiscussions(): Promise<string[]> {
    this.log(`Generating ${this.config.discussionsCount} discussions...`);

    const discussions = [];
    for (let i = 0; i < this.config.discussionsCount!; i++) {
      const id = uuidv4();

      discussions.push({
        id,
        source: this.randomElement(this.sources),
        source_id: `${this.randomElement(this.sources)}-${i}`,
        url: `https://example.com/${i}`,
        title: this.generateDiscussionTitle(),
        content: `Discussion content ${i}: Lorem ipsum dolor sit amet...`,
        author: `Author${this.random(1, 10000)}`,
        upvotes: this.random(0, 1000),
        comments_count: this.random(0, 100),
        sentiment_score: Math.random() * 2 - 1, // -1 to 1
        extracted_keywords: Array(this.random(3, 8))
          .fill(null)
          .map(() => `keyword${this.random(1, 100)}`),
        pain_points_detected: Math.random() > 0.5,
        created_at: this.randomDate(),
        fetched_at: new Date(),
      });

      this.generatedIds.discussionIds.push(id);

      if (discussions.length % this.config.batchSize! === 0) {
        await this.batchInsert('discussions', discussions);
        this.log(`Generated ${i + 1}/${this.config.discussionsCount} discussions`);
        discussions.length = 0;
      }
    }

    if (discussions.length > 0) {
      await this.batchInsert('discussions', discussions);
    }

    this.log(`Generated ${this.config.discussionsCount} discussions`);
    return this.generatedIds.discussionIds;
  }

  async generateTrendDiscussions(): Promise<void> {
    this.log('Generating trend-discussion relationships...');

    const trendDiscussions = [];
    const discussionsPerTrend = Math.ceil(
      this.config.discussionsCount! / this.config.trendsCount!
    );

    for (let i = 0; i < Math.min(100000, this.config.trendsCount! * 10); i++) {
      const trendId = this.randomElement(this.generatedIds.trendIds);
      const discussionId = this.randomElement(this.generatedIds.discussionIds);

      trendDiscussions.push({
        trend_id: trendId,
        discussion_id: discussionId,
        relevance_score: Math.random(),
      });

      if (trendDiscussions.length % this.config.batchSize! === 0) {
        await this.batchInsert('trend_discussions', trendDiscussions);
        this.log(`Generated ${i + 1} trend-discussion relationships`);
        trendDiscussions.length = 0;
      }
    }

    if (trendDiscussions.length > 0) {
      await this.batchInsert('trend_discussions', trendDiscussions);
    }
  }

  async generateTrendMetrics(): Promise<void> {
    this.log('Generating trend metrics...');

    const metrics = [];
    const metricsPerTrend = 30; // Last 30 days

    for (const trendId of this.generatedIds.trendIds.slice(0, 1000)) {
      for (let day = 0; day < metricsPerTrend; day++) {
        metrics.push({
          id: uuidv4(),
          trend_id: trendId,
          timestamp: new Date(Date.now() - day * 24 * 60 * 60 * 1000),
          mention_count: this.random(10, 1000),
          velocity: Math.random() * 5,
          acceleration: Math.random() * 2 - 1,
          sentiment_avg: Math.random() * 2 - 1,
          created_at: new Date(),
        });

        if (metrics.length % this.config.batchSize! === 0) {
          await this.batchInsert('trend_metrics', metrics);
          metrics.length = 0;
        }
      }
    }

    if (metrics.length > 0) {
      await this.batchInsert('trend_metrics', metrics);
    }

    this.log('Generated trend metrics');
  }

  async generateCollections(): Promise<void> {
    this.log('Generating collections...');

    const collections = [];
    const collectionsPerUser = 5;

    for (const userId of this.generatedIds.userIds) {
      for (let i = 0; i < collectionsPerUser; i++) {
        collections.push({
          id: uuidv4(),
          user_id: userId,
          workspace_id: this.randomElement(this.generatedIds.workspaceIds),
          name: `Collection ${i}`,
          description: `Collection of trends about ${this.randomElement(this.categories)}`,
          created_by: userId,
          created_at: this.randomDate(),
          updated_at: new Date(),
        });

        this.generatedIds.collectionIds.push(collections[collections.length - 1].id);
      }

      if (collections.length % this.config.batchSize! === 0) {
        await this.batchInsert('collections', collections);
        collections.length = 0;
      }
    }

    if (collections.length > 0) {
      await this.batchInsert('collections', collections);
    }

    this.log('Generated collections');
  }

  async generateSavedTrends(): Promise<void> {
    this.log('Generating saved trends...');

    const savedTrends = [];
    const itemsPerUser = 10;

    for (const userId of this.generatedIds.userIds.slice(0, 100)) {
      for (let i = 0; i < itemsPerUser; i++) {
        savedTrends.push({
          id: uuidv4(),
          user_id: userId,
          trend_id: this.randomElement(this.generatedIds.trendIds),
          collection_id: this.randomElement(this.generatedIds.collectionIds),
          notes: `Notes about this trend`,
          created_at: this.randomDate(),
          updated_at: new Date(),
        });

        if (savedTrends.length % this.config.batchSize! === 0) {
          await this.batchInsert('saved_trends', savedTrends);
          savedTrends.length = 0;
        }
      }
    }

    if (savedTrends.length > 0) {
      await this.batchInsert('saved_trends', savedTrends);
    }

    this.log('Generated saved trends');
  }

  private async batchInsert(table: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const placeholders = data
      .map(
        (_, idx) =>
          `(${columns.map((_, j) => `$${idx * columns.length + j + 1}`).join(',')})`
      )
      .join(',');

    const values = data.flatMap((row) => columns.map((col) => row[col]));

    const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;

    try {
      await this.pool.query(query, values);
    } catch (error) {
      this.log(`Error inserting into ${table}: ${error}`);
      throw error;
    }
  }

  async generate(): Promise<void> {
    this.log('Starting test data generation...');

    try {
      await this.generateWorkspaces();
      await this.generateUsers();
      await this.generateTrends();
      await this.generateDiscussions();
      await this.generateTrendDiscussions();
      await this.generateTrendMetrics();
      await this.generateCollections();
      await this.generateSavedTrends();

      this.log('Test data generation completed successfully!');
      this.log(`Generated:`);
      this.log(`  - ${this.config.workspacesCount} workspaces`);
      this.log(`  - ${this.config.usersCount} users`);
      this.log(`  - ${this.config.trendsCount} trends`);
      this.log(`  - ${this.config.discussionsCount} discussions`);
    } catch (error) {
      this.log(`Error during generation: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI execution
async function main() {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://localhost/trend_hijacker';

  const generator = new TestDataGenerator({
    connectionString,
    trendsCount: parseInt(process.env.TRENDS_COUNT || '10000'),
    discussionsCount: parseInt(process.env.DISCUSSIONS_COUNT || '100000'),
    usersCount: parseInt(process.env.USERS_COUNT || '1000'),
    workspacesCount: parseInt(process.env.WORKSPACES_COUNT || '500'),
    batchSize: 1000,
    logProgress: true,
  });

  try {
    await generator.generate();
  } finally {
    await generator.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TestDataGenerator };
