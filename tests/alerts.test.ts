import { describe, it, expect, vi, beforeEach } from "vitest";

interface Alert {
  id: string;
  nodeId: string;
  type: "warning" | "critical" | "info";
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

describe("Alerts Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Alert Filtering", () => {
    const mockAlerts: Alert[] = [
      { id: "1", nodeId: "node-001", type: "critical", message: "CPU > 90%", timestamp: 1708617600, acknowledged: false },
      { id: "2", nodeId: "node-002", type: "warning", message: "Memory > 80%", timestamp: 1708617500, acknowledged: false },
      { id: "3", nodeId: "node-001", type: "info", message: "Update available", timestamp: 1708617400, acknowledged: true },
    ];

    it("filters alerts by type", () => {
      const filterByType = (alerts: Alert[], type: string) => {
        if (type === "all") return alerts;
        return alerts.filter(a => a.type === type);
      };

      expect(filterByType(mockAlerts, "critical")).toHaveLength(1);
      expect(filterByType(mockAlerts, "warning")).toHaveLength(1);
      expect(filterByType(mockAlerts, "all")).toHaveLength(3);
    });

    it("filters alerts by node", () => {
      const filterByNode = (alerts: Alert[], nodeId: string) => {
        if (!nodeId) return alerts;
        return alerts.filter(a => a.nodeId === nodeId);
      };

      expect(filterByNode(mockAlerts, "node-001")).toHaveLength(2);
      expect(filterByNode(mockAlerts, "node-002")).toHaveLength(1);
    });

    it("filters unacknowledged alerts", () => {
      const unacknowledged = mockAlerts.filter(a => !a.acknowledged);
      expect(unacknowledged).toHaveLength(2);
    });
  });

  describe("Alert Actions", () => {
    it("acknowledges alert", () => {
      const alert: Alert = {
        id: "1",
        nodeId: "node-001",
        type: "critical",
        message: "CPU > 90%",
        timestamp: Date.now(),
        acknowledged: false,
      };

      const acknowledge = (a: Alert): Alert => ({ ...a, acknowledged: true });
      const result = acknowledge(alert);

      expect(result.acknowledged).toBe(true);
      expect(result.id).toBe(alert.id);
    });

    it("formats timestamp correctly", () => {
      const formatTimestamp = (ts: number) => {
        const date = new Date(ts * 1000);
        return date.toISOString();
      };

      const result = formatTimestamp(1708617600);
      expect(result).toContain("2024-02-22");
    });
  });

  describe("Alert Badge", () => {
    it("returns correct badge variant for type", () => {
      const getBadgeVariant = (type: Alert["type"]) => {
        switch (type) {
          case "critical": return "critical";
          case "warning": return "warning";
          case "info": return "info";
          default: return "default";
        }
      };

      expect(getBadgeVariant("critical")).toBe("critical");
      expect(getBadgeVariant("warning")).toBe("warning");
      expect(getBadgeVariant("info")).toBe("info");
    });
  });
});
