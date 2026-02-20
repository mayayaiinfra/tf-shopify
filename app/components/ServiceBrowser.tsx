import { useState, useMemo } from "react";
import {
  IndexTable,
  Badge,
  Text,
  TextField,
  Select,
  BlockStack,
  InlineStack,
  EmptyState,
} from "@shopify/polaris";
import type { TFService } from "~/lib/thunderfire-client";

interface Props {
  services: TFService[];
  onServiceClick?: (service: TFService) => void;
}

function formatPrice(microUsd: number): string {
  return `$${(microUsd / 1_000_000).toFixed(6)}`;
}

export function ServiceBrowser({ services, onServiceClick }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => {
    return [...new Set(services.map((s) => s.category))].sort();
  }, [services]);

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
    <IndexTable.Row
      key={service.id}
      id={service.id}
      position={idx}
      onClick={() => onServiceClick?.(service)}
    >
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
          <p>Try adjusting your search or filter.</p>
        </EmptyState>
      )}
    </BlockStack>
  );
}
