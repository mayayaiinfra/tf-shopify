import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThunderFireClient, TFApiError } from "../app/lib/thunderfire-client";

describe("ThunderFireClient", () => {
  let client: ThunderFireClient;

  beforeEach(() => {
    client = new ThunderFireClient({
      apiUrl: "https://top.example.com",
      apiKey: "tf_test_key123",
    });
    vi.clearAllMocks();
  });

  it("listNodes() parses response correctly", async () => {
    const mockNodes = [
      { id: "node-1", name: "Sensor-7", class_type: "sensor", tier: 4, health_score: 92, theta_stage: 6, online: true },
      { id: "node-2", name: "AGV-02", class_type: "robot", tier: 7, health_score: 68, theta_stage: 3, online: true },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNodes),
    });

    const nodes = await client.listNodes();

    expect(nodes).toHaveLength(2);
    expect(nodes[0].name).toBe("Sensor-7");
    expect(nodes[1].tier).toBe(7);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://top.example.com/api/v1/nodes",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-API-Key": "tf_test_key123",
        }),
      })
    );
  });

  it("nodeHealth() returns 7 CHITRAL fields", async () => {
    const mockHealth = {
      capability: 85,
      health: 100,
      intent: 82,
      timeline: 60,
      resources: 78,
      authority: 95,
      lifecycle: 88,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHealth),
    });

    const health = await client.nodeHealth("node-1");

    expect(health.capability).toBe(85);
    expect(health.health).toBe(100);
    expect(health.intent).toBe(82);
    expect(health.timeline).toBe(60);
    expect(health.resources).toBe(78);
    expect(health.authority).toBe(95);
    expect(health.lifecycle).toBe(88);
  });

  it("setGoal() sends POST with goal body", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    await client.setGoal("node-1", "Monitor bearing every 30 minutes");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://top.example.com/api/v1/nodes/node-1/goal",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ goal: "Monitor bearing every 30 minutes" }),
      })
    );
  });

  it("ping() returns status", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok", version: "7.8.0" }),
    });

    const result = await client.ping();

    expect(result.status).toBe("ok");
    expect(result.version).toBe("7.8.0");
  });

  it("401 response throws TFApiError with status", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve("Invalid API key"),
    });

    await expect(client.listNodes()).rejects.toThrow(TFApiError);
    await expect(client.listNodes()).rejects.toMatchObject({
      status: 401,
    });
  });
});
