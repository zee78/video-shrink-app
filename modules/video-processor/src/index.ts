import type {
  CompressionResult,
  CompressVideoOptions,
  VideoProcessorInfo,
} from './types';

export type {
  CompressionResult,
  CompressVideoOptions,
  NativeCompressionPreset,
  VideoProcessorInfo,
} from './types';

export function getVideoProcessorInfo(): VideoProcessorInfo {
  return {
    status: 'unavailable',
    platform: 'unsupported',
    engine: 'VideoProcessor is currently available on Android only.',
  };
}

export async function compressVideo(
  _options: CompressVideoOptions,
): Promise<CompressionResult> {
  throw new Error('Video compression is currently available on Android only.');
}

export async function saveVideoToGallery(_outputPath: string): Promise<string> {
  throw new Error('Saving videos to the gallery is currently available on Android only.');
}
