import { create } from "zustand";

export interface SelectedVideo {
  uri: string;
  name: string;
  sizeBytes: number | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
}

interface VideoStore {
  selectedVideo: SelectedVideo | null;
  setSelectedVideo: (video: SelectedVideo) => void;
  clearSelectedVideo: () => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  selectedVideo: null,

  setSelectedVideo: (video) => {
    set({ selectedVideo: video });
  },

  clearSelectedVideo: () => {
    set({ selectedVideo: null });
  },
}));
