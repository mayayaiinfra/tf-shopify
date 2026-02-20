import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { ChitralHealthBar } from "../app/components/ChitralHealthBar";
import { ThetaStatusBadge } from "../app/components/ThetaStatusBadge";
import type { TFHealth } from "../app/lib/thunderfire-client";

const mockHealth: TFHealth = {
  capability: 85,
  health: 100,
  intent: 82,
  timeline: 60,
  resources: 45,
  authority: 95,
  lifecycle: 88,
};

function renderWithPolaris(component: React.ReactNode) {
  return render(
    <AppProvider i18n={enTranslations}>
      {component}
    </AppProvider>
  );
}

describe("ChitralHealthBar", () => {
  it("renders 7 bars", () => {
    renderWithPolaris(<ChitralHealthBar health={mockHealth} />);

    expect(screen.getByText("Capability")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Intent")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Authority")).toBeInTheDocument();
    expect(screen.getByText("Lifecycle")).toBeInTheDocument();
  });

  it("shows correct percentages", () => {
    renderWithPolaris(<ChitralHealthBar health={mockHealth} />);

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });
});

describe("ThetaStatusBadge", () => {
  it("shows correct stage label", () => {
    renderWithPolaris(<ThetaStatusBadge stage={6} />);

    // Stage 6 is "Ae" (Execute)
    expect(screen.getByText("Ae")).toBeInTheDocument();
  });

  it("shows Given for stage 0", () => {
    renderWithPolaris(<ThetaStatusBadge stage={0} />);
    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("shows efficiency for stage 11", () => {
    renderWithPolaris(<ThetaStatusBadge stage={11} />);
    expect(screen.getByText("n")).toBeInTheDocument();
  });
});
