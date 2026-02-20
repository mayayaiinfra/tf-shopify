import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  IndexTable,
  Text,
  Button,
  Banner,
  TextField,
  Select,
  Checkbox,
  Modal,
  InlineStack,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import shopify, { prismaClient } from "~/shopify.server";
import { getClientForShop, type TFNode } from "~/lib/thunderfire-client";
import { canWrite } from "~/lib/billing";

interface Binding {
  id: string;
  productId: string;
  productTitle: string;
  nodeId: string;
  nodeName: string;
  autoGoal: boolean;
  goalTemplate: string;
}

interface LoaderData {
  bindings: Binding[];
  nodes: TFNode[];
  canWrite: boolean;
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await shopify.authenticate.admin(request);
  const client = await getClientForShop(session.shop, prismaClient);

  const config = await prismaClient.tFConfig.findUnique({
    where: { shop: session.shop },
  });
  const plan = config?.plan || "free";

  const rawBindings = await prismaClient.nodeBinding.findMany({
    where: { shop: session.shop },
  });

  // Fetch product titles from Shopify
  const productIds = rawBindings.map((b) => b.productId);
  let productMap: Record<string, string> = {};

  if (productIds.length > 0) {
    const response = await admin.graphql(
      `query getProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
          }
        }
      }`,
      { variables: { ids: productIds } }
    );
    const data = await response.json();
    for (const node of data.data?.nodes || []) {
      if (node?.id && node?.title) {
        productMap[node.id] = node.title;
      }
    }
  }

  let nodes: TFNode[] = [];
  if (client) {
    try {
      nodes = await client.listNodes();
    } catch {
      // Ignore errors, just show empty nodes
    }
  }

  const nodeMap: Record<string, string> = {};
  for (const n of nodes) {
    nodeMap[n.id] = n.name;
  }

  const bindings: Binding[] = rawBindings.map((b) => ({
    id: b.id,
    productId: b.productId,
    productTitle: productMap[b.productId] || b.productId,
    nodeId: b.nodeId,
    nodeName: nodeMap[b.nodeId] || b.nodeId,
    autoGoal: b.autoGoal,
    goalTemplate: b.goalTemplate,
  }));

  return json<LoaderData>({
    bindings,
    nodes,
    canWrite: canWrite(plan),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await shopify.authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const config = await prismaClient.tFConfig.findUnique({
    where: { shop: session.shop },
  });

  if (!canWrite(config?.plan || "free")) {
    return json({ error: "Upgrade to Pro to manage bindings" });
  }

  if (intent === "add") {
    const productId = formData.get("productId") as string;
    const nodeId = formData.get("nodeId") as string;
    const autoGoal = formData.get("autoGoal") === "true";
    const goalTemplate = formData.get("goalTemplate") as string;
    const label = formData.get("label") as string;

    // Create binding in database
    await prismaClient.nodeBinding.create({
      data: {
        shop: session.shop,
        productId,
        nodeId,
        label,
        autoGoal,
        goalTemplate,
      },
    });

    // Set metafield on product
    await admin.graphql(
      `mutation setMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: productId,
              namespace: "thunderfire",
              key: "node_id",
              value: nodeId,
              type: "single_line_text_field",
            },
          ],
        },
      }
    );

    return json({ success: true, message: "Binding created" });
  }

  if (intent === "delete") {
    const bindingId = formData.get("bindingId") as string;

    const binding = await prismaClient.nodeBinding.findUnique({
      where: { id: bindingId },
    });

    if (binding) {
      // Delete metafield
      await admin.graphql(
        `mutation deleteMetafield($input: MetafieldDeleteInput!) {
          metafieldDelete(input: $input) {
            deletedId
            userErrors { field message }
          }
        }`,
        {
          variables: {
            input: {
              ownerId: binding.productId,
              namespace: "thunderfire",
              key: "node_id",
            },
          },
        }
      );

      // Delete binding
      await prismaClient.nodeBinding.delete({ where: { id: bindingId } });
    }

    return json({ success: true, message: "Binding removed" });
  }

  return json({ error: "Unknown action" });
}

export default function BindPage() {
  const { bindings, nodes, canWrite: canBind, error } = useLoaderData<LoaderData>();
  const actionData = useActionData<{ error?: string; success?: boolean; message?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [label, setLabel] = useState("");
  const [autoGoal, setAutoGoal] = useState(false);
  const [goalTemplate, setGoalTemplate] = useState("Prepare order #{order_id}: {product_name} x{qty}");

  const toggleModal = useCallback(() => setModalOpen((open) => !open), []);

  const nodeOptions = [
    { label: "Select a node...", value: "" },
    ...nodes.map((n) => ({ label: `${n.name} (T${n.tier})`, value: n.id })),
  ];

  const resourceName = {
    singular: "binding",
    plural: "bindings",
  };

  const rowMarkup = bindings.map((binding, idx) => (
    <IndexTable.Row key={binding.id} id={binding.id} position={idx}>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold">{binding.productTitle}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{binding.nodeName}</IndexTable.Cell>
      <IndexTable.Cell>
        {binding.autoGoal ? "Yes" : "No"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="bindingId" value={binding.id} />
          <Button submit variant="plain" tone="critical" loading={isSubmitting}>
            Remove
          </Button>
        </Form>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Product <-> Node Binding"
      backAction={{ content: "Dashboard", url: "/app" }}
      primaryAction={{
        content: "Add Binding",
        onAction: toggleModal,
        disabled: !canBind,
      }}
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

        {!canBind && (
          <Layout.Section>
            <Banner tone="warning">
              Upgrade to Pro to create and manage product-node bindings.
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={bindings.length}
              headings={[
                { title: "Product" },
                { title: "Node" },
                { title: "Auto-Goal" },
                { title: "Actions" },
              ]}
              selectable={false}
              emptyState={
                <Text as="p" tone="subdued" alignment="center">
                  No bindings yet. Click "Add Binding" to link a product to a node.
                </Text>
              }
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalOpen}
        onClose={toggleModal}
        title="Add Product <-> Node Binding"
        primaryAction={{
          content: "Save Binding",
          onAction: () => {
            const form = document.getElementById("bind-form") as HTMLFormElement;
            form?.submit();
          },
          disabled: !productId || !nodeId,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: toggleModal },
        ]}
      >
        <Modal.Section>
          <Form method="post" id="bind-form">
            <input type="hidden" name="intent" value="add" />
            <BlockStack gap="400">
              <TextField
                label="Product ID (GID)"
                name="productId"
                value={productId}
                onChange={setProductId}
                placeholder="gid://shopify/Product/123456789"
                helpText="Use Shopify ResourcePicker in production"
                autoComplete="off"
              />
              <Select
                label="Node"
                name="nodeId"
                options={nodeOptions}
                value={nodeId}
                onChange={setNodeId}
              />
              <TextField
                label="Label"
                name="label"
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
              <input type="hidden" name="autoGoal" value={autoGoal ? "true" : "false"} />
              {autoGoal && (
                <TextField
                  label="Goal Template"
                  name="goalTemplate"
                  value={goalTemplate}
                  onChange={setGoalTemplate}
                  helpText="Variables: {order_id}, {order_name}, {product_name}, {qty}"
                  autoComplete="off"
                />
              )}
            </BlockStack>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
