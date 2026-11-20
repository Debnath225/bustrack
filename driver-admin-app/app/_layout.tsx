import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../src/context/AppContext";
import { useApp } from "../src/context/AppContext";
import { palette as p } from "../src/theme/theme";

function AppStack() {
  const { dark } = useApp();

  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: p.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="request-access" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="route-builder" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function Root() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
