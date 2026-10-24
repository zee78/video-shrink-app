import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Film, ShieldCheck, Zap } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useVideoStore } from "../../store/useVideoStore";

import { getVideoProcessorInfo } from "../../../modules/video-processor/src";

function formatSize(bytes: number | null): string {
  if (bytes == null) return "Unknown size";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const video = useVideoStore((state) => state.selectedVideo);
  const setSelectedVideo = useVideoStore((state) => state.setSelectedVideo);

  const testNativeEngine = () => {
    try {
      const info = getVideoProcessorInfo();

      Alert.alert(
        "Native Engine",
        `Status: ${info.status}\nPlatform: ${info.platform}`,
      );
    } catch (error) {
      console.error("Native engine test failed:", error);

      Alert.alert(
        "Native Engine Error",
        "Unable to communicate with the Android module.",
      );
    }
  };

  async function pickVideo() {
    try {
      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: false,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      setSelectedVideo({
        uri: asset.uri,
        name: asset.fileName ?? "Selected Video",
        sizeBytes: asset.fileSize ?? null,
        durationMs: asset.duration ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        mimeType: asset.mimeType ?? null,
      });

      router.push("/video/preview");
    } catch (error) {
      console.error("Video selection failed:", error);

      Alert.alert(
        "Unable to select video",
        "Please try selecting your video again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VideoShrink</Text>
        <Text style={styles.subtitle}>Smaller videos. Faster sharing.</Text>
      </View>

      <Pressable
        style={styles.selectCard}
        onPress={pickVideo}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Film size={44} color="#C4B5FD" />
        )}

        <Text style={styles.cardTitle}>Select a Video</Text>

        <Text style={styles.cardDescription}>
          Choose a video from your phone to get started.
        </Text>

        <View style={styles.button}>
          <Text style={styles.buttonText}>Browse Gallery</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={testNativeEngine}
        style={{
          backgroundColor: "#334155",
          padding: 16,
          borderRadius: 12,
          marginTop: 20,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "600",
          }}
        >
          Test Native Engine
        </Text>
      </Pressable>

      {video && (
        <View style={styles.videoCard}>
          <Text style={styles.sectionTitle}>Selected Video</Text>

          <Text style={styles.videoName} numberOfLines={2}>
            {video.name}
          </Text>

          <Text style={styles.videoDetails}>{formatSize(video.sizeBytes)}</Text>

          <Text style={styles.helper}>
            Video preview and compression settings are next.
          </Text>
        </View>
      )}

      <View style={styles.features}>
        <View style={styles.feature}>
          <Zap color="#A78BFA" size={22} />
          <Text style={styles.featureText}>Fast compression</Text>
        </View>

        <View style={styles.feature}>
          <ShieldCheck color="#A78BFA" size={22} />
          <Text style={styles.featureText}>Private & offline</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 22,
  },
  header: {
    marginTop: 24,
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 14,
  },
  selectCard: {
    backgroundColor: "#1E293B",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 28,
    alignItems: "center",
    gap: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardDescription: {
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 21,
  },
  button: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  videoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 18,
    marginTop: 24,
    gap: 8,
  },
  sectionTitle: {
    color: "#A78BFA",
    fontWeight: "700",
  },
  videoName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  videoDetails: {
    color: "#CBD5E1",
  },
  helper: {
    color: "#94A3B8",
    fontSize: 12,
  },
  features: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 32,
  },
  feature: {
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    color: "#CBD5E1",
    fontSize: 12,
  },
});
