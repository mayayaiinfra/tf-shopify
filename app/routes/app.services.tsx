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
  TextField,
  Select,
  BlockStack,
  InlineStack,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import { useState, useMemo } from "react";
import shopify, { prismaClient } from "~/shopify.server";
import { getClientForShop, type TFService } from "~/lib/thunderfire-client";

interface LoaderData {
  services: TFService[];
  categories: string[];
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const client = await getClientForShop(session.shop, prismaClient);

  if (!client) {
    return json<LoaderData>({
      services: [],
      categories: [],
      error: "API not configured. Go to Settings to connect.",
    });
  }

  try {
    const services = await client.listServices();
    const categories = [...new Set(services.map((s) => s.category))].sort();
    return json<LoaderData>({ services, categories });
  } catch (err) {
    return json<LoaderData>({
      services: [],
      categories: [],
      error: err instanceof Error ? err.message : "Failed to load services",
    });
  }
}

function formatPrice(microUsd: number): string {
  return `$${(microUsd / 1_000_000).toFixed(6)}`;
}

export default function ServicesPage() {
  const { services, categories, error } = useLoaderData<LoaderData>();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categoryOptions = [
    { label: "All categories", value: "" },
    ...categories.map((c) => ({ label: c, value: c })),
  ];

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || s.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [services, search, categoryFilter]);

  const resourceName = {
    singular: "service",
    plural: "services",
  };

  const rowMarkup = filteredServices.map((service, idx) => (
    <IndexTable.Row key={service.id} id={service.id} position={idx}>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold">{service.name}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge>{service.category}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>{service.provider_node}</IndexTable.Cell>
      <IndexTable.Cell>{formatPrice(service.price_micro)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">T{service.tier_min}+</Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="NOP Service Marketplace"
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
              <InlineStack gap="400" wrap={false}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Search"
                    value={search}
                    onChange={setSearch}
                    placeholder="Search services..."
                    autoComplete="off"
                    labelHidden
                  />
                </div>
                <div style={{ minWidth: "200px" }}>
                  <Select
                    label="Category"
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    labelHidden
                  />
                </div>
              </InlineStack>

              {filteredServices.length > 0 ? (
                <IndexTable
                  resourceName={resourceName}
                  itemCount={filteredServices.length}
                  headings={[
                    { title: "Name" },
                    { title: "Category" },
                    { title: "Provider" },
                    { title: "Price/call" },
                    { title: "Min Tier" },
                  ]}
                  selectable={false}
                >
                  {rowMarkup}
                </IndexTable>
              ) : (
                <EmptyState
                  heading="No services found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {services.length === 0
                      ? "No services available in the NOP marketplace."
                      : "Try adjusting your search or filter."}
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
