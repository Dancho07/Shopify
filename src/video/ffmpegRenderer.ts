import { VideoRenderer, RenderInput } from "./renderer.js";

export class FfmpegRenderer implements VideoRenderer {
  async render(projectId: string, input: RenderInput): Promise<{ outputUrl: string }> {
    // Placeholder pipeline hook. In production replace with fluent-ffmpeg or Remotion composition render.
    const fileName = `renders/${projectId}-${input.aspectRatio.replace(":", "x")}.mp4`;
    return { outputUrl: fileName };
  }
}
