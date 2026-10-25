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
