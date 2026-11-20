import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/hooks/useTheme";
import { Chip, FadeIn, PressScale, Surface, Toggle } from "../../src/components/motion";
import { ACCENTS, AccentKey, radius, spacing } from "../../src/theme/theme";
import type { MapKind } from "../../src/components/BusMap";

const REFRESH_OPTIONS = [5, 10, 20, 30];

function Row({ icon, title, body, right }: { icon: keyof typeof Ionicons.glyphMap; title: string; body?: string; right: React.ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontWeight: "600", fontSize: 15 }}>{title}</Text>
        {body ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{body}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Section({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  const colors = useTheme();
  return (
    <FadeIn delay={delay} style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginLeft: 4 }}>{title}</Text>
      <Surface style={{ paddingVertical: 0, paddingHorizontal: spacing.lg }}>{children}</Surface>
    </FadeIn>
  );
}

const Divider = () => {
  const colors = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
};

export default function Settings() {
  const colors = useTheme();
  const { user, signOut, dark, setDark, prefs, updatePrefs } = useApp();

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You can sign in again any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut().then(() => router.replace("/login"));
        },
      },
    ]);

  const mapKinds: Array<{ key: MapKind; label: string }> = [
    { key: "standard", label: "Street" },
    { key: "dark", label: "Dark" },
    { key: "satellite", label: "Satellite" },
    { key: "hybrid", label: "Hybrid" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, gap: spacing.xl }}>
        <FadeIn style={{ gap: 4 }}>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }}>Settings</Text>
          <Text style={{ color: colors.muted }}>Make BusTrack fit the way you travel.</Text>
        </FadeIn>

        <Surface style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>{(user?.name?.[0] ?? "B").toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }}>{user?.name ?? "Guest"}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{user?.email ?? "Not signed in"}</Text>
          </View>
        </Surface>

        <Section title="Appearance" delay={60}>
          <Row icon="moon-outline" title="Dark mode" body="Easier on the eyes at night" right={<Toggle label="Dark mode" value={dark} onValueChange={setDark} />} />
          <Divider />
          <View style={{ paddingVertical: spacing.md, gap: spacing.md }}>
            <Text style={{ color: colors.ink, fontWeight: "600", fontSize: 15 }}>Accent colour</Text>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
                const active = prefs.accent === key;
                return (
                  <PressScale
                    key={key}
                    accessibilityLabel={`${ACCENTS[key].label} accent`}
                    onPress={() => updatePrefs({ accent: key })}
                    style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: ACCENTS[key].value, alignItems: "center", justifyContent: "center", borderWidth: active ? 3 : 0, borderColor: colors.surface, shadowColor: ACCENTS[key].value, shadowOpacity: active ? 0.5 : 0, shadowRadius: 8, elevation: active ? 4 : 0 }}
                  >
                    {active ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : null}
                  </PressScale>
                );
              })}
            </View>
          </View>
        </Section>

        <Section title="Map" delay={120}>
          <View style={{ paddingVertical: spacing.md, gap: spacing.md }}>
            <Text style={{ color: colors.ink, fontWeight: "600", fontSize: 15 }}>Default map style</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {mapKinds.map((kind) => (
                <Chip key={kind.key} label={kind.label} active={prefs.mapKind === kind.key} onPress={() => updatePrefs({ mapKind: kind.key })} />
              ))}
            </View>
          </View>
          <Divider />
          <Row icon="git-branch-outline" title="Show routes" body="Route lines on the live map" right={<Toggle label="Show routes" value={prefs.showRoutes} onValueChange={(value) => updatePrefs({ showRoutes: value })} />} />
          <Divider />
          <Row icon="ellipse-outline" title="Show stops" body="Stops for the selected bus" right={<Toggle label="Show stops" value={prefs.showStops} onValueChange={(value) => updatePrefs({ showStops: value })} />} />
        </Section>

        <Section title="Live updates" delay={180}>
          <Row icon="pulse-outline" title="Live tracking" body="Keep bus positions up to date" right={<Toggle label="Live tracking" value={prefs.liveTracking} onValueChange={(value) => updatePrefs({ liveTracking: value })} />} />
          <Divider />
          <View style={{ paddingVertical: spacing.md, gap: spacing.md }}>
            <Text style={{ color: colors.ink, fontWeight: "600", fontSize: 15 }}>Refresh every</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              {REFRESH_OPTIONS.map((seconds) => (
                <Chip key={seconds} label={`${seconds}s`} active={prefs.refreshSeconds === seconds} onPress={() => updatePrefs({ refreshSeconds: seconds })} />
              ))}
            </View>
          </View>
        </Section>

        <Section title="Alerts" delay={240}>
          <Row icon="notifications-outline" title="Arrival alerts" body="Notify when your bus is near" right={<Toggle label="Arrival alerts" value={prefs.arrivalAlerts} onValueChange={(value) => updatePrefs({ arrivalAlerts: value })} />} />
          <Divider />
          <Row icon="volume-high-outline" title="Sound" body="Play a sound with alerts" right={<Toggle label="Alert sound" value={prefs.sound} onValueChange={(value) => updatePrefs({ sound: value })} />} />
        </Section>

        <Section title="About" delay={300}>
          <Pressable accessibilityRole="link" onPress={() => router.push("/legal")} style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg, gap: spacing.md }}>
            <Ionicons name="document-text-outline" size={20} color={colors.muted} />
            <Text style={{ color: colors.ink, flex: 1, fontWeight: "600" }}>Privacy and terms</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>
        </Section>

        <FadeIn delay={360}>
          <PressScale accessibilityLabel="Sign out" onPress={confirmSignOut} style={{ paddingVertical: 15, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center" }}>
            <Text style={{ color: colors.danger, fontWeight: "700" }}>Sign out</Text>
          </PressScale>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}
