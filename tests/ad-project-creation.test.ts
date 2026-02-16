import { describe, expect, it } from "vitest";
import { createAdProjectInput } from "../src/services/adProjects.js";

describe("createAdProjectInput", () => {
  it("creates queued ad project payload", () => {
    const payload = createAdProjectInput({
      storeUrl: "https://demo-store.com",
      productRef: "hero-product",
      template: "problem-solution-cta",
      format: "9:16",
      script: "Script line",
      captions: ["cap1", "cap2"]
    });

    expect(payload.status).toBe("queued");
    expect(payload.storeUrl).toBe("https://demo-store.com");
    expect(payload.format).toBe("9:16");
    expect(JSON.parse(payload.captionsJson)).toEqual(["cap1", "cap2"]);
  });
});
