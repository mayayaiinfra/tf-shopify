import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prismaClient } from "~/shopify.server";
import { ThunderFireClient, TFApiError } from "~/lib/thunderfire-client";

/**
 * App Proxy endpoint for storefront health widget.
 * Receives requests from storefront via Shopify App Proxy:
 * /apps/thunderfire/api/health?node_id=X&shop=mystore.myshopify.com
 *
 * This avoids CORS issues since Shopify proxies the request.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const nodeId = url.searchParams.get("node_id");
  const shop = url.searchParams.get("shop");

  if (!nodeId || !shop) {
    return json(
      { error: "Missing node_id or shop parameter" },
      { status: 400 }
    );
  }

  const config = await prismaClient.tFConfig.findUnique({
    where: { shop },
  });

  if (!config?.apiKey) {
    return json(
      { error: "Shop not configured", composite_score: 0, status: "Unknown" },
      { status: 200 }
    );
  }

  try {
    const client = new ThunderFireClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
    });

    const health = await client.nodeHealth(nodeId);

    const compositeScore = Math.round(
      (health.capability +
        health.health +
        health.intent +
        health.timeline +
        health.resources +
        health.authority +
        health.lifecycle) /
        7
    );

    let status = "Healthy";
    if (compositeScore < 50) status = "Critical";
    else if (compositeScore < 80) status = "Degraded";

    return json({
      composite_score: compositeScore,
      status,
      capability: health.capability,
      health: health.health,
      intent: health.intent,
      timeline: health.timeline,
      resources: health.resources,
      authority: health.authority,
      lifecycle: health.lifecycle,
    });
  } catch (err) {
    if (err instanceof TFApiError) {
      return json(
        { error: "Node not found", composite_score: 0, status: "Unavailable" },
        { status: 200 }
      );
    }
    return json(
      { error: "Service unavailable", composite_score: 0, status: "Unknown" },
      { status: 200 }
    );
  }
}
