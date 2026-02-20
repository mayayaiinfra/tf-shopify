import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  EmptyState,
  IndexTable,
  Badge,
  Banner,
  Text,
  BlockStack,
  InlineStack,
  Box,
  SkeletonBodyText,
} from "@shopify/polaris";
import shopify, { prismaClient } from "~/shopify.server";
import { getClientForShop, TFApiError, type TFNode } from "~/lib/thunderfire-client";
import type { Alert } from "@prisma/client";
import { getMaxNodes } from "~/lib/billing";

interface LoaderData {
  configured: boolean;
  nodes: TFNode[];
  alerts: Alert[];
  error?: string;
  plan: string;
  maxNodes: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const client = await getClientForShop(session.shop, prismaClient);

  const config = await prismaClient.tFConfig.findUnique({
    where: { shop: session.shop },
  });
  const plan = config?.plan || "free";
  const maxNodes = getMaxNodes(plan);

  if (!client) {
    return json<LoaderData>({
      configured: false,
      nodes: [],
      alerts: [],
      plan,
      maxNodes,
    });
  }

  try {
    const [nodes, alerts] = await Promise.all([
      client.listNodes(),
      prismaClient.alert.findMany({
        where: { shop: session.shop, dismissed: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
    return json<LoaderData>({
      configured: true,
      nodes: nodes.slice(0, maxNodes),
      alerts,
      plan,
      maxNodes,
    });
  } catch (err) {
    if (err instanceof TFApiError && err.status === 401) {
      return json<LoaderData>({
        configured: false,
        nodes: [],
        alerts: [],
        error: "Invalid API key",
        plan,
        maxNodes,
      });
    }
    throw err;
  }
}

function getHealthBadge(score: number) {
  if (score >= 80) return <Badge tone="success">Healthy</Badge>;
  if (score >= 50) return <Badge tone="warning">Degraded</Badge>;
  return <Badge tone="critical">Critical</Badge>;
}

function getOnlineBadge(online: boolean) {
  return online ? (
    <Badge tone="success">Online</Badge>
  ) : (
    <Badge tone="critical">Offline</Badge>
  );
}

function getThetaStageName(stage: number): string {
  const stages = ["G", "V0", "V1", "C", "Ap", "Obe", "Ae", "Oe", "D", "Ac", "Ti", "n"];
  return stages[stage] || `Stage ${stage}`;
}

export default function FleetDashboard() {
  const { configured, nodes, alerts, error, plan, maxNodes } = useLoaderData<LoaderData>();

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");

  if (!configured) {
    return (
      <Page title="THUNDERFIRE Fleet Dashboard">
        <Layout>
          <Layout.Section>
            {error && (
              <Banner tone="critical">
                {error}. Please check your settings.
              </Banner>
            )}
            <Card>
              <EmptyState
                heading="Connect to THUNDERFIRE"
                action={{
                  content: "Configure API",
                  url: "/app/settings",
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Connect your Shopify store to THUNDERFIRE to monitor your
                  autonomous node fleet, bind products to nodes, and receive
                  real-time health alerts.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const resourceName = {
    singular: "node",
    plural: "nodes",
  };

  const rowMarkup = nodes.map((node, index) => (
    <IndexTable.Row id={node.id} key={node.id} position={index}>
      <IndexTable.Cell>
        {getOnlineBadge(node.online)}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Link to={`/app/nodes/${node.id}`}>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {node.name}
          </Text>
        </Link>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge>{node.class_type}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">T{node.tier}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {getHealthBadge(node.health_score)}
        <Text variant="bodySm" as="span"> {node.health_score}%</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">{getThetaStageName(node.theta_stage)}</Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="THUNDERFIRE Fleet Dashboard"
      primaryAction={{
        content: "Settings",
        url: "/app/settings",
      }}
      secondaryActions={[
        { content: "Bind Products", url: "/app/bind" },
        { content: "View Alerts", url: "/app/alerts" },
      ]}
    >
      <Layout>
        {criticalAlerts.length > 0 && (
          <Layout.Section>
            <Banner
              title={`${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? "s" : ""}`}
              tone="critical"
              action={{ content: "View All Alerts", url: "/app/alerts" }}
            >
              <p>{criticalAlerts[0].message}</p>
              {criticalAlerts.length > 1 && (
                <p>and {criticalAlerts.length - 1} more...</p>
              )}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {plan === "free" && nodes.length >= maxNodes && (
            <Banner tone="warning">
              Free plan shows up to {maxNodes} nodes.{" "}
              <Link to="/app/settings">Upgrade to Pro</Link> for unlimited nodes.
            </Banner>
          )}
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={nodes.length}
              headings={[
                { title: "Status" },
                { title: "Name" },
                { title: "Type" },
                { title: "Tier" },
                { title: "Health" },
                { title: "THETA Stage" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">Quick Stats</Text>
                <InlineStack align="space-between">
                  <Text as="span">Nodes online</Text>
                  <Text as="span" fontWeight="bold">
                    {nodes.filter((n) => n.online).length}/{nodes.length}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span">Healthy</Text>
                  <Text as="span" fontWeight="bold">
                    {nodes.filter((n) => n.health_score >= 80).length}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span">Critical</Text>
                  <Text as="span" fontWeight="bold" tone="critical">
                    {nodes.filter((n) => n.health_score < 50).length}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">Quick Actions</Text>
                <Link to="/app/services">Browse NOP Services</Link>
                <Link to="/app/contracts">View Contracts</Link>
                <Link to="/app/bind">Product Bindings</Link>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
