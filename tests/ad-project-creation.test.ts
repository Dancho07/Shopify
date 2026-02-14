import { describe, it, expect } from "vitest";
import { createAdProjectInput } from "../src/services/adProjects.js";

describe("ad project creation", () => {
  it("builds queued ad project payload", () => {
    const payload = createAdProjectInput({
      shopId: "shop_1",
      productId: "gid://shopify/Product/1",
      template: "3-benefits",
      script: "Try this product",
      captions: ["Benefit 1", "Benefit 2"]
    });

    expect(payload.status).toBe("queued");
    expect(JSON.parse(payload.captionsJson)).toEqual(["Benefit 1", "Benefit 2"]);
  });
});
