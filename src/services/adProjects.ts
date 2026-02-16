export function createAdProjectInput(input: {
  storeUrl: string;
  shopIdNullable?: string | null;
  productRef: string;
  template: string;
  format: "9:16" | "1:1" | "16:9";
  script: string;
  captions: string[];
}) {
  return {
    storeUrl: input.storeUrl,
    shopIdNullable: input.shopIdNullable ?? null,
    productRef: input.productRef,
    template: input.template,
    format: input.format,
    script: input.script,
    captionsJson: JSON.stringify(input.captions),
    status: "queued"
  };
}
