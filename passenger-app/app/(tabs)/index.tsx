import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/hooks/useTheme";
import { Chip, EmptyState, FadeIn, PressScale, Skeleton, Surface } from "../../src/components/motion";
import { radius, spacing } from "../../src/theme/theme";

type Bus = {
  busId: string;
  label: string;
  routeId: string | null;
  route?: { name?: string; code?: string } | null;
  speed?: number;
  recordedAt?: string | null;
  isLive: boolean;
  status: string;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function ageLabel(recordedAt?: string | null) {
  if (!recordedAt) return "No signal yet";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(recordedAt).getTime()) / 1000));
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)} min ago`;
}

export default function Home() {
  const colors = useTheme();
  const { user, favorites, toggleFavorite, prefs } = useApp();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api<{ data: { buses: Bus[] } }>("/api/passenger/buses");
      setBuses(response.data.buses ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load buses.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (!prefs.liveTracking) return;
      const timer = setInterval(() => void load(), prefs.refreshSeconds * 1000);
      return () => clearInterval(timer);
    }, [load, prefs.liveTracking, prefs.refreshSeconds]),
  );

  const filtered = buses.filter((bus) => {
    if (liveOnly && !bus.isLive) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return [bus.label, bus.busId, bus.route?.name, bus.route?.code].some((value) =>
      (value ?? "").toLowerCase().includes(needle),
    );
  });

  const trackable = buses.find((bus) => favorites.includes(bus.busId)) ?? buses.find((bus) => bus.isLive) ?? null;
  const liveCount = buses.filter((bus) => bus.isLive).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, gap: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <FadeIn style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{greeting()}</Text>
            <Text style={{ color: colors.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>
              {user?.name?.split(" ")[0] ?? "Traveller"}
            </Text>
          </View>
          <PressScale
            accessibilityLabel="Open settings"
            onPress={() => router.push("/(tabs)/settings")}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 17 }}>{(user?.name?.[0] ?? "B").toUpperCase()}</Text>
          </PressScale>
        </FadeIn>

        <FadeIn delay={60} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.line }}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search buses or routes"
            value={query}
            onChangeText={setQuery}
            placeholder="Search bus or route"
            placeholderTextColor={colors.subtle}
            style={{ flex: 1, color: colors.ink, fontSize: 15, paddingVertical: 14 }}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </FadeIn>

        <FadeIn delay={120}>
          {loading ? (
            <Skeleton height={148} borderRadius={radius.xl} />
          ) : trackable ? (
            <PressScale
              accessibilityLabel={`Track ${trackable.label}`}
              onPress={() => router.push(`/track/${encodeURIComponent(trackable.busId)}` as never)}
              style={{ borderRadius: radius.xl, backgroundColor: colors.primary, padding: spacing.xl, gap: spacing.md, overflow: "hidden" }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontWeight: "700", letterSpacing: 0.8, fontSize: 12 }}>WHERE IS MY BUS?</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: trackable.isLive ? "#A7F3D0" : "#FDE68A" }} />
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>{trackable.isLive ? "Live" : "Offline"}</Text>
                </View>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>{trackable.label}</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)" }}>{trackable.route?.name ?? "Route not assigned"}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs }}>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{ageLabel(trackable.recordedAt)}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Track now</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </View>
              </View>
            </PressScale>
          ) : (
            <Surface style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }}>Track a bus</Text>
              <Text style={{ color: colors.muted, lineHeight: 20 }}>
                Save a bus or wait for one to go live. You will see its stop-by-stop progress here.
              </Text>
            </Surface>
          )}
        </FadeIn>

        <FadeIn delay={160} style={{ flexDirection: "row", gap: spacing.sm }}>
          {[
            { label: "Map", icon: "map-outline" as const, to: "/map" },
            { label: "All buses", icon: "bus-outline" as const, to: "/buses" },
            { label: "Tickets", icon: "ticket-outline" as const, to: "/(tabs)/tickets" },
            { label: "Saved", icon: "star-outline" as const, to: "/(tabs)/saved" },
          ].map((action) => (
            <PressScale
              key={action.label}
              accessibilityLabel={action.label}
              onPress={() => router.push(action.to as never)}
              style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={action.icon} size={19} color={colors.primary} />
              </View>
              <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "600" }}>{action.label}</Text>
            </PressScale>
          ))}
        </FadeIn>

        <FadeIn delay={200} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "700" }}>Buses near you</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{liveCount} live now</Text>
          </View>
          <Chip label="Live only" active={liveOnly} onPress={() => setLiveOnly((value) => !value)} icon="radio-outline" color={colors.success} />
        </FadeIn>

        {error ? (
          <Surface style={{ borderColor: colors.danger, gap: spacing.sm }}>
            <Text style={{ color: colors.danger, fontWeight: "600" }}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void load()} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Try again</Text>
            </Pressable>
          </Surface>
        ) : null}

        {loading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={92} borderRadius={radius.lg} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="bus-outline"
            title={buses.length ? "No buses match" : "No buses yet"}
            body={buses.length ? "Try a different search, or turn off Live only." : "Buses appear here once they are added to a route."}
          />
        ) : (
          filtered.map((bus, index) => {
            const saved = favorites.includes(bus.busId);
            return (
              <FadeIn key={bus.busId} delay={Math.min(index, 8) * 50}>
                <PressScale
                  accessibilityLabel={`${bus.label}, ${bus.isLive ? "live" : "offline"}`}
                  onPress={() => router.push(`/bus/${encodeURIComponent(bus.busId)}` as never)}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: bus.isLive ? colors.successSoft : colors.warningSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="bus" size={22} color={bus.isLive ? colors.success : colors.warning} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }} numberOfLines={1}>{bus.label}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{bus.route?.name ?? "Route not assigned"}</Text>
                    <Text style={{ color: colors.subtle, fontSize: 12 }}>
                      {bus.isLive ? `${Math.round(bus.speed ?? 0)} km/h · ${ageLabel(bus.recordedAt)}` : "Not sharing location"}
                    </Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={saved ? "Remove from saved" : "Save bus"} onPress={() => toggleFavorite(bus.busId)} hitSlop={12}>
                    <Ionicons name={saved ? "star" : "star-outline"} size={22} color={saved ? colors.warning : colors.subtle} />
                  </Pressable>
                </PressScale>
              </FadeIn>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
