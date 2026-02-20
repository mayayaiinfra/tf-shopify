import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Badge,
  Text,
  Button,
  BlockStack,
  Select,
  EmptyState,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { useState, useMemo } from "react";
import shopify, { prismaClient } from "~/shopify.server";

interface AlertItem {
  id: string;
  nodeId: string;
  severity: string;
  message: string;
  dismissed: boolean;
  createdAt: string;
}

interface LoaderData {
  alerts: AlertItem[];
  nodes: string[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);

  const alerts = await prismaClient.alert.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const nodes = [...new Set(alerts.map((a) => a.nodeId))].sort();

  return json<LoaderData>({
    alerts: alerts.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    nodes,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "dismiss") {
    const alertId = formData.get("alertId") as string;
    await prismaClient.alert.update({
      where: { id: alertId },
      data: { dismissed: true },
    });
    return json({ success: true });
  }

  if (intent === "dismiss-all") {
    await prismaClient.alert.updateMany({
      where: { shop: session.shop, dismissed: false },
      data: { dismissed: true },
    });
    return json({ success: true, message: "All alerts dismissed" });
  }

  return json({ error: "Unknown action" });
}

function getSeverityTone(severity: string): "success" | "warning" | "critical" | "info" {
  switch (severity.toLowerCase()) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "info";
  }
}

export default function AlertsPage() {
  const { alerts, nodes } = useLoaderData<LoaderData>();
  const actionData = useActionData<{ success?: boolean; message?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [severityFilter, setSeverityFilter] = useState("");
  const [nodeFilter, setNodeFilter] = useState("");
  const [showDismissed, setShowDismissed] = useState(false);

  const severityOptions = [
    { label: "All severities", value: "" },
    { label: "Critical", value: "critical" },
    { label: "Warning", value: "warning" },
    { label: "Info", value: "info" },
  ];

  const nodeOptions = [
    { label: "All nodes", value: "" },
    ...nodes.map((n) => ({ label: n, value: n })),
  ];

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSeverity = !severityFilter || a.severity === severityFilter;
      const matchesNode = !nodeFilter || a.nodeId === nodeFilter;
      const matchesDismissed = showDismissed || !a.dismissed;
      return matchesSeverity && matchesNode && matchesDismissed;
    });
  }, [alerts, severityFilter, nodeFilter, showDismissed]);

  const undismissedCount = alerts.filter((a) => !a.dismissed).length;

  const resourceName = {
    singular: "alert",
    plural: "alerts",
  };

  const rowMarkup = filteredAlerts.map((alert, idx) => (
    <IndexTable.Row key={alert.id} id={alert.id} position={idx}>
      <IndexTable.Cell>
        {new Date(alert.createdAt).toLocaleString()}
      </IndexTable.Cell>
      <IndexTable.Cell>{alert.nodeId}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={getSeverityTone(alert.severity)}>{alert.severity}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" tone={alert.dismissed ? "subdued" : undefined}>
          {alert.message}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {!alert.dismissed && (
          <Form method="post">
            <input type="hidden" name="intent" value="dismiss" />
            <input type="hidden" name="alertId" value={alert.id} />
            <Button submit variant="plain" loading={isSubmitting}>
              Dismiss
            </Button>
          </Form>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Alerts"
      backAction={{ content: "Dashboard", url: "/app" }}
      primaryAction={
        undismissedCount > 0
          ? {
              content: "Dismiss All",
              onAction: () => {
                const form = document.getElementById("dismiss-all-form") as HTMLFormElement;
                form?.submit();
              },
            }
          : undefined
      }
    >
      <Form method="post" id="dismiss-all-form">
        <input type="hidden" name="intent" value="dismiss-all" />
      </Form>

      <Layout>
        {actionData?.message && (
          <Layout.Section>
            <Banner tone="success">{actionData.message}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="400" wrap={false}>
                <div style={{ minWidth: "150px" }}>
                  <Select
                    label="Severity"
                    options={severityOptions}
                    value={severityFilter}
                    onChange={setSeverityFilter}
                    labelHidden
                  />
                </div>
                <div style={{ minWidth: "150px" }}>
                  <Select
                    label="Node"
                    options={nodeOptions}
                    value={nodeFilter}
                    onChange={setNodeFilter}
                    labelHidden
                  />
                </div>
                <Button
                  onClick={() => setShowDismissed(!showDismissed)}
                  pressed={showDismissed}
                >
                  {showDismissed ? "Hide Dismissed" : "Show Dismissed"}
                </Button>
              </InlineStack>

              {filteredAlerts.length > 0 ? (
                <IndexTable
                  resourceName={resourceName}
                  itemCount={filteredAlerts.length}
                  headings={[
                    { title: "Date" },
                    { title: "Node" },
                    { title: "Severity" },
                    { title: "Message" },
                    { title: "Actions" },
                  ]}
                  selectable={false}
                >
                  {rowMarkup}
                </IndexTable>
              ) : (
                <EmptyState
                  heading="No alerts"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Your fleet is running smoothly!</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
