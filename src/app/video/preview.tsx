import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <SafeAreaView style={styles.emptyContainer} edges={["top", "bottom"]}>
        <Text style={styles.emptyTitle}>No video selected</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.primaryButtonText}>Select a Video</Text>
        </Pressable>
      </SafeAreaView>
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
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Video Preview</Text>

          <Text style={styles.headerSubtitle}>Review your selected video</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
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

          <Text style={styles.fileName} numberOfLines={2}>
            {selectedVideo.name}
          </Text>

          <View style={styles.divider} />

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

          <ChevronRight size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
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
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0F172A",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 3,
  },

  /* SCROLL */
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
  },
  playerContainer: {
    backgroundColor: "#000000",
    borderRadius: 18,
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
    borderRadius: 14,
    paddingVertical: 15,
    gap: 10,
    marginTop: 18,
  },
  playbackText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: "#1E293B",
    borderRadius: 18,
    padding: 20,
    marginTop: 24,
    gap: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  fileName: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: "#334155",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    marginTop: 22,
    padding: 16,
    backgroundColor: "#12392F",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  privacyText: {
    color: "#BBF7D0",
    fontSize: 12,
    flex: 1,
    lineHeight: 19,
  },
  footer: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 15,
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
