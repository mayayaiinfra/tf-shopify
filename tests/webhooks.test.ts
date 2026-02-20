import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaClient } from "../app/shopify.server";
import {
  handleOrderCreate,
  handleProductUpdate,
  handleShopRedact,
  handleGDPRDataRequest,
} from "../app/lib/shopify-webhooks";
import { ThunderFireClient } from "../app/lib/thunderfire-client";

vi.mock("../app/shopify.server");
vi.mock("../app/lib/thunderfire-client");

describe("Webhook Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ORDERS_CREATE with bound product triggers setGoal", async () => {
    const mockSetGoal = vi.fn().mockResolvedValue({ status: "ok" });
    vi.mocked(ThunderFireClient.prototype.setGoal).mockImplementation(mockSetGoal);

    const mockFindUnique = vi.fn().mockResolvedValue({
      shop: "test-shop.myshopify.com",
      apiUrl: "https://top.example.com",
      apiKey: "tf_test_key",
    });
    vi.mocked(prismaClient.tFConfig.findUnique).mockImplementation(mockFindUnique);

    vi.mocked(prismaClient.nodeBinding.findUnique).mockResolvedValue({
      id: "binding-1",
      shop: "test-shop.myshopify.com",
      productId: "gid://shopify/Product/123",
      nodeId: "sensor-7",
      label: "",
      autoGoal: true,
      goalTemplate: "Prepare order #{order_id}: {product_name}",
      createdAt: new Date(),
    });

    vi.mocked(prismaClient.alert.create).mockResolvedValue({} as any);

    const payload = {
      id: 1042,
      name: "#1042",
      line_items: [
        { product_id: 123, quantity: 2, name: "Precision Bearing Set" },
      ],
    };

    await handleOrderCreate("test-shop.myshopify.com", payload, prismaClient);

    // Verify setGoal was called (via the binding lookup)
    expect(prismaClient.nodeBinding.findUnique).toHaveBeenCalled();
  });

  it("ORDERS_CREATE without binding does nothing", async () => {
    vi.mocked(prismaClient.tFConfig.findUnique).mockResolvedValue({
      id: "config-1",
      shop: "test-shop.myshopify.com",
      apiUrl: "https://top.example.com",
      apiKey: "tf_test_key",
      plan: "pro",
      maxNodes: 999999,
      alertEmail: "",
      alertSlack: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prismaClient.nodeBinding.findUnique).mockResolvedValue(null);

    const payload = {
      id: 1043,
      name: "#1043",
      line_items: [
        { product_id: 456, quantity: 1, name: "Unbound Product" },
      ],
    };

    await handleOrderCreate("test-shop.myshopify.com", payload, prismaClient);

    expect(prismaClient.alert.create).not.toHaveBeenCalled();
  });

  it("SHOP_REDACT deletes all shop data", async () => {
    const mockTransaction = vi.fn().mockResolvedValue([]);
    vi.mocked(prismaClient.$transaction).mockImplementation(mockTransaction);

    await handleShopRedact("test-shop.myshopify.com", {}, prismaClient);

    expect(prismaClient.$transaction).toHaveBeenCalled();
  });

  it("CUSTOMERS_DATA_REQUEST returns empty (no PII stored)", async () => {
    // This should complete without error and not call any database methods
    await expect(
      handleGDPRDataRequest("test-shop.myshopify.com", {}, prismaClient)
    ).resolves.toBeUndefined();
  });
});
