import { create } from "zustand";

export type CompressionPreset = "small" | "balanced" | "high" | "custom";

export interface SelectedVideo {
  uri: string;
  name: string;
  sizeBytes: number | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
}

export interface CompressionSettings {
  preset: CompressionPreset;
  targetSizeMB: number | null;
  removeAudio: boolean;
}

interface VideoStore {
  selectedVideo: SelectedVideo | null;
  compressionSettings: CompressionSettings;
  setSelectedVideo: (video: SelectedVideo) => void;
  clearSelectedVideo: () => void;
  updateCompressionSettings: (settings: Partial<CompressionSettings>) => void;
  resetCompressionSettings: () => void;
}

const defaultCompressionSettings: CompressionSettings = {
  preset: "balanced",
  targetSizeMB: null,
  removeAudio: false,
};

export const useVideoStore = create<VideoStore>((set) => ({
  selectedVideo: null,
  compressionSettings: { ...defaultCompressionSettings },

  setSelectedVideo: (video) =>
    set({
      selectedVideo: video,
      compressionSettings: { ...defaultCompressionSettings },
    }),

  clearSelectedVideo: () => set({ selectedVideo: null }),

  updateCompressionSettings: (settings) =>
    set((state) => ({
      compressionSettings: {
        ...state.compressionSettings,
        ...settings,
      },
    })),

  resetCompressionSettings: () =>
    set({
      compressionSettings: { ...defaultCompressionSettings },
    }),
}));
