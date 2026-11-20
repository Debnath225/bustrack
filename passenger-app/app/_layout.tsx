import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "../src/context/AppContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useApp } from "../src/context/AppContext";
import { themeColors } from "../src/theme/theme";

function AppStack() {
  const { dark, prefs } = useApp();
  const colors = themeColors(dark, prefs.accent);

  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="legal" />
        <Stack.Screen name="bus/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="buses" options={{ headerShown: false }} />
        <Stack.Screen name="map" options={{ headerShown: false }} />
        <Stack.Screen name="track/[busId]" options={{ headerShown: false, animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
