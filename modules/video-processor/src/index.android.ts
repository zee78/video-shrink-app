import { requireNativeModule } from "expo";

import type { CompressionResult, VideoProcessorInfo } from "./types";

export type { CompressionResult, VideoProcessorInfo } from "./types";

interface VideoProcessorNativeModule {
  getEngineInfo(): VideoProcessorInfo;
  compressVideo(inputUri: string): Promise<CompressionResult>;
  saveToGallery(outputPath: string): Promise<string>;
}

const VideoProcessor =
  requireNativeModule<VideoProcessorNativeModule>("VideoProcessor");

export function getVideoProcessorInfo(): VideoProcessorInfo {
  return VideoProcessor.getEngineInfo();
}

export async function compressVideo(
  inputUri: string,
): Promise<CompressionResult> {
  if (!inputUri) {
    throw new Error("Video URI is required.");
  }

  return VideoProcessor.compressVideo(inputUri);
}

export async function saveVideoToGallery(outputPath: string): Promise<string> {
  if (!outputPath) {
    throw new Error("Output file path is required.");
  }

  return VideoProcessor.saveToGallery(outputPath);
}
