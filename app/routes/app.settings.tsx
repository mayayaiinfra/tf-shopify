import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Button,
  Banner,
  Text,
  Select,
  InlineStack,
  Badge,
  Divider,
} from "@shopify/polaris";
import { useState } from "react";
import shopify, { prismaClient } from "~/shopify.server";
import { ThunderFireClient, TFApiError } from "~/lib/thunderfire-client";
import { PLANS, type PlanType } from "~/lib/billing";

interface LoaderData {
  apiUrl: string;
  apiKey: string;
  alertEmail: string;
  alertSlack: string;
  plan: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);

  const config = await prismaClient.tFConfig.findUnique({
    where: { shop: session.shop },
  });

  return json<LoaderData>({
    apiUrl: config?.apiUrl || "https://top.mayayai.com",
    apiKey: config?.apiKey || "",
    alertEmail: config?.alertEmail || "",
    alertSlack: config?.alertSlack || "",
    plan: config?.plan || "free",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save") {
    const apiUrl = formData.get("apiUrl") as string;
    const apiKey = formData.get("apiKey") as string;
    const alertEmail = formData.get("alertEmail") as string;
    const alertSlack = formData.get("alertSlack") as string;

    // Validate URL
    try {
      new URL(apiUrl);
    } catch {
      return json({ error: "Invalid API URL format" });
    }

    // Validate API key format
    if (apiKey && !/^tf_(live|test)_/.test(apiKey)) {
      return json({ error: "API key must start with tf_live_ or tf_test_" });
    }

    await prismaClient.tFConfig.upsert({
      where: { shop: session.shop },
      create: {
        shop: session.shop,
        apiUrl,
        apiKey,
        alertEmail,
        alertSlack,
      },
      update: {
        apiUrl,
        apiKey,
        alertEmail,
        alertSlack,
      },
    });

    return json({ success: true, message: "Settings saved" });
  }

  if (intent === "test") {
    const apiUrl = formData.get("apiUrl") as string;
    const apiKey = formData.get("apiKey") as string;

    try {
      const client = new ThunderFireClient({ apiUrl, apiKey });
      const result = await client.ping();
      const nodes = await client.listNodes();
      return json({
        testSuccess: true,
        message: `Connected! Version: ${result.version}, Nodes: ${nodes.length}`,
      });
    } catch (err) {
      if (err instanceof TFApiError) {
        return json({ error: `Connection failed: ${err.message}` });
      }
      return json({ error: "Connection failed: Unable to reach API" });
    }
  }

  if (intent === "upgrade") {
    // In real implementation, this would create a Shopify subscription
    // For now, just update the plan in the database
    await prismaClient.tFConfig.upsert({
      where: { shop: session.shop },
      create: {
        shop: session.shop,
        plan: "pro",
        maxNodes: 999999,
      },
      update: {
        plan: "pro",
        maxNodes: 999999,
      },
    });

    return json({ success: true, message: "Upgraded to Pro!" });
  }

  return json({ error: "Unknown action" });
}

export default function Settings() {
  const data = useLoaderData<LoaderData>();
  const actionData = useActionData<{
    error?: string;
    success?: boolean;
    message?: string;
    testSuccess?: boolean;
  }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [apiUrl, setApiUrl] = useState(data.apiUrl);
  const [apiKey, setApiKey] = useState(data.apiKey);
  const [alertEmail, setAlertEmail] = useState(data.alertEmail);
  const [alertSlack, setAlertSlack] = useState(data.alertSlack);

  const currentPlan = PLANS[data.plan as PlanType] || PLANS.free;

  return (
    <Page title="THUNDERFIRE Settings" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
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

        {actionData?.testSuccess && (
          <Layout.Section>
            <Banner tone="success">{actionData.message}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Connection</Text>
              <Form method="post">
                <BlockStack gap="300">
                  <TextField
                    label="API Endpoint"
                    name="apiUrl"
                    value={apiUrl}
                    onChange={setApiUrl}
                    placeholder="https://top.mayayai.com"
                    autoComplete="off"
                  />
                  <TextField
                    label="API Key"
                    name="apiKey"
                    value={apiKey}
                    onChange={setApiKey}
                    placeholder="tf_live_..."
                    type="password"
                    autoComplete="off"
                  />
                  <InlineStack gap="200">
                    <Button submit name="intent" value="test" loading={isSubmitting}>
                      Test Connection
                    </Button>
                    <Button submit name="intent" value="save" variant="primary" loading={isSubmitting}>
                      Save
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Notifications</Text>
              <Form method="post">
                <input type="hidden" name="apiUrl" value={apiUrl} />
                <input type="hidden" name="apiKey" value={apiKey} />
                <BlockStack gap="300">
                  <TextField
                    label="Alert Email"
                    name="alertEmail"
                    value={alertEmail}
                    onChange={setAlertEmail}
                    placeholder="ops@factory.com"
                    type="email"
                    autoComplete="off"
                  />
                  <TextField
                    label="Slack Webhook URL"
                    name="alertSlack"
                    value={alertSlack}
                    onChange={setAlertSlack}
                    placeholder="https://hooks.slack.com/..."
                    autoComplete="off"
                  />
                  <Select
                    label="Alert Level"
                    options={[
                      { label: "All alerts", value: "all" },
                      { label: "Warnings and critical", value: "warning" },
                      { label: "Critical only", value: "critical" },
                    ]}
                    value="warning"
                    onChange={() => {}}
                  />
                  <Button submit name="intent" value="save" loading={isSubmitting}>
                    Save Notifications
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Plan</Text>
              <InlineStack align="space-between">
                <BlockStack gap="100">
                  <Text as="span" fontWeight="bold">
                    Current Plan: {currentPlan.name}
                  </Text>
                  <Text as="span" tone="subdued">
                    {currentPlan.maxNodes === Infinity
                      ? "Unlimited nodes"
                      : `Up to ${currentPlan.maxNodes} nodes`}
                  </Text>
                </BlockStack>
                <Badge tone={data.plan === "pro" ? "success" : "info"}>
                  {data.plan === "pro" ? "Active" : "Free Tier"}
                </Badge>
              </InlineStack>
              <Divider />
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">Features</Text>
                {currentPlan.features.map((f, i) => (
                  <Text key={i} as="p">- {f}</Text>
                ))}
              </BlockStack>
              {data.plan === "free" && (
                <>
                  <Divider />
                  <Form method="post">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">
                        Upgrade to Pro - $29/month
                      </Text>
                      <Text as="p" tone="subdued">
                        Unlimited nodes, send commands and goals, product binding with
                        auto-goals, NOP marketplace access, priority alerts.
                      </Text>
                      <Button submit name="intent" value="upgrade" variant="primary">
                        Upgrade to Pro
                      </Button>
                    </BlockStack>
                  </Form>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
