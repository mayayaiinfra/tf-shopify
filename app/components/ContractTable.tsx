import { IndexTable, Badge, Text, BlockStack, InlineStack, Divider } from "@shopify/polaris";
import type { TFContract } from "~/lib/thunderfire-client";

interface Props {
  contracts: TFContract[];
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

export function ContractTable({ contracts }: Props) {
  const totalCost = contracts.reduce((sum, c) => sum + c.total_cost_micro, 0);

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
    <BlockStack gap="400">
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
      {contracts.length > 0 && (
        <>
          <Divider />
          <InlineStack align="end">
            <BlockStack gap="100">
              <Text as="span" variant="headingSm">Total NOP Spend</Text>
              <Text as="span" variant="headingLg" fontWeight="bold">
                {formatPrice(totalCost)}
              </Text>
            </BlockStack>
          </InlineStack>
        </>
      )}
    </BlockStack>
  );
}
