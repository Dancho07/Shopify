export type Severity = "Critical" | "High" | "Medium" | "Low";

export function scoreTitle(title: string): number {
  const len = title.trim().length;
  if (len < 20) return 35;
  if (len > 70) return 60;
  const words = title.toLowerCase().split(/\s+/);
  const uniqueRatio = new Set(words).size / words.length;
  return Math.round(70 + uniqueRatio * 30);
}

export function scoreDescription(descriptionHtml: string): number {
  const hasBullets = /<li>/i.test(descriptionHtml);
  const hasBenefits = /(benefit|perfect for|ideal for|helps)/i.test(descriptionHtml);
  const hasSpecs = /(material|size|weight|dimension|specification)/i.test(descriptionHtml);

  let score = 40;
  if (hasBullets) score += 20;
  if (hasBenefits) score += 20;
  if (hasSpecs) score += 20;
  return Math.min(score, 100);
}

export function severityFromScore(score: number): Severity {
  if (score < 40) return "Critical";
  if (score < 60) return "High";
  if (score < 80) return "Medium";
  return "Low";
}
