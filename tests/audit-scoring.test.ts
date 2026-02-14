import { describe, it, expect } from "vitest";
import { scoreTitle, scoreDescription, severityFromScore } from "../src/audit/scoring.js";

describe("audit scoring utilities", () => {
  it("scores title quality", () => {
    expect(scoreTitle("Short")).toBeLessThan(40);
    expect(scoreTitle("Premium Ceramic Coffee Mug for Daily Brewing Routine")).toBeGreaterThan(70);
  });

  it("scores description quality", () => {
    const rich = "<ul><li>Benefit</li></ul><p>Ideal for travel</p><p>Material: Steel</p>";
    expect(scoreDescription(rich)).toBeGreaterThanOrEqual(80);
    expect(severityFromScore(30)).toBe("Critical");
  });
});
