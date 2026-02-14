import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { decrypt } from "../utils/crypto.js";
import { runAudit } from "../audit/runAudit.js";
import { shopifyGraphql } from "../services/shopify.js";
import { aiProvider } from "../ai/index.js";
import { config } from "../config.js";
import { FfmpegRenderer } from "../video/ffmpegRenderer.js";
import { enqueue } from "../services/jobs.js";
import { createAdProjectInput } from "../services/adProjects.js";

export const apiRouter = Router();
const renderer = new FfmpegRenderer();

async function getShopByDomain(shopDomain: string) {
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) throw new Error("Shop not installed.");
  return { ...shop, accessToken: decrypt(shop.accessTokenEncrypted) };
}

apiRouter.post("/shopify/graphql", async (req, res) => {
  const schema = z.object({ shopDomain: z.string(), query: z.string(), variables: z.record(z.any()).optional() });
  const parsed = schema.parse(req.body);
  const shop = await getShopByDomain(parsed.shopDomain);
  const data = await shopifyGraphql(parsed.shopDomain, shop.accessToken, parsed.query, parsed.variables);
  res.json({ data });
});

apiRouter.post("/audit/run", async (req, res) => {
  const { shopDomain } = z.object({ shopDomain: z.string() }).parse(req.body);
  const shop = await getShopByDomain(shopDomain);
  const count = await runAudit(shop.id, shopDomain, shop.accessToken);
  res.json({ findingsCreated: count });
});

apiRouter.get("/audit/results", async (req, res) => {
  const shopDomain = String(req.query.shopDomain || "");
  const shop = await getShopByDomain(shopDomain);
  const findings = await prisma.finding.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "desc" } });
  res.json({ findings });
});

apiRouter.post("/fix/apply", async (req, res) => {
  if (!config.enableWriteProducts) {
    return res.status(403).json({ error: "Enable one-click fixes before applying changes." });
  }
  const schema = z.object({ shopDomain: z.string(), productId: z.string(), title: z.string().optional(), descriptionHtml: z.string().optional() });
  const input = schema.parse(req.body);
  const shop = await getShopByDomain(input.shopDomain);
  const mutation = `#graphql
mutation ProductUpdate($input: ProductInput!) {
  productUpdate(input: $input) { product { id title } userErrors { field message } }
}`;
  const data = await shopifyGraphql<any>(input.shopDomain, shop.accessToken, mutation, {
    input: { id: input.productId, title: input.title, descriptionHtml: input.descriptionHtml }
  });

  await prisma.actionLog.create({
    data: { shopId: shop.id, actionType: "fix.apply.product_update", payloadJson: JSON.stringify(input) }
  });

  res.json({ result: data.productUpdate });
});

apiRouter.post("/content/generate", async (req, res) => {
  const schema = z.object({ shopDomain: z.string(), niche: z.string(), topProducts: z.array(z.string()).default([]) });
  const input = schema.parse(req.body);
  const shop = await getShopByDomain(input.shopDomain);
  const items = await aiProvider.generateContentPlan({ niche: input.niche, topProducts: input.topProducts });
  const month = new Date().toISOString().slice(0, 7);
  const saved = await prisma.contentPlan.create({ data: { shopId: shop.id, month, itemsJson: JSON.stringify(items) } });
  res.json({ id: saved.id, items });
});

apiRouter.post("/ads/create", async (req, res) => {
  const schema = z.object({ shopDomain: z.string(), productId: z.string(), template: z.enum(["problem-solution-cta", "3-benefits", "before-after"]) });
  const input = schema.parse(req.body);
  const shop = await getShopByDomain(input.shopDomain);

  const adCopy = await aiProvider.generateAdCopy({ productTitle: input.productId, template: input.template });
  const project = await prisma.adProject.create({
    data: createAdProjectInput({
      shopId: shop.id,
      productId: input.productId,
      template: input.template,
      script: adCopy.script,
      captions: adCopy.captions
    })
  });
  res.json({ project });
});

apiRouter.post("/ads/render", async (req, res) => {
  const schema = z.object({ projectId: z.string(), aspectRatio: z.enum(["9:16", "1:1", "16:9"]) });
  const input = schema.parse(req.body);
  const project = await prisma.adProject.findUnique({ where: { id: input.projectId }, include: { shop: true } });
  if (!project) return res.status(404).json({ error: "project not found" });

  await prisma.adProject.update({ where: { id: project.id }, data: { status: "rendering" } });
  enqueue(async () => {
    const result = await renderer.render(project.id, {
      aspectRatio: input.aspectRatio,
      productTitle: project.productId,
      imageUrls: [],
      captions: JSON.parse(project.captionsJson),
      script: project.script
    });
    await prisma.adProject.update({ where: { id: project.id }, data: { status: "complete", outputUrl: result.outputUrl } });
  });

  res.json({ status: "queued" });
});

apiRouter.get("/ads/status", async (req, res) => {
  const id = String(req.query.projectId || "");
  const project = await prisma.adProject.findUnique({ where: { id } });
  res.json({ project });
});

apiRouter.get("/ads/download", async (req, res) => {
  const id = String(req.query.projectId || "");
  const project = await prisma.adProject.findUnique({ where: { id } });
  if (!project?.outputUrl) return res.status(404).json({ error: "not rendered" });
  res.json({ outputUrl: project.outputUrl });
});
