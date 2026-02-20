import { BlockStack, InlineStack, Text, ProgressBar } from "@shopify/polaris";
import type { TFHealth } from "~/lib/thunderfire-client";

interface Props {
  health: TFHealth;
}

function getHealthTone(value: number): "success" | "warning" | "critical" {
  if (value >= 80) return "success";
  if (value >= 50) return "warning";
  return "critical";
}

interface HealthFieldProps {
  label: string;
  value: number;
}

function HealthField({ label, value }: HealthFieldProps) {
  return (
    <BlockStack gap="100">
      <InlineStack align="space-between">
        <Text as="span" variant="bodySm">{label}</Text>
        <Text as="span" variant="bodySm" fontWeight="bold">{value}%</Text>
      </InlineStack>
      <ProgressBar progress={value} tone={getHealthTone(value)} size="small" />
    </BlockStack>
  );
}

export function ChitralHealthBar({ health }: Props) {
  return (
    <BlockStack gap="300">
      <HealthField label="Capability" value={health.capability} />
      <HealthField label="Health" value={health.health} />
      <HealthField label="Intent" value={health.intent} />
      <HealthField label="Timeline" value={health.timeline} />
      <HealthField label="Resources" value={health.resources} />
      <HealthField label="Authority" value={health.authority} />
      <HealthField label="Lifecycle" value={health.lifecycle} />
    </BlockStack>
  );
}
