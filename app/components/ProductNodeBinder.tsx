import { useState } from "react";
import {
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  Select,
  Checkbox,
  Modal,
} from "@shopify/polaris";
import type { TFNode } from "~/lib/thunderfire-client";

interface Binding {
  id: string;
  productId: string;
  productTitle: string;
  nodeId: string;
  autoGoal: boolean;
  goalTemplate: string;
}

interface Props {
  bindings: Binding[];
  nodes: TFNode[];
  onAddBinding: (binding: {
    productId: string;
    nodeId: string;
    label: string;
    autoGoal: boolean;
    goalTemplate: string;
  }) => void;
  onRemoveBinding: (bindingId: string) => void;
  disabled?: boolean;
}

export function ProductNodeBinder({
  bindings,
  nodes,
  onAddBinding,
  onRemoveBinding,
  disabled,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [label, setLabel] = useState("");
  const [autoGoal, setAutoGoal] = useState(false);
  const [goalTemplate, setGoalTemplate] = useState(
    "Prepare order #{order_id}: {product_name} x{qty}"
  );

  const nodeOptions = [
    { label: "Select a node...", value: "" },
    ...nodes.map((n) => ({ label: `${n.name} (T${n.tier})`, value: n.id })),
  ];

  const handleSave = () => {
    onAddBinding({
      productId,
      nodeId,
      label,
      autoGoal,
      goalTemplate: autoGoal ? goalTemplate : "",
    });
    setModalOpen(false);
    setProductId("");
    setNodeId("");
    setLabel("");
    setAutoGoal(false);
  };

  return (
    <BlockStack gap="300">
      {bindings.length > 0 ? (
        bindings.map((binding) => (
          <InlineStack key={binding.id} align="space-between">
            <BlockStack gap="100">
              <Text as="span" fontWeight="bold">{binding.productTitle}</Text>
              <Text as="span" tone="subdued" variant="bodySm">
                Node: {binding.nodeId} | Auto-goal: {binding.autoGoal ? "Yes" : "No"}
              </Text>
            </BlockStack>
            <Button
              onClick={() => onRemoveBinding(binding.id)}
              variant="plain"
              tone="critical"
              disabled={disabled}
            >
              Unbind
            </Button>
          </InlineStack>
        ))
      ) : (
        <Text as="p" tone="subdued">No products bound to nodes yet.</Text>
      )}

      <Button onClick={() => setModalOpen(true)} disabled={disabled}>
        + Bind Product
      </Button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Bind Product to Node"
        primaryAction={{
          content: "Save Binding",
          onAction: handleSave,
          disabled: !productId || !nodeId,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Product ID (GID)"
              value={productId}
              onChange={setProductId}
              placeholder="gid://shopify/Product/123456789"
              helpText="Use Shopify ResourcePicker in production"
              autoComplete="off"
            />
            <Select
              label="Node"
              options={nodeOptions}
              value={nodeId}
              onChange={setNodeId}
            />
            <TextField
              label="Label"
              value={label}
              onChange={setLabel}
              placeholder="e.g., Quality Monitor"
              autoComplete="off"
            />
            <Checkbox
              label="Send THETA goal on order?"
              checked={autoGoal}
              onChange={setAutoGoal}
            />
            {autoGoal && (
              <TextField
                label="Goal Template"
                value={goalTemplate}
                onChange={setGoalTemplate}
                helpText="Variables: {order_id}, {order_name}, {product_name}, {qty}"
                autoComplete="off"
              />
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}
