export interface VideoProcessorInfo {
  status: string;
  platform: string;
  engine: string;
}

export interface CompressionResult {
  uri: string;
  outputPath: string;
  outputSizeBytes: number;
}

export type NativeCompressionPreset = "small" | "balanced" | "high" | "custom";

export interface CompressVideoOptions {
  inputUri: string;
  preset: NativeCompressionPreset;
  removeAudio: boolean;
  targetSizeMB?: number | null;
}
