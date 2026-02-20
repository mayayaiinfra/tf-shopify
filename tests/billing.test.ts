import { describe, it, expect } from "vitest";
import { PLANS, getPlan, canWrite, getMaxNodes } from "../app/lib/billing";

describe("Billing", () => {
  it("free plan limits node count to 3", () => {
    expect(getMaxNodes("free")).toBe(3);
    expect(PLANS.free.maxNodes).toBe(3);
  });

  it("pro plan allows unlimited nodes", () => {
    expect(getMaxNodes("pro")).toBe(Infinity);
    expect(PLANS.pro.maxNodes).toBe(Infinity);
  });

  it("free plan has no write access", () => {
    expect(canWrite("free")).toBe(false);
    expect(PLANS.free.writeAccess).toBe(false);
  });

  it("pro plan has write access", () => {
    expect(canWrite("pro")).toBe(true);
    expect(PLANS.pro.writeAccess).toBe(true);
  });

  it("unknown plan defaults to free", () => {
    const plan = getPlan("unknown");
    expect(plan.name).toBe("Free");
    expect(plan.maxNodes).toBe(3);
  });

  it("subscription create mutation has correct variables", () => {
    const { CREATE_SUBSCRIPTION_MUTATION } = require("../app/lib/billing");

    expect(CREATE_SUBSCRIPTION_MUTATION).toContain("appSubscriptionCreate");
    expect(CREATE_SUBSCRIPTION_MUTATION).toContain("price");
    expect(CREATE_SUBSCRIPTION_MUTATION).toContain("returnUrl");
    expect(CREATE_SUBSCRIPTION_MUTATION).toContain("EVERY_30_DAYS");
  });
});
