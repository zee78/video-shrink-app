import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  CheckCircle2,
  FileVideo,
  Info,
  VolumeX,
  Zap,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { compressVideo } from "../../../modules/video-processor/src";

import {
  type CompressionPreset,
  useVideoStore,
} from "../../store/useVideoStore";

const PRESETS: {
  id: CompressionPreset;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "small",
    title: "Small Size",
    subtitle: "Up to 480p · Smaller files",
  },
  {
    id: "balanced",
    title: "Balanced",
    subtitle: "Up to 720p · Recommended",
  },
  {
    id: "high",
    title: "High Quality",
    subtitle: "Up to 1080p · Better quality",
  },
  {
    id: "custom",
    title: "Custom Size",
    subtitle: "Choose a target file size",
  },
];

function formatMB(bytes: number | null): string {
  if (bytes === null) {
    return "Unknown";
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompressScreen() {
  const router = useRouter();

  const video = useVideoStore((state) => state.selectedVideo);

  const settings = useVideoStore((state) => state.compressionSettings);

  const updateSettings = useVideoStore(
    (state) => state.updateCompressionSettings,
  );

  const setCompressionResult = useVideoStore(
    (state) => state.setCompressionResult,
  );

  const [targetText, setTargetText] = useState(
    settings.targetSizeMB?.toString() ?? "",
  );

  const [isCompressing, setIsCompressing] = useState(false);

  const handleTargetChange = (value: string) => {
    const normalized = value.replace(",", ".");

    // Allow numbers such as 5, 10, 10.5 and 10.25
    if (!/^\d*\.?\d{0,2}$/.test(normalized)) {
      return;
    }

    setTargetText(normalized);

    const numeric = Number(normalized);

    updateSettings({
      targetSizeMB:
        normalized.trim() !== "" && Number.isFinite(numeric) && numeric > 0
          ? numeric
          : null,
    });
  };

  const handleContinue = async () => {
    if (!video || isCompressing) {
      return;
    }

    if (settings.preset === "custom") {
      const targetSizeMB = settings.targetSizeMB;

      if (
        targetSizeMB === null ||
        !Number.isFinite(targetSizeMB) ||
        targetSizeMB <= 0
      ) {
        Alert.alert(
          "Invalid Target Size",
          "Please enter a valid target size in MB.",
        );
        return;
      }

      if (
        video.sizeBytes !== null &&
        targetSizeMB * 1024 * 1024 >= video.sizeBytes
      ) {
        Alert.alert(
          "Target Size Too Large",
          "Choose a target smaller than the original video size.",
        );
        return;
      }

      if (video.durationMs !== null && video.durationMs > 0) {
        const durationSeconds = video.durationMs / 1000;

        const totalBitrate =
          (targetSizeMB * 1024 * 1024 * 8 * 0.95) / durationSeconds;

        const audioBitrate = settings.removeAudio ? 0 : 128_000;

        const estimatedVideoBitrate = totalBitrate - audioBitrate;

        if (estimatedVideoBitrate < 100_000) {
          Alert.alert(
            "Target Size Too Small",
            "This target is too small for the video's duration. Please choose a larger size or enable Remove Audio.",
          );
          return;
        }
      }
    }

    try {
      setIsCompressing(true);

      const result = await compressVideo({
        inputUri: video.uri,
        preset: settings.preset,
        removeAudio: settings.removeAudio,
        targetSizeMB:
          settings.preset === "custom" ? settings.targetSizeMB : null,
      });

      setCompressionResult(result);

      if (settings.preset === "custom") {
        Alert.alert(
          "Encoder Diagnostics",
          `Video Process: ${result.videoProcess ?? "Unknown"}\n` +
            `Requested Bitrate: ${result.requestedVideoBitrate ?? "Unknown"}\n` +
            `Actual Bitrate: ${result.actualVideoBitrate ?? "Unknown"}\n` +
            `Output Size: ${(result.outputSizeBytes / (1024 * 1024)).toFixed(2)} MB\n\n` +
            `AVAILABLE ENCODERS:\n${result.encoderDiagnostics ?? "Unavailable"}`,
        );
      }

      console.log("Compression result:", result);

      router.push("/video/result");
    } catch (error) {
      console.error("Compression failed:", error);

      Alert.alert(
        "Video Export Failed",
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsCompressing(false);
    }
  };

  if (!video) {
    return (
      <SafeAreaView style={styles.empty} edges={["top", "bottom"]}>
        <StatusBar style="light" />

        <Text style={styles.emptyTitle}>No video selected</Text>

        <Pressable style={styles.button} onPress={() => router.replace("/")}>
          <Text style={styles.buttonText}>Select a Video</Text>
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
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
          disabled={isCompressing}
        >
          <ArrowLeft color="#FFFFFF" size={22} />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Compression Settings</Text>

          <Text style={styles.headerSubtitle}>Customize your video output</Text>
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SELECTED VIDEO */}
        <View style={styles.videoCard}>
          <FileVideo color="#A78BFA" size={28} />

          <View style={styles.videoInfo}>
            <Text style={styles.videoName} numberOfLines={2}>
              {video.name}
            </Text>

            <Text style={styles.muted}>
              Original: {formatMB(video.sizeBytes)}
            </Text>
          </View>
        </View>

        {/* PRESETS */}
        <Text style={styles.sectionTitle}>Choose compression quality</Text>

        {PRESETS.map((preset) => {
          const selected = settings.preset === preset.id;

          return (
            <Pressable
              key={preset.id}
              disabled={isCompressing}
              onPress={() =>
                updateSettings({
                  preset: preset.id,
                })
              }
              style={[styles.presetCard, selected && styles.selectedCard]}
            >
              <View style={styles.presetInfo}>
                <Text style={styles.presetTitle}>{preset.title}</Text>

                <Text style={styles.muted}>{preset.subtitle}</Text>
              </View>

              {selected ? (
                <CheckCircle2 color="#A78BFA" size={23} />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </Pressable>
          );
        })}

        {/* CUSTOM TARGET SIZE */}
        {settings.preset === "custom" && (
          <View style={styles.customCard}>
            <Text style={styles.presetTitle}>Target file size (MB)</Text>

            <TextInput
              value={targetText}
              onChangeText={handleTargetChange}
              editable={!isCompressing}
              placeholder="e.g. 20"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              style={styles.input}
              maxLength={9}
            />

            <Text style={styles.muted}>
              This is a best-effort target, not a guarantee.
            </Text>
          </View>
        )}

        {/* REMOVE AUDIO */}
        <View style={styles.audioCard}>
          <VolumeX color="#A78BFA" size={22} />

          <View style={styles.audioInfo}>
            <Text style={styles.presetTitle}>Remove Audio</Text>

            <Text style={styles.muted}>Export video without sound</Text>
          </View>

          <Switch
            value={settings.removeAudio}
            disabled={isCompressing}
            onValueChange={(value) =>
              updateSettings({
                removeAudio: value,
              })
            }
            trackColor={{
              false: "#475569",
              true: "#7C3AED",
            }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* INFORMATION NOTICE */}
        <View style={styles.estimateCard}>
          <View style={styles.noticeRow}>
            <Info color="#94A3B8" size={18} />

            <Text style={styles.noticeText}>
              Output size depends on the original video, selected resolution,
              and device encoder.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FIXED BOTTOM BUTTON */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.button, isCompressing && styles.disabledButton]}
          disabled={isCompressing}
          onPress={handleContinue}
        >
          {isCompressing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Zap size={19} color="#FFFFFF" />
          )}

          <Text style={styles.buttonText}>
            {isCompressing ? "Processing Video..." : "Start Compression"}
          </Text>
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
    paddingTop: 22,
    paddingBottom: 30,
  },

  /* VIDEO CARD */
  videoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },

  videoInfo: {
    flex: 1,
  },

  videoName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 5,
  },

  muted: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },

  /* PRESETS */
  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 14,
  },

  presetCard: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 17,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 88,
  },

  selectedCard: {
    borderColor: "#8B5CF6",
    backgroundColor: "#2E2547",
  },

  presetInfo: {
    flex: 1,
    gap: 5,
  },

  presetTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },

  unselectedCircle: {
    height: 22,
    width: 22,
    borderWidth: 2,
    borderColor: "#64748B",
    borderRadius: 11,
  },

  /* CUSTOM */
  customCard: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    gap: 12,
    marginBottom: 14,
  },

  input: {
    backgroundColor: "#0F172A",
    borderColor: "#475569",
    borderWidth: 1,
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 18,
    padding: 14,
  },

  /* AUDIO */
  audioCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1E293B",
    padding: 17,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 24,
  },

  audioInfo: {
    flex: 1,
  },

  /* NOTICE */
  estimateCard: {
    borderRadius: 16,
    backgroundColor: "#1E293B",
    padding: 20,
  },

  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 12,
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
  button: {
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
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  empty: {
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
