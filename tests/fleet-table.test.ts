import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { FleetTable } from "../app/components/FleetTable";
import type { TFNode } from "../app/lib/thunderfire-client";

const mockNodes: TFNode[] = [
  { id: "node-1", name: "Sensor-7", class_type: "sensor", tier: 4, health_score: 92, theta_stage: 6, online: true },
  { id: "node-2", name: "AGV-02", class_type: "robot", tier: 7, health_score: 68, theta_stage: 3, online: true },
  { id: "node-3", name: "Arm-14", class_type: "actuator", tier: 6, health_score: 23, theta_stage: 0, online: false },
  { id: "node-4", name: "Drone-01", class_type: "drone", tier: 5, health_score: 85, theta_stage: 5, online: true },
];

function renderWithPolaris(component: React.ReactNode) {
  return render(
    <AppProvider i18n={enTranslations}>
      {component}
    </AppProvider>
  );
}

describe("FleetTable", () => {
  it("renders correct number of rows", () => {
    renderWithPolaris(
      <FleetTable nodes={mockNodes} onNodeClick={() => {}} />
    );

    // Each node should be in the table
    expect(screen.getByText("Sensor-7")).toBeInTheDocument();
    expect(screen.getByText("AGV-02")).toBeInTheDocument();
    expect(screen.getByText("Arm-14")).toBeInTheDocument();
    expect(screen.getByText("Drone-01")).toBeInTheDocument();
  });

  it("shows Upgrade banner when nodes > maxNodes", () => {
    renderWithPolaris(
      <FleetTable
        nodes={mockNodes}
        onNodeClick={() => {}}
        maxNodes={3}
        showUpgradeBanner={true}
      />
    );

    expect(screen.getByText(/3 of 4 nodes/i)).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Pro/i)).toBeInTheDocument();
  });

  it("empty state renders when no nodes", () => {
    renderWithPolaris(
      <FleetTable nodes={[]} onNodeClick={() => {}} />
    );

    expect(screen.getByText("No nodes found")).toBeInTheDocument();
  });
});
