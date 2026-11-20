import React, { useRef, useState } from "react";
import { Animated, Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { FadeIn, PressScale } from "../src/components/motion";
import { useTheme } from "../src/hooks/useTheme";
import { radius, spacing } from "../src/theme/theme";

export const ONBOARDING_KEY = "bustrack.onboarding.completed";
const { width } = Dimensions.get("window");

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: "map-outline",
    eyebrow: "LIVE MAP",
    title: "See every bus, moving",
    body: "Live positions update as buses travel their routes. Switch between street, satellite and dark maps, and show routes and stops.",
  },
  {
    icon: "navigate-outline",
    eyebrow: "WHERE IS MY BUS?",
    title: "Know exactly when it arrives",
    body: "Pick your stop and follow your bus stop by stop. You get an estimated arrival time, and you can set an alert when it is close.",
  },
  {
    icon: "ticket-outline",
    eyebrow: "BOOK AHEAD",
    title: "Reserve seats for today",
    body: "When a driver accepts bookings, reserve a seat between any two stops and pay the conductor on board. Cancel up until you travel.",
  },
  {
    icon: "notifications-outline",
    eyebrow: "STAY AWARE",
    title: "Never miss your stop",
    body: "Save your favourite buses and turn on arrival alerts. We only need your location while you use the map, and never in the background.",
  },
];

export default function Onboarding() {
  const colors = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const [permissions, setPermissions] = useState<{ location: boolean; notifications: boolean }>({
    location: false,
    notifications: false,
  });
  const [busy, setBusy] = useState(false);
  const totalSteps = SLIDES.length + 1;
  const onPermissionStep = index === SLIDES.length;

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };

  const finish = async () => {
    setBusy(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // Storage is best effort. The app still opens; onboarding may show again next launch.
    }
    router.replace("/(tabs)");
  };

  const askLocation = async () => {
    const result = await Location.requestForegroundPermissionsAsync();
    setPermissions((current) => ({ ...current, location: result.status === "granted" }));
  };

  const askNotifications = async () => {
    const result = await Notifications.requestPermissionsAsync();
    setPermissions((current) => ({ ...current, notifications: result.granted }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16 }}>BusTrack India</Text>
        {!onPermissionStep ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => goTo(SLIDES.length)} hitSlop={12}>
            <Text style={{ color: colors.muted, fontWeight: "600" }}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const scale = scrollX.interpolate({ inputRange, outputRange: [0.7, 1, 0.7], extrapolate: "clamp" });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });
          return (
            <View key={slide.title} style={{ width, paddingHorizontal: spacing.xl, justifyContent: "center", gap: spacing.lg }}>
              <Animated.View style={{ alignSelf: "center", transform: [{ scale }], opacity }}>
                <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={slide.icon} size={52} color="#FFFFFF" />
                  </View>
                </View>
              </Animated.View>
              <Animated.View style={{ opacity, gap: spacing.sm }}>
                <Text style={{ color: colors.primary, fontWeight: "700", letterSpacing: 1, fontSize: 12 }}>{slide.eyebrow}</Text>
                <Text style={{ color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.6 }}>{slide.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>{slide.body}</Text>
              </Animated.View>
            </View>
          );
        })}

        <View style={{ width, paddingHorizontal: spacing.xl, justifyContent: "center", gap: spacing.lg }}>
          <FadeIn>
            <Text style={{ color: colors.primary, fontWeight: "700", letterSpacing: 1, fontSize: 12 }}>ONE LAST THING</Text>
            <Text style={{ color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, marginTop: spacing.sm }}>Turn on the useful bits</Text>
            <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: spacing.sm }}>
              Both are optional. You can change them later in Settings.
            </Text>
          </FadeIn>
          <PermissionCard
            icon="location-outline"
            title="Location"
            body="Centre the map on you and sort buses by distance."
            granted={permissions.location}
            onAllow={askLocation}
            delay={120}
          />
          <PermissionCard
            icon="notifications-outline"
            title="Notifications"
            body="Get alerted when your bus is close to your stop."
            granted={permissions.notifications}
            onAllow={askNotifications}
            delay={220}
          />
        </View>
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const active = i === index;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Go to step ${i + 1}`}
                onPress={() => goTo(i)}
                hitSlop={8}
                style={{
                  width: active ? 26 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: active ? colors.primary : colors.border,
                }}
              />
            );
          })}
        </View>
        <PressScale
          accessibilityLabel={onPermissionStep ? "Start using BusTrack" : "Next"}
          onPress={() => (onPermissionStep ? void finish() : goTo(index + 1))}
          disabled={busy}
          style={{ backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.lg, alignItems: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
            {onPermissionStep ? "Start exploring" : "Continue"}
          </Text>
        </PressScale>
      </View>
    </SafeAreaView>
  );
}

function PermissionCard({
  icon,
  title,
  body,
  granted,
  onAllow,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  granted: boolean;
  onAllow: () => Promise<void>;
  delay: number;
}) {
  const colors = useTheme();
  return (
    <FadeIn delay={delay}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: granted ? colors.success : colors.line }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={granted ? "checkmark" : icon} size={22} color={granted ? colors.success : colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 15 }}>{title}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{body}</Text>
        </View>
        {!granted ? (
          <PressScale accessibilityLabel={`Allow ${title}`} onPress={() => void onAllow()} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>Allow</Text>
          </PressScale>
        ) : null}
      </View>
    </FadeIn>
  );
}
