export interface RenderInput {
  aspectRatio: "9:16" | "1:1" | "16:9";
  productTitle: string;
  imageUrls: string[];
  captions: string[];
  script: string;
}

export interface VideoRenderer {
  render(projectId: string, input: RenderInput): Promise<{ outputUrl: string }>;
}
