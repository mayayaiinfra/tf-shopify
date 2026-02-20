import { IndexTable, Badge, Text, Banner, EmptyState } from "@shopify/polaris";
import type { TFNode } from "~/lib/thunderfire-client";

interface Props {
  nodes: TFNode[];
  onNodeClick: (id: string) => void;
  maxNodes?: number;
  showUpgradeBanner?: boolean;
}

function getHealthBadge(score: number) {
  if (score >= 80) return <Badge tone="success">Healthy</Badge>;
  if (score >= 50) return <Badge tone="warning">Degraded</Badge>;
  return <Badge tone="critical">Critical</Badge>;
}

function getThetaStageName(stage: number): string {
  const stages = ["G", "V0", "V1", "C", "Ap", "Obe", "Ae", "Oe", "D", "Ac", "Ti", "n"];
  return stages[stage] || `Stage ${stage}`;
}

export function FleetTable({ nodes, onNodeClick, maxNodes, showUpgradeBanner }: Props) {
  const displayNodes = maxNodes ? nodes.slice(0, maxNodes) : nodes;

  if (nodes.length === 0) {
    return (
      <EmptyState
        heading="No nodes found"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>Connect your THUNDERFIRE nodes to see them here.</p>
      </EmptyState>
    );
  }

  const resourceName = {
    singular: "node",
    plural: "nodes",
  };

  const rowMarkup = displayNodes.map((node, index) => (
    <IndexTable.Row
      id={node.id}
      key={node.id}
      position={index}
      onClick={() => onNodeClick(node.id)}
    >
      <IndexTable.Cell>
        <Badge tone={node.online ? "success" : "critical"}>
          {node.online ? "Online" : "Offline"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {node.name}
        </Text>
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
    <>
      {showUpgradeBanner && maxNodes && nodes.length > maxNodes && (
        <Banner tone="warning">
          Showing {maxNodes} of {nodes.length} nodes. Upgrade to Pro for unlimited nodes.
        </Banner>
      )}
      <IndexTable
        resourceName={resourceName}
        itemCount={displayNodes.length}
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
    </>
  );
}
