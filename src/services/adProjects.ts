export function createAdProjectInput(input: { shopId: string; productId: string; template: string; script: string; captions: string[] }) {
  return {
    shopId: input.shopId,
    productId: input.productId,
    template: input.template,
    script: input.script,
    captionsJson: JSON.stringify(input.captions),
    status: "queued"
  };
}
