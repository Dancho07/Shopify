import { AiProvider } from "./provider.js";

export class OpenAiProvider implements AiProvider {
  constructor(private apiKey: string) {}

  async generateContentPlan(input: { niche: string; topProducts: string[] }) {
    const prompt = `Create 30-day content plan for ${input.niche} using ${input.topProducts.join(", ")}. Return JSON array of {day,channel,idea,caption,cta}.`;
    const content = await this.call(prompt);
    return JSON.parse(content);
  }

  async generateAdCopy(input: { productTitle: string; template: string }) {
    const prompt = `Generate concise ad script and captions for ${input.productTitle} in template ${input.template}. Return JSON {script,captions}.`;
    const content = await this.call(prompt);
    return JSON.parse(content);
  }

  private async call(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ model: "gpt-4.1-mini", input: prompt })
    });
    const payload = await response.json();
    return payload.output_text || "[]";
  }
}
