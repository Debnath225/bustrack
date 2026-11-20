import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useApp } from "../src/context/AppContext";
import { palette } from "../src/theme/theme";

export default function Index() {
  const { user, ready, setupComplete, onboardingDone } = useApp();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.bg,
        }}
      >
        <ActivityIndicator color={palette.brand} />
      </View>
    );
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/login" />;
  return <Redirect href={setupComplete ? "/(tabs)" : "/setup"} />;
}
