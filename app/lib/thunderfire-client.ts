import type { PrismaClient } from "@prisma/client";

export interface TFConfig {
  apiUrl: string;
  apiKey: string;
}

export interface TFNode {
  id: string;
  name: string;
  class_type: string;
  tier: number;
  health_score: number;
  theta_stage: number;
  online: boolean;
}

export interface TFHealth {
  capability: number;
  health: number;
  intent: number;
  timeline: number;
  resources: number;
  authority: number;
  lifecycle: number;
}

export interface TFService {
  id: string;
  name: string;
  category: string;
  provider_node: string;
  price_micro: number;
  tier_min: number;
}

export interface TFContract {
  id: string;
  service_id: string;
  service_name: string;
  consumer_node: string;
  provider_node: string;
  price_micro: number;
  usage_count: number;
  total_cost_micro: number;
  status: string;
}

export class ThunderFireClient {
  private apiUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: TFConfig, timeout = 15000) {
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.timeout = timeout;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.apiUrl}/api/v1${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new TFApiError(res.status, text || res.statusText, path);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(id);
    }
  }

  // -- Node Operations --
  async listNodes(): Promise<TFNode[]> {
    return this.request("GET", "/nodes");
  }

  async nodeHealth(nodeId: string): Promise<TFHealth> {
    return this.request("GET", `/nodes/${encodeURIComponent(nodeId)}/health`);
  }

  async setGoal(nodeId: string, goal: string): Promise<{ status: string }> {
    return this.request("POST", `/nodes/${encodeURIComponent(nodeId)}/goal`, {
      goal,
    });
  }

  async sendCommand(
    nodeId: string,
    command: string,
    params?: Record<string, unknown>
  ): Promise<{ status: string; result: unknown }> {
    return this.request("POST", `/nodes/${encodeURIComponent(nodeId)}/command`, {
      command,
      ...params,
    });
  }

  // -- Services --
  async listServices(
    category?: string,
    minTier?: number
  ): Promise<TFService[]> {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (minTier !== undefined) qs.set("min_tier", String(minTier));
    const q = qs.toString();
    return this.request("GET", `/services${q ? "?" + q : ""}`);
  }

  // -- Contracts --
  async listContracts(): Promise<TFContract[]> {
    return this.request("GET", "/contracts");
  }

  // -- Health check --
  async ping(): Promise<{ status: string; version: string }> {
    return this.request("GET", "/health");
  }
}

export class TFApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string
  ) {
    super(`TOP API ${status} on ${path}: ${body}`);
    this.name = "TFApiError";
  }
}

/**
 * Get client from shop's stored config.
 * Returns null if API key not configured.
 */
export async function getClientForShop(
  shop: string,
  prisma: PrismaClient
): Promise<ThunderFireClient | null> {
  const config = await prisma.tFConfig.findUnique({ where: { shop } });
  if (!config?.apiKey) return null;
  return new ThunderFireClient({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
  });
}
