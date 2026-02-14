import { config } from "../config.js";

export async function shopifyGraphql<T>(shopDomain: string, accessToken: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://${shopDomain}/admin/api/${config.shopifyApiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(JSON.stringify(payload.errors));
  }
  return payload.data as T;
}
