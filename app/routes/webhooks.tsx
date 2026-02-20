import type { ActionFunctionArgs } from "@remix-run/node";
import shopify, { prismaClient } from "~/shopify.server";
import {
  handleOrderCreate,
  handleProductUpdate,
  handleGDPRDataRequest,
  handleGDPRRedact,
  handleShopRedact,
} from "~/lib/shopify-webhooks";

export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await shopify.authenticate.webhook(request);

  switch (topic) {
    case "ORDERS_CREATE":
      await handleOrderCreate(shop, payload as Parameters<typeof handleOrderCreate>[1], prismaClient);
      break;
    case "PRODUCTS_UPDATE":
      await handleProductUpdate(shop, payload as Parameters<typeof handleProductUpdate>[1], prismaClient);
      break;
    case "CUSTOMERS_DATA_REQUEST":
      await handleGDPRDataRequest(shop, payload as Parameters<typeof handleGDPRDataRequest>[1], prismaClient);
      break;
    case "CUSTOMERS_REDACT":
      await handleGDPRRedact(shop, payload as Parameters<typeof handleGDPRRedact>[1], prismaClient);
      break;
    case "SHOP_REDACT":
      await handleShopRedact(shop, payload as Parameters<typeof handleShopRedact>[1], prismaClient);
      break;
  }

  return new Response(null, { status: 200 });
}
