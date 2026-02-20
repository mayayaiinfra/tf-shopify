import { Banner } from "@shopify/polaris";

interface Alert {
  id: string;
  nodeId: string;
  severity: string;
  message: string;
}

interface Props {
  alerts: Alert[];
  onViewNode?: (nodeId: string) => void;
  onDismiss?: (alertId: string) => void;
}

export function AlertBanner({ alerts, onViewNode, onDismiss }: Props) {
  if (alerts.length === 0) return null;

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  const displayAlerts = criticalAlerts.length > 0 ? criticalAlerts : warningAlerts;
  if (displayAlerts.length === 0) return null;

  const topAlert = displayAlerts[0];
  const tone = topAlert.severity === "critical" ? "critical" : "warning";

  const actions = [];
  if (onViewNode) {
    actions.push({
      content: "View Node",
      onAction: () => onViewNode(topAlert.nodeId),
    });
  }
  if (onDismiss) {
    actions.push({
      content: "Dismiss",
      onAction: () => onDismiss(topAlert.id),
    });
  }

  return (
    <Banner
      title={`${displayAlerts.length} ${topAlert.severity} alert${displayAlerts.length > 1 ? "s" : ""}`}
      tone={tone}
      action={actions[0]}
      secondaryAction={actions[1]}
    >
      <p>{topAlert.message}</p>
      {displayAlerts.length > 1 && (
        <p>and {displayAlerts.length - 1} more...</p>
      )}
    </Banner>
  );
}
