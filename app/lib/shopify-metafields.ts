/**
 * Shopify metafield helpers for product <-> node binding
 */

export const TF_NAMESPACE = "thunderfire";
export const NODE_ID_KEY = "node_id";

/**
 * GraphQL mutation to set product metafield
 */
export const SET_METAFIELD_MUTATION = `
  mutation setMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to delete product metafield
 */
export const DELETE_METAFIELD_MUTATION = `
  mutation deleteMetafield($input: MetafieldDeleteInput!) {
    metafieldDelete(input: $input) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL query to get products with their metafields
 */
export const GET_PRODUCTS_WITH_METAFIELDS = `
  query getProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        featuredImage {
          url
        }
        metafield(namespace: "thunderfire", key: "node_id") {
          value
        }
      }
    }
  }
`;

export interface SetMetafieldInput {
  ownerId: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export function buildSetNodeMetafield(productId: string, nodeId: string): SetMetafieldInput {
  return {
    ownerId: productId,
    namespace: TF_NAMESPACE,
    key: NODE_ID_KEY,
    value: nodeId,
    type: "single_line_text_field",
  };
}
