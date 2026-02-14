export interface AiProvider {
  generateContentPlan(input: { niche: string; topProducts: string[] }): Promise<{ day: number; channel: string; idea: string; caption: string; cta: string }[]>;
  generateAdCopy(input: { productTitle: string; template: string }): Promise<{ script: string; captions: string[] }>;
}
