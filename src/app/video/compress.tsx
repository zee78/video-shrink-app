import { useRouter } from "expo-router";
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
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { compressVideo } from "../../../modules/video-processor/src";
import { CompressionPreset, useVideoStore } from "../../store/useVideoStore";

const PRESETS: {
  id: CompressionPreset;
  title: string;
  subtitle: string;
  qualityFactor: number | null;
}[] = [
  {
    id: "small",
    title: "Small Size",
    subtitle: "Up to 480p · Smaller files",
    qualityFactor: 0.2,
  },
  {
    id: "balanced",
    title: "Balanced",
    subtitle: "Up to 720p · Recommended",
    qualityFactor: 0.45,
  },
  {
    id: "high",
    title: "High Quality",
    subtitle: "Up to 1080p · Better quality",
    qualityFactor: 0.75,
  },
  {
    id: "custom",
    title: "Custom Size",
    subtitle: "Choose a target file size",
    qualityFactor: null,
  },
];

function formatMB(bytes: number | null): string {
  if (bytes == null) return "Unknown";

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

  if (!video) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>No video selected</Text>

        <Pressable style={styles.button} onPress={() => router.replace("/")}>
          <Text style={styles.buttonText}>Select a Video</Text>
        </Pressable>
      </View>
    );
  }

  const originalSizeMB =
    video.sizeBytes == null ? null : video.sizeBytes / (1024 * 1024);

  const selectedPreset = PRESETS.find((item) => item.id === settings.preset);

  // Placeholder estimates only, not encoder predictions.
  const estimatedSizeMB =
    settings.preset === "custom"
      ? settings.targetSizeMB
      : originalSizeMB != null && selectedPreset?.qualityFactor != null
        ? originalSizeMB * selectedPreset.qualityFactor
        : null;

  const estimatedSavings =
    originalSizeMB != null && originalSizeMB > 0 && estimatedSizeMB != null
      ? Math.round((1 - estimatedSizeMB / originalSizeMB) * 100)
      : null;

  const handleTargetChange = (value: string) => {
    const normalized = value.replace(",", ".");

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

    if (settings.preset !== "balanced") {
      Alert.alert(
        "Balanced preset only",
        "The first native test currently supports the Balanced preset. Other presets will be connected next.",
      );
      return;
    }

    try {
      setIsCompressing(true);

      const result = await compressVideo(video.uri);
      setCompressionResult(result);

      router.push("/video/result");

      console.log("Compression result:", result);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </Pressable>

        <Text style={styles.headerTitle}>Compression Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.videoCard}>
          <FileVideo color="#A78BFA" size={28} />

          <View style={{ flex: 1 }}>
            <Text style={styles.videoName} numberOfLines={2}>
              {video.name}
            </Text>

            <Text style={styles.muted}>
              Original: {formatMB(video.sizeBytes)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose compression quality</Text>

        {PRESETS.map((preset) => {
          const selected = settings.preset === preset.id;

          return (
            <Pressable
              key={preset.id}
              onPress={() => updateSettings({ preset: preset.id })}
              style={[styles.presetCard, selected && styles.selectedCard]}
            >
              <View style={{ flex: 1, gap: 5 }}>
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

        {settings.preset === "custom" && (
          <View style={styles.customCard}>
            <Text style={styles.presetTitle}>Target file size (MB)</Text>

            <TextInput
              value={targetText}
              onChangeText={handleTargetChange}
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

        <View style={styles.audioCard}>
          <VolumeX color="#A78BFA" size={22} />

          <View style={{ flex: 1 }}>
            <Text style={styles.presetTitle}>Remove Audio</Text>

            <Text style={styles.muted}>Export video without sound</Text>
          </View>

          <Switch
            value={settings.removeAudio}
            onValueChange={(value) => updateSettings({ removeAudio: value })}
            trackColor={{
              false: "#475569",
              true: "#7C3AED",
            }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.estimateCard}>
          <View style={styles.estimateHeading}>
            <Zap color="#A78BFA" size={22} />

            <Text style={styles.sectionTitle}>Output Size Preview</Text>
          </View>

          <View style={styles.sizeRow}>
            <Text style={styles.muted}>Original size</Text>

            <Text style={styles.value}>{formatMB(video.sizeBytes)}</Text>
          </View>

          <View style={styles.sizeRow}>
            <Text style={styles.muted}>
              {settings.preset === "custom"
                ? "Requested size"
                : "Illustrative size"}
            </Text>

            <Text style={styles.highlightValue}>
              {estimatedSizeMB != null && estimatedSizeMB > 0
                ? `${estimatedSizeMB.toFixed(1)} MB`
                : "—"}
            </Text>
          </View>

          {estimatedSavings != null && (
            <Text style={styles.savings}>
              {estimatedSavings >= 0
                ? `${estimatedSavings}% potential size reduction`
                : "Target exceeds original file size"}
            </Text>
          )}

          <View style={styles.noticeRow}>
            <Info color="#94A3B8" size={16} />

            <Text style={styles.noticeText}>
              These are illustrative values only. Actual output size depends on
              the encoder, source video, and compression settings.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, isCompressing && { opacity: 0.6 }]}
          disabled={isCompressing}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>
            <Zap size={17} color="#FFFFFF" />
            {isCompressing ? "Processing Video..." : "Start Compression"}
          </Text>
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
    gap: 16,
    padding: 20,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  empty: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
  },
  videoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  videoName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  muted: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
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
  },
  selectedCard: {
    borderColor: "#8B5CF6",
    backgroundColor: "#2E2547",
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
  estimateCard: {
    borderRadius: 16,
    backgroundColor: "#1E293B",
    padding: 20,
  },
  estimateHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  value: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  highlightValue: {
    color: "#A78BFA",
    fontSize: 20,
    fontWeight: "800",
  },
  savings: {
    color: "#4ADE80",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
  noticeRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 17,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#334155",
  },
  button: {
    backgroundColor: "#7C3AED",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
