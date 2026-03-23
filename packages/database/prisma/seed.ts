/**
 * Database seed script
 * Run with: npx ts-node prisma/seed.ts
 * Or: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create initial sources
  const sources = await Promise.all([
    prisma.source.upsert({
      where: { name: "reddit" },
      update: {},
      create: {
        name: "reddit",
        url: "https://reddit.com",
        category: "community",
      },
    }),
    prisma.source.upsert({
      where: { name: "hackernews" },
      update: {},
      create: {
        name: "hackernews",
        url: "https://news.ycombinator.com",
        category: "news",
      },
    }),
    prisma.source.upsert({
      where: { name: "producthunt" },
      update: {},
      create: {
        name: "producthunt",
        url: "https://producthunt.com",
        category: "marketplace",
      },
    }),
    prisma.source.upsert({
      where: { name: "indiehackers" },
      update: {},
      create: {
        name: "indiehackers",
        url: "https://indiehackers.com",
        category: "community",
      },
    }),
  ]);

  console.log(`✅ Created ${sources.length} sources`);

  // Create a sample trend for testing
  const sampleTrend = await prisma.trend.upsert({
    where: { id: "sample-trend-001" },
    update: {},
    create: {
      id: "sample-trend-001",
      title: "AI-Powered Automation Tools",
      summary:
        "Growing demand for AI tools that automate repetitive business tasks",
      opportunityScore: 78,
      velocityGrowth: 0.85,
      problemIntensity: 0.75,
      discussionVolume: 342,
      noveltyScore: 0.6,
      status: "ACTIVE",
      stage: "emerging",
      keywords: ["ai", "automation", "workflow", "productivity"],
      growthRate: 0.12,
      momentum: "accelerating",
      suggestedIdeas: [
        "Build AI data processing platform",
        "Create no-code automation builder",
        "Develop AI training service for teams",
      ],
      targetAudience: "SMBs and enterprise teams",
      marketPotential: "high",
    },
  });

  console.log(`✅ Created sample trend: ${sampleTrend.id}`);

  console.log("🌱 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
