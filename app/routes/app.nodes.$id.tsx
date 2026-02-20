import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  TextField,
  Banner,
  ProgressBar,
  Divider,
  IndexTable,
} from "@shopify/polaris";
import { useState } from "react";
import shopify, { prismaClient } from "~/shopify.server";
import { getClientForShop, type TFHealth } from "~/lib/thunderfire-client";
import { canWrite } from "~/lib/billing";

interface LoaderData {
  nodeId: string;
  health: TFHealth | null;
  bindings: Array<{ productId: string; label: string }>;
  alerts: Array<{ id: string; message: string; severity: string; createdAt: string }>;
  canWrite: boolean;
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const nodeId = params.id!;
  const client = await getClientForShop(session.shop, prismaClient);

  const config = await prismaClient.tFConfig.findUnique({
    where: { shop: session.shop },
  });
  const plan = config?.plan || "free";

  if (!client) {
    return json<LoaderData>({
      nodeId,
      health: null,
      bindings: [],
      alerts: [],
      canWrite: canWrite(plan),
      error: "API not configured",
    });
  }

  try {
    const [health, bindings, alerts] = await Promise.all([
      client.nodeHealth(nodeId),
      prismaClient.nodeBinding.findMany({
        where: { shop: session.shop, nodeId },
        select: { productId: true, label: true },
      }),
      prismaClient.alert.findMany({
        where: { shop: session.shop, nodeId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, message: true, severity: true, createdAt: true },
      }),
    ]);

    return json<LoaderData>({
      nodeId,
      health,
      bindings,
      alerts: alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      canWrite: canWrite(plan),
    });
  } catch (err) {
    return json<LoaderData>({
      nodeId,
      health: null,
      bindings: [],
      alerts: [],
      canWrite: canWrite(plan),
      error: err instanceof Error ? err.message : "Failed to fetch node health",
    });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const nodeId = params.id!;
  const formData = await request.formData();
  const goal = formData.get("goal") as string;

  const config = await prismaClient.tFConfig.findUnique({
    where: { shop: session.shop },
  });

  if (!canWrite(config?.plan || "free")) {
    return json({ error: "Upgrade to Pro to send goals" });
  }

  const client = await getClientForShop(session.shop, prismaClient);
  if (!client) {
    return json({ error: "API not configured" });
  }

  try {
    await client.setGoal(nodeId, goal);
    return json({ success: true, message: "Goal sent successfully" });
  } catch (err) {
    return json({
      error: err instanceof Error ? err.message : "Failed to send goal",
    });
  }
}

function getHealthColor(value: number): "success" | "warning" | "critical" {
  if (value >= 80) return "success";
  if (value >= 50) return "warning";
  return "critical";
}

function HealthBar({ label, value }: { label: string; value: number }) {
  return (
    <BlockStack gap="100">
      <InlineStack align="space-between">
        <Text as="span" variant="bodySm">{label}</Text>
        <Text as="span" variant="bodySm" fontWeight="bold">{value}%</Text>
      </InlineStack>
      <ProgressBar progress={value} tone={getHealthColor(value)} size="small" />
    </BlockStack>
  );
}

export default function NodeDetail() {
  const { nodeId, health, bindings, alerts, canWrite: canSendGoal, error } = useLoaderData<LoaderData>();
  const actionData = useActionData<{ error?: string; success?: boolean; message?: string }>();
  const [goal, setGoal] = useState("");

  const compositeScore = health
    ? Math.round(
        (health.capability +
          health.health +
          health.intent +
          health.timeline +
          health.resources +
          health.authority +
          health.lifecycle) /
          7
      )
    : 0;

  return (
    <Page
      title={`Node: ${nodeId}`}
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">{error}</Banner>
          </Layout.Section>
        )}

        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical">{actionData.error}</Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success">{actionData.message}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">CHITRAL Health</Text>
              {health ? (
                <>
                  <BlockStack gap="300">
                    <HealthBar label="Capability" value={health.capability} />
                    <HealthBar label="Health" value={health.health} />
                    <HealthBar label="Intent" value={health.intent} />
                    <HealthBar label="Timeline" value={health.timeline} />
                    <HealthBar label="Resources" value={health.resources} />
                    <HealthBar label="Authority" value={health.authority} />
                    <HealthBar label="Lifecycle" value={health.lifecycle} />
                  </BlockStack>
                  <Divider />
                  <InlineStack align="space-between">
                    <Text as="span" variant="headingSm">Composite Score</Text>
                    <Badge tone={getHealthColor(compositeScore)} size="large">
                      {compositeScore}%
                    </Badge>
                  </InlineStack>
                </>
              ) : (
                <Text as="p" tone="subdued">Health data unavailable</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Bound Products</Text>
              {bindings.length > 0 ? (
                <BlockStack gap="200">
                  {bindings.map((b) => (
                    <InlineStack key={b.productId} align="space-between">
                      <Text as="span">{b.label || b.productId}</Text>
                      <Button url="/app/bind" variant="plain">Manage</Button>
                    </InlineStack>
                  ))}
                </BlockStack>
              ) : (
                <Text as="p" tone="subdued">No products bound to this node</Text>
              )}
              <Button url="/app/bind">Bind Product</Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Set THETA Goal</Text>
              {!canSendGoal && (
                <Banner tone="warning">
                  Upgrade to Pro to send goals to nodes.
                </Banner>
              )}
              <Form method="post">
                <BlockStack gap="300">
                  <TextField
                    label="Goal"
                    name="goal"
                    value={goal}
                    onChange={setGoal}
                    placeholder="e.g., Monitor bearing #7 every 30 minutes"
                    autoComplete="off"
                    disabled={!canSendGoal}
                  />
                  <Button submit disabled={!canSendGoal || !goal.trim()}>
                    Send Goal
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Alert History</Text>
              {alerts.length > 0 ? (
                <IndexTable
                  resourceName={{ singular: "alert", plural: "alerts" }}
                  itemCount={alerts.length}
                  headings={[
                    { title: "Date" },
                    { title: "Severity" },
                    { title: "Message" },
                  ]}
                  selectable={false}
                >
                  {alerts.map((alert, idx) => (
                    <IndexTable.Row key={alert.id} id={alert.id} position={idx}>
                      <IndexTable.Cell>
                        {new Date(alert.createdAt).toLocaleString()}
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge
                          tone={
                            alert.severity === "critical"
                              ? "critical"
                              : alert.severity === "warning"
                              ? "warning"
                              : "info"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>{alert.message}</IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              ) : (
                <Text as="p" tone="subdued">No alerts for this node</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
