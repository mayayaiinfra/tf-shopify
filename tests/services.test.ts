import { describe, it, expect, vi, beforeEach } from "vitest";

interface Service {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  tierMin: string;
  price: { amount: number; unit: string };
}

describe("Services Page (NOP Marketplace)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Service Search", () => {
    const mockServices: Service[] = [
      { id: "svc-1", name: "ML Inference", provider: "acme", capabilities: ["inference", "gpu"], tierMin: "T5", price: { amount: 0.01, unit: "per_request" } },
      { id: "svc-2", name: "Temperature Monitor", provider: "sensors-co", capabilities: ["sensing", "logging"], tierMin: "T2", price: { amount: 0.001, unit: "per_hour" } },
      { id: "svc-3", name: "Navigation Assist", provider: "nav-ai", capabilities: ["navigation", "mapping"], tierMin: "T4", price: { amount: 0.05, unit: "per_request" } },
    ];

    it("searches services by name", () => {
      const search = (services: Service[], query: string) => {
        const q = query.toLowerCase();
        return services.filter(s => s.name.toLowerCase().includes(q));
      };

      expect(search(mockServices, "ML")).toHaveLength(1);
      expect(search(mockServices, "Monitor")).toHaveLength(1);
      expect(search(mockServices, "xyz")).toHaveLength(0);
    });

    it("filters services by capability", () => {
      const filterByCapability = (services: Service[], cap: string) => {
        return services.filter(s => s.capabilities.includes(cap));
      };

      expect(filterByCapability(mockServices, "inference")).toHaveLength(1);
      expect(filterByCapability(mockServices, "sensing")).toHaveLength(1);
    });

    it("filters services by tier", () => {
      const filterByTier = (services: Service[], tier: string) => {
        const tierNum = parseInt(tier.replace("T", ""));
        return services.filter(s => {
          const svcTier = parseInt(s.tierMin.replace("T", ""));
          return svcTier <= tierNum;
        });
      };

      expect(filterByTier(mockServices, "T5")).toHaveLength(3);
      expect(filterByTier(mockServices, "T3")).toHaveLength(1);
      expect(filterByTier(mockServices, "T1")).toHaveLength(0);
    });
  });

  describe("Price Formatting", () => {
    it("formats price with unit", () => {
      const formatPrice = (price: { amount: number; unit: string }) => {
        const unitMap: Record<string, string> = {
          per_request: "/req",
          per_hour: "/hr",
          per_month: "/mo",
        };
        return `$${price.amount.toFixed(3)}${unitMap[price.unit] || ""}`;
      };

      expect(formatPrice({ amount: 0.01, unit: "per_request" })).toBe("$0.010/req");
      expect(formatPrice({ amount: 5.0, unit: "per_month" })).toBe("$5.000/mo");
    });
  });

  describe("Service Negotiation", () => {
    it("validates negotiation requirements", () => {
      const validateRequirements = (req: { maxLatency?: number; minUptime?: number }) => {
        const errors: string[] = [];
        if (req.maxLatency !== undefined && req.maxLatency < 1) {
          errors.push("Latency must be at least 1ms");
        }
        if (req.minUptime !== undefined && (req.minUptime < 0 || req.minUptime > 100)) {
          errors.push("Uptime must be between 0 and 100");
        }
        return { valid: errors.length === 0, errors };
      };

      expect(validateRequirements({ maxLatency: 50, minUptime: 99.9 }).valid).toBe(true);
      expect(validateRequirements({ maxLatency: 0 }).valid).toBe(false);
      expect(validateRequirements({ minUptime: 150 }).valid).toBe(false);
    });
  });
});
