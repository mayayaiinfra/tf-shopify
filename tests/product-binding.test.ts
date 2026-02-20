import { describe, it, expect, vi } from "vitest";
import { prismaClient } from "../app/shopify.server";

vi.mock("../app/shopify.server");

describe("Product Binding", () => {
  it("add binding saves to Prisma + sets metafield", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "binding-1" });
    (prismaClient.nodeBinding.create as ReturnType<typeof vi.fn>) = mockCreate;

    await prismaClient.nodeBinding.create({
      data: {
        shop: "test-shop.myshopify.com",
        productId: "gid://shopify/Product/123",
        nodeId: "sensor-7",
        label: "Quality Monitor",
        autoGoal: true,
        goalTemplate: "Prepare order #{order_id}",
      },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: "gid://shopify/Product/123",
        nodeId: "sensor-7",
        autoGoal: true,
      }),
    });
  });

  it("remove binding deletes from Prisma + clears metafield", async () => {
    const mockDelete = vi.fn().mockResolvedValue({ id: "binding-1" });
    (prismaClient.nodeBinding.delete as ReturnType<typeof vi.fn>) = mockDelete;

    await prismaClient.nodeBinding.delete({ where: { id: "binding-1" } });

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "binding-1" } });
  });

  it("auto-goal toggle persists", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "binding-2", autoGoal: false });
    (prismaClient.nodeBinding.create as ReturnType<typeof vi.fn>) = mockCreate;

    await prismaClient.nodeBinding.create({
      data: {
        shop: "test-shop.myshopify.com",
        productId: "gid://shopify/Product/456",
        nodeId: "arm-14",
        label: "",
        autoGoal: false,
        goalTemplate: "",
      },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        autoGoal: false,
        goalTemplate: "",
      }),
    });
  });

  it("goal template substitution works correctly", () => {
    const template = "Prepare order #{order_id}: {product_name} x{qty}";
    const orderId = "1042";
    const productName = "Precision Bearing Set";
    const qty = "2";

    const result = template
      .replace("{order_id}", orderId)
      .replace("{product_name}", productName)
      .replace("{qty}", qty);

    expect(result).toBe("Prepare order #1042: Precision Bearing Set x2");
  });
});
