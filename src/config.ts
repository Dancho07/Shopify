import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2025-01",
  shopifyScopes: (process.env.SHOPIFY_SCOPES || "read_products,read_content").split(","),
  shopifyApiKey: process.env.SHOPIFY_API_KEY || "",
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET || "",
  tokenSecret: process.env.TOKEN_ENCRYPTION_SECRET || "dev-secret-32-bytes-minimum-value",
  enableWriteProducts: process.env.ENABLE_WRITE_PRODUCTS === "true",
  enableAdvancedThemeEdits: process.env.ENABLE_ADVANCED_THEME_EDITS === "true",
  openAiApiKey: process.env.OPENAI_API_KEY
};
