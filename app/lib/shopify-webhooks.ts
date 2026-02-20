import type { PrismaClient } from "@prisma/client";
import { getClientForShop, TFApiError } from "./thunderfire-client";

interface OrderLineItem {
  product_id?: number;
  quantity: number;
  name: string;
}

interface OrderPayload {
  id: number;
  name: string;
  line_items: OrderLineItem[];
}

interface ProductPayload {
  id: number;
  title: string;
}

interface GDPRPayload {
  shop_id?: number;
  shop_domain?: string;
  customer?: {
    id: number;
    email: string;
    phone: string;
  };
  orders_to_redact?: number[];
}

/**
 * Handle orders/create webhook
 * For each order line item with a bound node that has autoGoal enabled,
 * send a THETA goal to the node.
 */
export async function handleOrderCreate(
  shop: string,
  payload: OrderPayload,
  prisma: PrismaClient
): Promise<void> {
  const client = await getClientForShop(shop, prisma);
  if (!client) return;

  for (const item of payload.line_items) {
    if (!item.product_id) continue;

    const productGid = `gid://shopify/Product/${item.product_id}`;
    const binding = await prisma.nodeBinding.findUnique({
      where: { shop_productId: { shop, productId: productGid } },
    });

    if (binding?.autoGoal && binding.goalTemplate) {
      const goalText = binding.goalTemplate
        .replace("{order_id}", String(payload.id))
        .replace("{order_name}", payload.name)
        .replace("{product_name}", item.name)
        .replace("{qty}", String(item.quantity));

      try {
        await client.setGoal(binding.nodeId, goalText);

        // Log successful goal setting
        await prisma.alert.create({
          data: {
            shop,
            nodeId: binding.nodeId,
            severity: "info",
            message: `THETA goal set for order ${payload.name}: ${goalText}`,
          },
        });
      } catch (err) {
        const msg = err instanceof TFApiError
          ? `Failed to set goal: ${err.message}`
          : `Failed to set goal: ${String(err)}`;

        await prisma.alert.create({
          data: {
            shop,
            nodeId: binding.nodeId,
            severity: "warning",
            message: msg,
          },
        });
      }
    }
  }
}

/**
 * Handle products/update webhook
 * Currently just logs the update for future sync capabilities
 */
export async function handleProductUpdate(
  shop: string,
  payload: ProductPayload,
  prisma: PrismaClient
): Promise<void> {
  const productGid = `gid://shopify/Product/${payload.id}`;

  const binding = await prisma.nodeBinding.findUnique({
    where: { shop_productId: { shop, productId: productGid } },
  });

  if (binding) {
    // Log product update for bound nodes
    await prisma.alert.create({
      data: {
        shop,
        nodeId: binding.nodeId,
        severity: "info",
        message: `Bound product updated: ${payload.title}`,
      },
    });
  }
}

/**
 * Handle GDPR customers/data_request webhook
 * We don't store customer PII, so return empty response
 */
export async function handleGDPRDataRequest(
  _shop: string,
  _payload: GDPRPayload,
  _prisma: PrismaClient
): Promise<void> {
  // We don't store customer PII - only shop config and product-node bindings
  // Nothing to return
}

/**
 * Handle GDPR customers/redact webhook
 * We don't store customer PII, so nothing to delete
 */
export async function handleGDPRRedact(
  _shop: string,
  _payload: GDPRPayload,
  _prisma: PrismaClient
): Promise<void> {
  // We don't store customer PII
  // Nothing to delete
}

/**
 * Handle GDPR shop/redact webhook
 * Delete all data for this shop (fires 48 hours after uninstall)
 */
export async function handleShopRedact(
  shop: string,
  _payload: GDPRPayload,
  prisma: PrismaClient
): Promise<void> {
  // Delete all shop data
  await prisma.$transaction([
    prisma.alert.deleteMany({ where: { shop } }),
    prisma.nodeBinding.deleteMany({ where: { shop } }),
    prisma.tFConfig.deleteMany({ where: { shop } }),
    prisma.session.deleteMany({ where: { shop } }),
  ]);
}
