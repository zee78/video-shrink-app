import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AlertTriangle,
  ArrowLeft,
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

  const isLarger = reduction !== null && reduction < 0;

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

  const handleCompressAnother = () => {
    player.pause();
    router.replace("/");
  };

  if (!video || !result) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={["top", "bottom"]}>
        <StatusBar style="light" />

        <Text style={styles.emptyTitle}>No compressed video found</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.buttonText}>Go to Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            player.pause();
            router.back();
          }}
          style={styles.backButton}
          hitSlop={10}
          disabled={saving}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Compression Result</Text>

          <Text style={styles.headerSubtitle}>Preview and save your video</Text>
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SUCCESS MESSAGE */}
        <View style={styles.successHeader}>
          <CheckCircle2 size={50} color="#22C55E" />

          <Text style={styles.title}>Compression Complete!</Text>

          <Text style={styles.subtitle}>
            Your video has been processed successfully.
          </Text>
        </View>

        {/* VIDEO PLAYER */}
        <View style={styles.playerCard}>
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="contain"
            nativeControls
          />
        </View>

        {/* FILE NAME */}
        <View style={styles.fileCard}>
          <FileVideo size={20} color="#A78BFA" />

          <Text style={styles.fileName} numberOfLines={2}>
            {video.name}
          </Text>
        </View>

        {/* SIZE COMPARISON */}
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

        {/* COMPRESSION RESULT */}
        {reduction !== null && (
          <View style={[styles.savingsCard, isLarger && styles.warningCard]}>
            {isLarger ? (
              <AlertTriangle size={26} color="#F87171" />
            ) : (
              <CheckCircle2 size={26} color="#4ADE80" />
            )}

            <Text style={[styles.savingsText, isLarger && styles.warningText]}>
              {reduction > 0
                ? `${reduction.toFixed(1)}% smaller`
                : reduction < 0
                  ? `${Math.abs(reduction).toFixed(1)}% larger`
                  : "No size reduction"}
            </Text>

            {isLarger && (
              <Text style={styles.warningDescription}>
                The compressed video is larger than the original. Consider
                keeping the original video.
              </Text>
            )}
          </View>
        )}

        {/* INFORMATION */}
        <Text style={styles.infoText}>
          Preview your video before saving it. The original video remains
          unchanged.
        </Text>

        <Text style={styles.storageInfo}>
          Saved videos are stored in Movies/VideoShrink. Unsaved results remain
          in temporary app storage.
        </Text>
      </ScrollView>

      {/* FIXED BOTTOM ACTIONS */}
      <View style={styles.footer}>
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
          ) : savedUri ? (
            <CheckCircle2 size={20} color="#FFFFFF" />
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
          disabled={saving}
          onPress={handleCompressAnother}
        >
          <RotateCcw size={18} color="#FFFFFF" />

          <Text style={styles.secondaryButtonText}>Compress Another Video</Text>
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

  /* HEADER */
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
    paddingTop: 24,
    paddingBottom: 30,
  },

  /* SUCCESS HEADER */
  successHeader: {
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },

  /* VIDEO PLAYER */
  playerCard: {
    backgroundColor: "#000000",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
  },
  videoPlayer: {
    width: "100%",
    height: 230,
  },

  /* FILE CARD */
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

  /* SIZE COMPARISON */
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

  /* SAVINGS */
  savingsCard: {
    backgroundColor: "#12392F",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  savingsText: {
    color: "#4ADE80",
    fontSize: 19,
    fontWeight: "800",
  },

  warningCard: {
    backgroundColor: "#451A1A",
    borderWidth: 1,
    borderColor: "#EF4444",
  },

  warningText: {
    color: "#F87171",
  },

  warningDescription: {
    color: "#FCA5A5",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },

  /* INFO */
  infoText: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 24,
    fontSize: 12,
    lineHeight: 19,
  },

  storageInfo: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 18,
    fontSize: 11,
    lineHeight: 17,
  },

  /* FOOTER */
  footer: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    gap: 12,
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
    borderRadius: 15,
    minHeight: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },

  /* EMPTY STATE */
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
