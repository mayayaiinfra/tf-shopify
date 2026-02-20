export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    maxNodes: 3,
    writeAccess: false,
    features: ["View up to 3 nodes", "Health monitoring", "Basic alerts"],
  },
  pro: {
    name: "Pro",
    price: 29.0, // USD/month
    maxNodes: Infinity,
    writeAccess: true,
    features: [
      "Unlimited nodes",
      "Send commands + goals",
      "Product <-> Node binding",
      "Order webhooks -> THETA goals",
      "NOP service marketplace",
      "Priority alerts",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlan(planName: string): (typeof PLANS)[PlanType] {
  if (planName in PLANS) {
    return PLANS[planName as PlanType];
  }
  return PLANS.free;
}

export function canWrite(planName: string): boolean {
  return getPlan(planName).writeAccess;
}

export function getMaxNodes(planName: string): number {
  return getPlan(planName).maxNodes;
}

/**
 * GraphQL mutation to create Shopify subscription
 */
export const CREATE_SUBSCRIPTION_MUTATION = `
  mutation createSubscription($name: String!, $price: Decimal!, $returnUrl: URL!) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            price: { amount: $price, currencyCode: USD }
            interval: EVERY_30_DAYS
          }
        }
      }]
      test: true
    ) {
      appSubscription { id }
      confirmationUrl
      userErrors { field message }
    }
  }
`;

/**
 * GraphQL query to check subscription status
 */
export const GET_SUBSCRIPTION_QUERY = `
  query getSubscription {
    appInstallation {
      activeSubscriptions {
        id
        name
        status
        lineItems {
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price { amount currencyCode }
              }
            }
          }
        }
      }
    }
  }
`;
