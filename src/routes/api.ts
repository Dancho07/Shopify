import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { runPublicScan } from "../audit/publicScan.js";
import { aiProvider } from "../ai/index.js";
import { createAdProjectInput } from "../services/adProjects.js";
import { FfmpegRenderer } from "../video/ffmpegRenderer.js";
import { enqueue } from "../services/jobs.js";

export const apiRouter = Router();
const renderer = new FfmpegRenderer();

apiRouter.post("/scan", async (req, res) => {
  const { storeUrl } = z.object({ storeUrl: z.string().min(3) }).parse(req.body);
  const scanId = await runPublicScan(storeUrl);
  res.json({ scanId });
});

apiRouter.get("/scan/:id", async (req, res) => {
  const scan = await prisma.scan.findUnique({
    where: { id: req.params.id },
    include: {
      pages: true,
      findings: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!scan) return res.status(404).json({ error: "Scan not found" });

  const topFixes = [...scan.findings]
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 10);

  res.json({ scan, topFixes });
});

apiRouter.get("/scan/:id/export.json", async (req, res) => {
  const findings = await prisma.finding.findMany({ where: { scanId: req.params.id }, orderBy: { createdAt: "desc" } });
  res.json({ findings });
});

apiRouter.get("/scan/:id/export.csv", async (req, res) => {
  const findings = await prisma.finding.findMany({ where: { scanId: req.params.id }, orderBy: { createdAt: "desc" } });
  const header = ["severity", "area", "url", "message", "recommendation", "howToApply"];
  const rows = findings.map((f) => [f.severity, f.area, f.url, f.message, f.recommendation, f.howToApply]);
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=scan-${req.params.id}.csv`);
  res.send(csv);
});

apiRouter.post("/improvement-pack", async (req, res) => {
  const { scanId } = z.object({ scanId: z.string() }).parse(req.body);
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, include: { pages: true } });
  if (!scan) return res.status(404).json({ error: "Scan not found" });

  const corpus = scan.pages.map((p) => [p.title, p.metaDesc, p.h1].filter(Boolean).join(" ")).join(" ");
  const niche = inferNiche(corpus);
  const contentCalendar = await aiProvider.generateContentPlan({ niche, topProducts: scan.pages.slice(0, 5).map((p) => p.title || "Untitled") });

  res.json({
    niche,
    copyPack: {
      productTitlePatterns: [
        "[Primary Benefit] [Product Type] for [Audience]",
        "[Brand] [Material] [Product Type] – [Use Case]"
      ],
      metaDescriptionTemplates: [
        "Discover {product}. {benefit}. Fast shipping and easy returns.",
        "Shop {collection} at {brand}. Premium quality, trusted by customers."
      ],
      faqTemplates: [
        "What is the shipping time?",
        "How do returns work?",
        "How do I choose the right size/variant?"
      ],
      contentCalendar
    }
  });
});

apiRouter.get("/utm", (req, res) => {
  const schema = z.object({
    baseUrl: z.string().url(),
    source: z.string().min(1),
    medium: z.string().min(1),
    campaign: z.string().min(1),
    content: z.string().optional()
  });
  const input = schema.parse(req.query);
  const url = new URL(input.baseUrl);
  url.searchParams.set("utm_source", input.source);
  url.searchParams.set("utm_medium", input.medium);
  url.searchParams.set("utm_campaign", input.campaign);
  if (input.content) url.searchParams.set("utm_content", input.content);
  res.json({ url: url.toString() });
});

apiRouter.post("/ads/create", async (req, res) => {
  const schema = z.object({
    storeUrl: z.string().url(),
    shopIdNullable: z.string().optional(),
    productRef: z.string().min(2),
    template: z.enum(["problem-solution-cta", "3-benefits", "minimal-premium"]),
    format: z.enum(["9:16", "1:1", "16:9"])
  });
  const input = schema.parse(req.body);

  const copy = await aiProvider.generateAdCopy({ productTitle: input.productRef, template: input.template });
  const project = await prisma.adProject.create({
    data: createAdProjectInput({
      storeUrl: input.storeUrl,
      shopIdNullable: input.shopIdNullable,
      productRef: input.productRef,
      template: input.template,
      format: input.format,
      script: copy.script,
      captions: copy.captions
    })
  });

  res.json({ project });
});

apiRouter.post("/ads/render", async (req, res) => {
  const input = z.object({ projectId: z.string() }).parse(req.body);
  const project = await prisma.adProject.findUnique({ where: { id: input.projectId } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  await prisma.adProject.update({ where: { id: project.id }, data: { status: "rendering" } });
  enqueue(async () => {
    const render = await renderer.render(project.id, {
      aspectRatio: project.format as "9:16" | "1:1" | "16:9",
      productTitle: project.productRef,
      imageUrls: [],
      captions: JSON.parse(project.captionsJson),
      script: project.script
    });
    await prisma.adProject.update({
      where: { id: project.id },
      data: { status: "complete", outputFilePath: render.outputUrl }
    });
  });

  res.json({ status: "queued" });
});

apiRouter.get("/ads", async (_req, res) => {
  const projects = await prisma.adProject.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ projects });
});

function inferNiche(text: string): string {
  const lower = text.toLowerCase();
  if (/beauty|skin|serum|cosmetic/.test(lower)) return "Beauty & Skincare";
  if (/fitness|workout|protein|gym/.test(lower)) return "Fitness";
  if (/pet|dog|cat/.test(lower)) return "Pet Supplies";
  if (/fashion|shirt|dress|jacket|shoes/.test(lower)) return "Fashion";
  return "General ecommerce";
}

function severityWeight(severity: string): number {
  if (severity === "Critical") return 4;
  if (severity === "High") return 3;
  if (severity === "Medium") return 2;
  return 1;
}
