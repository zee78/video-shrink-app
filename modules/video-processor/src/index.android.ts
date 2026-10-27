import { requireNativeModule } from "expo";

import type {
  CompressionResult,
  CompressVideoOptions,
  VideoProcessorInfo,
} from "./types";

export type {
  CompressionResult,
  CompressVideoOptions,
  NativeCompressionPreset,
  VideoProcessorInfo
} from "./types";

interface VideoProcessorNativeModule {
  getEngineInfo(): VideoProcessorInfo;

  compressVideo(
    inputUri: string,
    preset: "small" | "balanced" | "high" | "custom",
    removeAudio: boolean,
    targetSizeMB: number | null,
  ): Promise<CompressionResult>;

  saveToGallery(outputPath: string): Promise<string>;
}

const VideoProcessor =
  requireNativeModule<VideoProcessorNativeModule>("VideoProcessor");

export function getVideoProcessorInfo(): VideoProcessorInfo {
  return VideoProcessor.getEngineInfo();
}

export async function compressVideo(
  options: CompressVideoOptions,
): Promise<CompressionResult> {
  if (!options.inputUri) {
    throw new Error("Video URI is required.");
  }

  if (options.preset === "custom") {
    if (
      options.targetSizeMB == null ||
      !Number.isFinite(options.targetSizeMB) ||
      options.targetSizeMB <= 0
    ) {
      throw new Error("Enter a valid target size in MB.");
    }
  }

  return VideoProcessor.compressVideo(
    options.inputUri,
    options.preset,
    options.removeAudio,
    options.targetSizeMB ?? null,
  );
}

export async function saveVideoToGallery(outputPath: string): Promise<string> {
  if (!outputPath) {
    throw new Error("Output file path is required.");
  }

  return VideoProcessor.saveToGallery(outputPath);
}
