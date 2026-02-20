import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaClient } from "../app/shopify.server";
import { handleGDPRRedact, handleShopRedact } from "../app/lib/shopify-webhooks";

vi.mock("../app/shopify.server");

describe("GDPR Compliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("customers/redact handler completes without error", async () => {
    // We don't store customer PII, so this should just complete
    const payload = {
      shop_id: 12345,
      shop_domain: "test-shop.myshopify.com",
      customer: {
        id: 67890,
        email: "customer@example.com",
        phone: "+1234567890",
      },
      orders_to_redact: [111, 222, 333],
    };

    await expect(
      handleGDPRRedact("test-shop.myshopify.com", payload, prismaClient)
    ).resolves.toBeUndefined();

    // Should not have called any delete methods since we don't store customer data
    expect(prismaClient.alert.deleteMany).not.toHaveBeenCalled();
    expect(prismaClient.nodeBinding.deleteMany).not.toHaveBeenCalled();
  });

  it("shop/redact deletes TFConfig + NodeBinding + Alert for shop", async () => {
    const mockDeleteMany = vi.fn().mockResolvedValue({ count: 5 });
    vi.mocked(prismaClient.alert.deleteMany).mockImplementation(mockDeleteMany);
    vi.mocked(prismaClient.nodeBinding.deleteMany).mockImplementation(mockDeleteMany);
    vi.mocked(prismaClient.tFConfig.deleteMany).mockImplementation(mockDeleteMany);
    vi.mocked(prismaClient.session.deleteMany).mockImplementation(mockDeleteMany);

    const mockTransaction = vi.fn().mockResolvedValue([
      { count: 10 }, // alerts
      { count: 5 },  // bindings
      { count: 1 },  // config
      { count: 2 },  // sessions
    ]);
    vi.mocked(prismaClient.$transaction).mockImplementation(mockTransaction);

    const payload = {
      shop_id: 12345,
      shop_domain: "closing-shop.myshopify.com",
    };

    await handleShopRedact("closing-shop.myshopify.com", payload, prismaClient);

    // Should have called transaction to delete all data
    expect(prismaClient.$transaction).toHaveBeenCalled();
  });
});
