import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, router } from "expo-router";
import { useApp } from "../src/context/AppContext";
import { themeColors } from "../src/theme/theme";

const ONBOARDING_KEY = "bustrack.onboarding.completed";

export default function Index() {
  const { dark } = useApp();
  const colors = themeColors(dark);
  const [destination, setDestination] = useState<"/onboarding" | "/(tabs)" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(ONBOARDING_KEY)
      .then((completed) => {
        if (active) setDestination(completed === "true" ? "/(tabs)" : "/onboarding");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not read the app setup status.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  if (destination) return <Redirect href={destination} />;
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: colors.canvas,
      }}
    >
      {error ? (
        <View style={{ alignItems: "center", gap: 16 }}>
          <Text style={{ color: colors.danger, textAlign: "center" }}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(tabs)")}
            hitSlop={10}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Continue to the app
            </Text>
          </Pressable>
        </View>
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </View>
  );
}
