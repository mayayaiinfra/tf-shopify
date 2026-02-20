import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock fetch globally
global.fetch = vi.fn();

// Mock Shopify authentication
vi.mock("~/shopify.server", () => ({
  default: {
    authenticate: {
      admin: vi.fn().mockResolvedValue({
        session: { shop: "test-shop.myshopify.com" },
        admin: {
          graphql: vi.fn(),
        },
      }),
      webhook: vi.fn(),
    },
    registerWebhooks: vi.fn(),
    addDocumentResponseHeaders: vi.fn(),
  },
  prismaClient: {
    tFConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    nodeBinding: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    alert: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
