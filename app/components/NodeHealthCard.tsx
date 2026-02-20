import { Card, BlockStack, InlineStack, Text, Badge, ProgressBar } from "@shopify/polaris";
import type { TFNode, TFHealth } from "~/lib/thunderfire-client";

interface Props {
  node: TFNode;
  health?: TFHealth;
  onClick?: () => void;
}

function getHealthTone(score: number): "success" | "warning" | "critical" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "critical";
}

export function NodeHealthCard({ node, health, onClick }: Props) {
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
    : node.health_score;

  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text variant="headingSm" as="h3">{node.name}</Text>
            <InlineStack gap="100">
              <Badge tone="info">T{node.tier}</Badge>
              <Badge tone={node.online ? "success" : "critical"}>
                {node.online ? "Online" : "Offline"}
              </Badge>
            </InlineStack>
          </InlineStack>

          <InlineStack align="space-between">
            <Text as="span" tone="subdued">{node.class_type}</Text>
            <Badge tone={getHealthTone(compositeScore)} size="large">
              {compositeScore}%
            </Badge>
          </InlineStack>

          <ProgressBar progress={compositeScore} tone={getHealthTone(compositeScore)} />

          {health && (
            <BlockStack gap="100">
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">Capability</Text>
                <Text as="span" variant="bodySm">{health.capability}%</Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">Health</Text>
                <Text as="span" variant="bodySm">{health.health}%</Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">Intent</Text>
                <Text as="span" variant="bodySm">{health.intent}%</Text>
              </InlineStack>
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    </div>
  );
}
