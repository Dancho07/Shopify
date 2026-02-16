import crypto from "node:crypto";
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

export function sanitizeShopDomain(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) {
    throw new Error("Please provide a valid myshopify domain (example.myshopify.com).");
  }
  return normalized;
}

export function buildShopifyOAuthUrl(shopDomain: string, state: string): string {
  const scopes = [
    ...config.shopifyScopes,
    ...(config.enableWriteProducts ? ["write_products"] : []),
    ...(config.enableAdvancedThemeEdits ? ["write_themes"] : [])
  ];

  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  url.searchParams.set("client_id", config.shopifyApiKey);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("redirect_uri", `${config.appUrl}/api/connect/callback`);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeOAuthCode(shopDomain: string, code: string): Promise<string> {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.shopifyApiKey,
      client_secret: config.shopifyApiSecret,
      code
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code (${response.status}).`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("Shopify OAuth did not return an access token.");
  }

  return payload.access_token as string;
}

export function createOAuthState(shopDomain: string): string {
  const nonce = crypto.randomBytes(18).toString("hex");
  return Buffer.from(JSON.stringify({ shopDomain, nonce, ts: Date.now() })).toString("base64url");
}

export function readOAuthState(state: string): { shopDomain: string; nonce: string; ts: number } {
  const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  if (!parsed.shopDomain || !parsed.nonce || !parsed.ts) {
    throw new Error("Invalid OAuth state.");
  }
  return parsed;
}
