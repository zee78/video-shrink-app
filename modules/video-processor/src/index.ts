import type { VideoProcessorInfo } from './types';

export type { VideoProcessorInfo } from './types';

export function getVideoProcessorInfo(): VideoProcessorInfo {
  return {
    status: 'unavailable',
    platform: 'unsupported',
    engine: 'VideoProcessor is currently available on Android only.',
  };
}
