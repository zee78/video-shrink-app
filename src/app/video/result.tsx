import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  CheckCircle2,
  Download,
  FileVideo,
  RotateCcw,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { saveVideoToGallery } from "../../../modules/video-processor/src";
import { useVideoStore } from "../../store/useVideoStore";

function formatSize(bytes: number | null): string {
  if (bytes === null) {
    return "Unknown";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoResultScreen() {
  const router = useRouter();

  const video = useVideoStore((state) => state.selectedVideo);

  const result = useVideoStore((state) => state.compressionResult);

  const [saving, setSaving] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);

  const player = useVideoPlayer(result?.uri ?? null, (player) => {
    player.loop = false;
  });

  const originalSize = video?.sizeBytes ?? null;
  const compressedSize = result?.outputSizeBytes ?? null;

  const reduction =
    originalSize !== null && originalSize > 0 && compressedSize !== null
      ? (1 - compressedSize / originalSize) * 100
      : null;

  const handleSave = async () => {
    if (!result || saving || savedUri) {
      return;
    }

    try {
      setSaving(true);

      const galleryUri = await saveVideoToGallery(result.outputPath);

      setSavedUri(galleryUri);

      Alert.alert(
        "Video Saved",
        "Your compressed video is now available in your Gallery, under Movies/VideoShrink.",
      );
    } catch (error) {
      console.error("Gallery save failed:", error);

      Alert.alert(
        "Unable to Save",
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!video || !result) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No compressed video found</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.buttonText}>Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successHeader}>
          <CheckCircle2 size={56} color="#22C55E" />

          <Text style={styles.title}>Compression Complete!</Text>

          <Text style={styles.subtitle}>
            Your video has been processed successfully.
          </Text>
        </View>

        <View style={styles.playerCard}>
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="contain"
            nativeControls
          />
        </View>

        <View style={styles.fileCard}>
          <FileVideo size={20} color="#A78BFA" />

          <Text style={styles.fileName} numberOfLines={2}>
            {video.name}
          </Text>
        </View>

        <View style={styles.comparisonRow}>
          <View style={styles.sizeCard}>
            <Text style={styles.cardLabel}>Original</Text>

            <Text style={styles.sizeValue}>{formatSize(originalSize)}</Text>
          </View>

          <View style={styles.sizeCard}>
            <Text style={styles.cardLabel}>Compressed</Text>

            <Text style={styles.compressedValue}>
              {formatSize(compressedSize)}
            </Text>
          </View>
        </View>

        {reduction !== null && (
          <View style={styles.savingsCard}>
            <Text style={styles.savingsText}>
              {reduction >= 0
                ? `${reduction.toFixed(1)}% smaller`
                : `${Math.abs(reduction).toFixed(1)}% larger`}
            </Text>
          </View>
        )}

        <Text style={styles.infoText}>
          Preview your video before saving it. The original video remains
          unchanged.
        </Text>

        <Pressable
          style={[
            styles.primaryButton,
            (saving || savedUri) && styles.disabledButton,
          ]}
          disabled={saving || savedUri !== null}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Download size={20} color="#FFFFFF" />
          )}

          <Text style={styles.buttonText}>
            {saving
              ? "Saving..."
              : savedUri
                ? "Saved to Gallery"
                : "Save to Gallery"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            player.pause();
            router.replace("/");
          }}
        >
          <RotateCcw size={18} color="#FFFFFF" />

          <Text style={styles.secondaryButtonText}>Compress Another Video</Text>
        </Pressable>

        <Text style={styles.storageInfo}>
          Saved videos are stored in Movies/VideoShrink. Unsaved results remain
          in temporary app storage.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 20,
    paddingTop: 38,
    paddingBottom: 48,
  },
  successHeader: {
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
  playerCard: {
    backgroundColor: "#000000",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
  },
  videoPlayer: {
    width: "100%",
    height: 230,
  },
  fileCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  fileName: {
    color: "#FFFFFF",
    fontSize: 14,
    flex: 1,
  },
  comparisonRow: {
    flexDirection: "row",
    gap: 12,
  },
  sizeCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  cardLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  sizeValue: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },
  compressedValue: {
    color: "#A78BFA",
    fontSize: 19,
    fontWeight: "800",
  },
  savingsCard: {
    backgroundColor: "#12392F",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  savingsText: {
    color: "#4ADE80",
    fontSize: 19,
    fontWeight: "800",
  },
  infoText: {
    color: "#94A3B8",
    textAlign: "center",
    marginVertical: 24,
    fontSize: 12,
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#334155",
    borderRadius: 14,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  storageInfo: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 24,
    fontSize: 11,
    lineHeight: 17,
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
    fontSize: 18,
    textAlign: "center",
  },
});
