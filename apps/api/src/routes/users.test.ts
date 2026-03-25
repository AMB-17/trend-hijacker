import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import usersRoutes from "./users";

vi.mock("../services/user-preference.service", () => ({
  userPreferenceService: {
    getPreferences: vi.fn().mockResolvedValue({
      preferredStages: ["early_signal"],
      minOpportunityScore: 55,
      digestCadence: "daily",
    }),
    upsertPreferences: vi.fn().mockResolvedValue({
      preferredStages: ["early_signal"],
      minOpportunityScore: 55,
      digestCadence: "daily",
    }),
  },
}));

describe("users preferences routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing userId in query", async () => {
    const app = Fastify();
    await app.register(usersRoutes, { prefix: "/api/users" });

    const response = await app.inject({
      method: "GET",
      url: "/api/users/preferences",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: { message: "Invalid query parameters" },
    });

    await app.close();
  });

  it("returns preferences for valid user query", async () => {
    const app = Fastify();
    await app.register(usersRoutes, { prefix: "/api/users" });

    const response = await app.inject({
      method: "GET",
      url: "/api/users/preferences?userId=user_123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        preferredStages: ["early_signal"],
        minOpportunityScore: 55,
        digestCadence: "daily",
      },
    });

    await app.close();
  });

  it("updates preferences", async () => {
    const app = Fastify();
    await app.register(usersRoutes, { prefix: "/api/users" });

    const response = await app.inject({
      method: "PUT",
      url: "/api/users/preferences",
      payload: {
        userId: "user_123",
        preferences: {
          preferredStages: ["emerging", "exploding"],
          minOpportunityScore: 60,
          digestCadence: "weekly",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
    });

    await app.close();
  });
});
