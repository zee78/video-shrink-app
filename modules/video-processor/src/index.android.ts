import { requireNativeModule } from 'expo';

import type { VideoProcessorInfo } from './types';

export type { VideoProcessorInfo } from './types';

interface VideoProcessorNativeModule {
  getEngineInfo(): VideoProcessorInfo;
}

const VideoProcessor = requireNativeModule<VideoProcessorNativeModule>('VideoProcessor');

export function getVideoProcessorInfo(): VideoProcessorInfo {
  return VideoProcessor.getEngineInfo();
}
