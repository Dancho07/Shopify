import { AiProvider } from "./provider.js";

export class RuleBasedProvider implements AiProvider {
  async generateContentPlan(input: { niche: string; topProducts: string[] }) {
    return Array.from({ length: 30 }).map((_, idx) => ({
      day: idx + 1,
      channel: idx % 3 === 0 ? "Blog" : idx % 2 === 0 ? "Social" : "Email",
      idea: `${input.niche}: educational angle ${idx + 1}`,
      caption: `Spotlight: ${input.topProducts[idx % input.topProducts.length] || "best seller"}`,
      cta: "Learn more and shop now"
    }));
  }

  async generateAdCopy(input: { productTitle: string; template: string }) {
    return {
      script: `Meet ${input.productTitle}. In seconds, see why this ${input.template} format boosts trust and action. Shop today.`,
      captions: ["Problem", "Solution", `Try ${input.productTitle}`, "Shop now"]
    };
  }
}
