import React, { useRef, useState } from "react";
import { Animated, Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../src/context/AppContext";
import { FadeIn, PressScale } from "../src/components/motion";
import { palette as p } from "../src/theme/theme";

const { width } = Dimensions.get("window");

const SLIDES: Array<{ icon: keyof typeof Ionicons.glyphMap; eyebrow: string; title: string; body: string }> = [
  {
    icon: "shield-checkmark-outline",
    eyebrow: "WELCOME",
    title: "Run your fleet from your pocket",
    body: "BusTrack Ops is for drivers on duty and administrators managing buses, routes and approvals.",
  },
  {
    icon: "navigate-outline",
    eyebrow: "DRIVERS",
    title: "Share live location on duty",
    body: "Start your duty to share the bus position with passengers. Manage fares and accept same-day bookings, then mark passengers as boarded.",
  },
  {
    icon: "map-outline",
    eyebrow: "ROUTES ON THE MAP",
    title: "Draw routes by tapping the map",
    body: "Pick your own start, stops and end point. No existing route fits? Draw one and send it for review, or let an admin build it.",
  },
  {
    icon: "stats-chart-outline",
    eyebrow: "ADMINISTRATORS",
    title: "Stay in control",
    body: "See live KPIs at a glance, approve driver access, control bus status and build routes. Every change is one tap away.",
  },
];

export default function Onboarding() {
  const { completeOnboarding } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };

  const finish = async () => {
    await completeOnboarding();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingTop: 10 }}>
        <Text style={{ color: p.brand, fontWeight: "800", fontSize: 16 }}>BusTrack Ops</Text>
        {!last ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => goTo(SLIDES.length - 1)} hitSlop={12}>
            <Text style={{ color: p.muted, fontWeight: "600" }}>Skip</Text>
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
          const scale = scrollX.interpolate({ inputRange, outputRange: [0.75, 1, 0.75], extrapolate: "clamp" });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });
          return (
            <View key={slide.title} style={{ width, paddingHorizontal: 26, justifyContent: "center", gap: 22 }}>
              <Animated.View style={{ alignSelf: "center", transform: [{ scale }], opacity }}>
                <View style={{ width: 190, height: 190, borderRadius: 95, backgroundColor: p.brandSoft, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 116, height: 116, borderRadius: 58, backgroundColor: p.brand, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={slide.icon} size={54} color="#FFFFFF" />
                  </View>
                </View>
              </Animated.View>
              <Animated.View style={{ opacity, gap: 10 }}>
                <Text style={{ color: p.brand, fontWeight: "700", letterSpacing: 1, fontSize: 12 }}>{slide.eyebrow}</Text>
                <Text style={{ color: p.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.6 }}>{slide.title}</Text>
                <Text style={{ color: p.muted, fontSize: 16, lineHeight: 24 }}>{slide.body}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <FadeIn delay={100} style={{ paddingHorizontal: 22, paddingBottom: 18, gap: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Go to step ${i + 1}`}
              onPress={() => goTo(i)}
              hitSlop={8}
              style={{ width: i === index ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? p.brand : p.line }}
            />
          ))}
        </View>
        <PressScale
          accessibilityLabel={last ? "Get started" : "Next"}
          onPress={() => (last ? void finish() : goTo(index + 1))}
          style={{ backgroundColor: p.brand, paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{last ? "Get started" : "Continue"}</Text>
        </PressScale>
      </FadeIn>
    </SafeAreaView>
  );
}
