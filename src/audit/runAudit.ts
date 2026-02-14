import { prisma } from "../db.js";
import { scoreDescription, scoreTitle, severityFromScore } from "./scoring.js";
import { shopifyGraphql } from "../services/shopify.js";

const productQuery = `#graphql
query ProductsForAudit($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        title
        descriptionHtml
        tags
        images(first: 10) {
          edges {
            node {
              altText
              url
              width
              height
            }
          }
        }
      }
    }
  }
}`;

export async function runAudit(shopId: string, shopDomain: string, accessToken: string): Promise<number> {
  const data = await shopifyGraphql<any>(shopDomain, accessToken, productQuery, { first: 30 });
  const products = data.products.edges.map((e: any) => e.node);

  await prisma.finding.deleteMany({ where: { shopId } });

  const findings = [] as any[];
  for (const product of products) {
    const titleScore = scoreTitle(product.title);
    if (titleScore < 80) {
      findings.push({
        shopId,
        type: "seo.title",
        severity: severityFromScore(titleScore),
        entityType: "product",
        entityId: product.id,
        message: "Product title could be improved for clarity and SEO.",
        recommendation: "Use 20–70 chars, avoid repetition, include primary intent keyword once."
      });
    }

    const descScore = scoreDescription(product.descriptionHtml || "");
    if (descScore < 80) {
      findings.push({
        shopId,
        type: "conversion.description",
        severity: severityFromScore(descScore),
        entityType: "product",
        entityId: product.id,
        message: "Description lacks clear benefits/specifications.",
        recommendation: "Add bullet points, clear benefit statements, and key specs."
      });
    }

    const images = product.images.edges.map((i: any) => i.node);
    const missingAlt = images.filter((img: any) => !img.altText).length;
    if (missingAlt > 0) {
      findings.push({
        shopId,
        type: "seo.image_alt",
        severity: "Medium",
        entityType: "product",
        entityId: product.id,
        message: `${missingAlt} images are missing alt text.`,
        recommendation: "Add descriptive alt text for accessibility and image search."
      });
    }
  }

  if (findings.length > 0) {
    await prisma.finding.createMany({ data: findings });
  }

  return findings.length;
}
