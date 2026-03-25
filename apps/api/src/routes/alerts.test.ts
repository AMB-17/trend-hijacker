import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import alertsRoutes from "./alerts";
import { ApiErrorResponseSchema } from "@packages/types";

vi.mock("../services/alert.service", () => ({
  alertService: {
    listAlerts: vi.fn().mockResolvedValue([]),
    createAlert: vi.fn().mockResolvedValue({ id: "a1", name: "Exploding AI" }),
    updateAlert: vi.fn().mockResolvedValue({ id: "a1", name: "Updated" }),
    deleteAlert: vi.fn().mockResolvedValue(true),
    evaluateAlerts: vi.fn().mockResolvedValue([{ alertId: "a1", matchedTrendIds: ["t1"], matchedCount: 1 }]),
  },
}));

describe("alerts routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates list query", async () => {
    const app = Fastify();
    await app.register(alertsRoutes, { prefix: "/api/alerts" });

    const response = await app.inject({ method: "GET", url: "/api/alerts" });
    expect(response.statusCode).toBe(400);
    const body = ApiErrorResponseSchema.parse(response.json());
    expect(body.error.code).toBe("INVALID_QUERY_PARAMETERS");
    expect(body.error.timestamp).toBeTruthy();

    await app.close();
  });

  it("creates alert", async () => {
    const app = Fastify();
    await app.register(alertsRoutes, { prefix: "/api/alerts" });

    const response = await app.inject({
      method: "POST",
      url: "/api/alerts",
      payload: {
        userId: "u1",
        name: "Exploding AI",
        channel: "in_app",
        enabled: true,
        rule: {
          minOpportunityScore: 75,
          stages: ["exploding"],
          keywords: ["ai"],
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ success: true });

    await app.close();
  });

  it("evaluates alerts", async () => {
    const app = Fastify();
    await app.register(alertsRoutes, { prefix: "/api/alerts" });

    const response = await app.inject({
      method: "GET",
      url: "/api/alerts/evaluate?userId=u1&limit=10",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      meta: { evaluated: 1 },
    });

    await app.close();
  });
});
