import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileVideo,
  HardDrive,
  Pause,
  Play,
} from "lucide-react-native";
import { useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { useVideoStore } from "../../store/useVideoStore";

function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return "Unknown";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) {
    return "Unknown";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function VideoPreviewScreen() {
  const router = useRouter();

  const selectedVideo = useVideoStore((state) => state.selectedVideo);

  const player = useVideoPlayer(selectedVideo?.uri ?? null, (player) => {
    player.loop = false;
  });

  useEffect(() => {
    return () => {
      player.pause();
    };
  }, [player]);

  if (!selectedVideo) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No video selected</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.primaryButtonText}>Select a Video</Text>
        </Pressable>
      </View>
    );
  }

  const resolution =
    selectedVideo.width && selectedVideo.height
      ? `${selectedVideo.width} × ${selectedVideo.height}`
      : "Unknown";

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const continueToCompression = () => {
    player.pause();
    router.push("/video/compress");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Video Preview</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.playerContainer}>
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="contain"
            nativeControls
          />
        </View>

        <Pressable onPress={togglePlayback} style={styles.playbackButton}>
          {player.playing ? (
            <Pause color="#FFFFFF" size={18} />
          ) : (
            <Play color="#FFFFFF" size={18} />
          )}

          <Text style={styles.playbackText}>
            {player.playing ? "Pause" : "Play"} Video
          </Text>
        </Pressable>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Video Information</Text>

          <Text style={styles.fileName}>{selectedVideo.name}</Text>

          <View style={styles.detailRow}>
            <FileVideo color="#A78BFA" size={20} />
            <Text style={styles.detailLabel}>Resolution</Text>
            <Text style={styles.detailValue}>{resolution}</Text>
          </View>

          <View style={styles.detailRow}>
            <HardDrive color="#A78BFA" size={20} />
            <Text style={styles.detailLabel}>File Size</Text>
            <Text style={styles.detailValue}>
              {formatBytes(selectedVideo.sizeBytes)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Clock3 color="#A78BFA" size={20} />
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {formatDuration(selectedVideo.durationMs)}
            </Text>
          </View>
        </View>

        <View style={styles.privacyCard}>
          <CheckCircle2 color="#22C55E" size={20} />

          <Text style={styles.privacyText}>
            Your video stays on your device. No cloud upload is required.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={continueToCompression}>
          <Text style={styles.primaryButtonText}>Continue to Compression</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  playerContainer: {
    backgroundColor: "#000000",
    borderRadius: 16,
    overflow: "hidden",
  },
  videoPlayer: {
    width: "100%",
    height: 240,
  },
  playbackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingVertical: 13,
    gap: 10,
    marginTop: 16,
  },
  playbackText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: "#1E293B",
    borderRadius: 18,
    padding: 20,
    marginTop: 24,
    gap: 15,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  fileName: {
    color: "#CBD5E1",
    fontSize: 14,
    marginBottom: 5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailLabel: {
    color: "#94A3B8",
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  privacyCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#12392F",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  privacyText: {
    color: "#BBF7D0",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
  },
});
