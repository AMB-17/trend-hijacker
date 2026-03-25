import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import trendsRoutes from "./trends";

vi.mock("../services/trend.service", () => ({
  trendService: {
    getTrends: vi.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    getTrendsForUser: vi.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    getTrendingTopics: vi.fn().mockResolvedValue([]),
    getTrendById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../services/saved-trend.service", () => ({
  savedTrendService: {
    listSavedTrends: vi.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    saveTrend: vi.fn().mockResolvedValue({ savedAt: new Date("2026-01-01T00:00:00Z") }),
    removeSavedTrend: vi.fn().mockResolvedValue(true),
  },
}));

describe("trends routes personalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid saved trends query", async () => {
    const app = Fastify();
    await app.register(trendsRoutes, { prefix: "/api/trends" });

    const response = await app.inject({
      method: "GET",
      url: "/api/trends/saved",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { message: "Invalid query parameters" },
    });

    await app.close();
  });

  it("allows saving a trend for a user", async () => {
    const app = Fastify();
    await app.register(trendsRoutes, { prefix: "/api/trends" });

    const response = await app.inject({
      method: "POST",
      url: "/api/trends/saved",
      payload: {
        userId: "user_123",
        trendId: "trend_123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        userId: "user_123",
        trendId: "trend_123",
      },
    });

    await app.close();
  });

  it("uses personalized trend fetch when userId is provided", async () => {
    const app = Fastify();
    await app.register(trendsRoutes, { prefix: "/api/trends" });

    const response = await app.inject({
      method: "GET",
      url: "/api/trends?userId=user_123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true });

    await app.close();
  });

  it("returns 404 when deleting an unsaved trend", async () => {
    const { savedTrendService } = await import("../services/saved-trend.service");
    vi.mocked(savedTrendService.removeSavedTrend).mockResolvedValueOnce(false);

    const app = Fastify();
    await app.register(trendsRoutes, { prefix: "/api/trends" });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/trends/saved/trend_123?userId=user_123",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      success: false,
      error: { message: "Saved trend not found" },
    });

    await app.close();
  });
});
