import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <StatusBar style="light" />

        <AnimatedSplashOverlay />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#0F172A",
            },
          }}
        >
          <Stack.Screen name="(tabs)" />

          <Stack.Screen name="video/preview" />

          <Stack.Screen name="video/compress" />

          <Stack.Screen name="video/result" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
