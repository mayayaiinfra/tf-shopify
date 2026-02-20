import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Badge,
  Text,
  BlockStack,
  InlineStack,
  EmptyState,
  Banner,
  Divider,
} from "@shopify/polaris";
import shopify, { prismaClient } from "~/shopify.server";
import { getClientForShop, type TFContract } from "~/lib/thunderfire-client";

interface LoaderData {
  contracts: TFContract[];
  totalCostMicro: number;
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const client = await getClientForShop(session.shop, prismaClient);

  if (!client) {
    return json<LoaderData>({
      contracts: [],
      totalCostMicro: 0,
      error: "API not configured. Go to Settings to connect.",
    });
  }

  try {
    const contracts = await client.listContracts();
    const totalCostMicro = contracts.reduce((sum, c) => sum + c.total_cost_micro, 0);
    return json<LoaderData>({ contracts, totalCostMicro });
  } catch (err) {
    return json<LoaderData>({
      contracts: [],
      totalCostMicro: 0,
      error: err instanceof Error ? err.message : "Failed to load contracts",
    });
  }
}

function formatPrice(microUsd: number): string {
  return `$${(microUsd / 1_000_000).toFixed(4)}`;
}

function getStatusTone(status: string): "success" | "warning" | "info" {
  switch (status.toLowerCase()) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    default:
      return "info";
  }
}

export default function ContractsPage() {
  const { contracts, totalCostMicro, error } = useLoaderData<LoaderData>();

  const resourceName = {
    singular: "contract",
    plural: "contracts",
  };

  const rowMarkup = contracts.map((contract, idx) => (
    <IndexTable.Row key={contract.id} id={contract.id} position={idx}>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold">{contract.service_name}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{contract.consumer_node}</IndexTable.Cell>
      <IndexTable.Cell>{contract.provider_node}</IndexTable.Cell>
      <IndexTable.Cell>{contract.usage_count}</IndexTable.Cell>
      <IndexTable.Cell>{formatPrice(contract.total_cost_micro)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={getStatusTone(contract.status)}>{contract.status}</Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="NOP Contracts"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">{error}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {contracts.length > 0 ? (
                <>
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={contracts.length}
                    headings={[
                      { title: "Service" },
                      { title: "Consumer" },
                      { title: "Provider" },
                      { title: "Usage" },
                      { title: "Total Cost" },
                      { title: "Status" },
                    ]}
                    selectable={false}
                  >
                    {rowMarkup}
                  </IndexTable>
                  <Divider />
                  <InlineStack align="end">
                    <BlockStack gap="100">
                      <Text as="span" variant="headingSm">
                        Total NOP Spend
                      </Text>
                      <Text as="span" variant="headingLg" fontWeight="bold">
                        {formatPrice(totalCostMicro)}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </>
              ) : (
                <EmptyState
                  heading="No active contracts"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Your nodes don't have any NOP service contracts yet.
                    Browse the marketplace to find services.
                  </p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
