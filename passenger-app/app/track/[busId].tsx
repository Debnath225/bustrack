import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/hooks/useTheme";
import { Chip, EmptyState, FadeIn, PressScale, ProgressBar, Skeleton, Surface } from "../../src/components/motion";
import { radius, spacing } from "../../src/theme/theme";
import {
  RouteStop,
  StopState,
  buildTrackSnapshot,
  formatDistance,
  formatEta,
  locatedStops,
} from "../../src/lib/eta";

type BusDetail = {
  busId: string;
  label: string;
  routeName: string | null;
  routeCode: string | null;
  stops: RouteStop[];
  isLive: boolean;
  status: string;
  location: { lat: number; lon: number; speed: number; recordedAt: string } | null;
};

const storageKey = (busId: string) => `bustrack.trackStop:${busId}`;

export default function TrackBus() {
  const colors = useTheme();
  const { busId: busIdParam } = useLocalSearchParams<{ busId: string }>();
  const busId = decodeURIComponent(String(busIdParam ?? ""));
  const { prefs, arrivalReminder, setArrivalReminder } = useApp();
  const [bus, setBus] = useState<BusDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api<{ data: { bus: BusDetail } }>(`/api/passenger/bus/${encodeURIComponent(busId)}`);
      setBus(response.data.bus);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this bus.");
    } finally {
      setLoading(false);
    }
  }, [busId]);

  useEffect(() => {
    void load();
    if (!prefs.liveTracking) return;
    const timer = setInterval(() => void load(), prefs.refreshSeconds * 1000);
    return () => clearInterval(timer);
  }, [load, prefs.liveTracking, prefs.refreshSeconds]);

  const located = useMemo(() => locatedStops(bus?.stops ?? []), [bus?.stops]);

  // Restore the stop the passenger picked last time, otherwise default to the final stop.
  useEffect(() => {
    if (!busId || located.length === 0) return;
    let active = true;
    void AsyncStorage.getItem(storageKey(busId)).then((saved) => {
      if (!active) return;
      const parsed = saved == null ? NaN : Number(saved);
      setTargetIndex((current) => {
        if (current != null) return current;
        return Number.isInteger(parsed) && parsed >= 0 && parsed < located.length ? parsed : located.length - 1;
      });
    });
    return () => {
      active = false;
    };
  }, [busId, located.length]);

  const chooseStop = (index: number) => {
    setTargetIndex(index);
    void AsyncStorage.setItem(storageKey(busId), String(index)).catch(() => undefined);
  };

  const snapshot = useMemo(() => {
    if (!bus?.location || targetIndex == null || !bus.isLive) return null;
    return buildTrackSnapshot(bus.stops, { lat: bus.location.lat, lon: bus.location.lon, speedKmh: bus.location.speed }, targetIndex);
  }, [bus, targetIndex]);

  const targetStop = targetIndex != null ? located[targetIndex] : undefined;
  const alertOn = arrivalReminder?.busId === busId && arrivalReminder?.stopIndex === targetStop?.index;

  const toggleAlert = () => {
    if (!bus || !targetStop) return;
    if (alertOn) {
      setArrivalReminder(null);
      return;
    }
    setArrivalReminder({
      busId: bus.busId,
      busLabel: bus.label,
      stopIndex: targetStop.index,
      stopName: targetStop.name,
      latitude: targetStop.lat,
      longitude: targetStop.lon,
      createdAt: Date.now(),
    });
    Alert.alert("Alert set", `We will notify you when ${bus.label} is near ${targetStop.name}. Keep the app open for best results.`);
  };

  const heroStatus = (() => {
    if (!bus) return { title: "Loading", tone: colors.muted };
    if (!bus.isLive || !snapshot) return { title: "Not sharing location", tone: colors.warning };
    if (snapshot.passedTarget) return { title: "Already passed your stop", tone: colors.muted };
    if (snapshot.offRoute) return { title: "Off the usual route", tone: colors.warning };
    return { title: "On its way", tone: colors.success };
  })();

  const progress = snapshot && snapshot.totalMeters > 0 ? snapshot.busProgressMeters / snapshot.totalMeters : 0;

  // Timeline: insert a bus marker after the last passed or current stop.
  const timeline = useMemo(() => {
    if (!snapshot) return located.map((stop, i) => ({ kind: "stop" as const, stop, index: i, state: "upcoming" as StopState }));
    const rows: Array<{ kind: "stop"; stop: (typeof located)[number]; index: number; state: StopState } | { kind: "bus" }> = [];
    let busInserted = false;
    snapshot.stopStates.forEach((state, index) => {
      rows.push({ kind: "stop", stop: located[index], index, state });
      const next = snapshot.stopStates[index + 1];
      if (!busInserted && state !== "upcoming" && next === "upcoming") {
        rows.push({ kind: "bus" });
        busInserted = true;
      }
    });
    if (!busInserted) rows.unshift({ kind: "bus" });
    return rows;
  }, [snapshot, located]);

  if (loading && !bus) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas, padding: spacing.xl, gap: spacing.lg }} edges={["top"]}>
        <Skeleton height={36} width={160} />
        <Skeleton height={180} borderRadius={radius.xl} />
        <Skeleton height={260} borderRadius={radius.lg} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}>
        <PressScale accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </PressScale>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: "800" }} numberOfLines={1}>{bus?.label ?? "Bus"}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{bus?.routeName ?? "Route not assigned"}</Text>
        </View>
        <PressScale accessibilityLabel="Open this bus on the map" onPress={() => router.push(`/map?busId=${encodeURIComponent(busId)}` as never)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="map-outline" size={20} color={colors.primary} />
        </PressScale>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60, gap: spacing.lg }}>
        {error ? (
          <Surface style={{ borderColor: colors.danger }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </Surface>
        ) : null}

        {!bus ? null : located.length < 2 ? (
          <EmptyState icon="git-network-outline" title="No route to follow yet" body="This bus does not have a route with mapped stops, so we cannot estimate its progress." />
        ) : (
          <>
            <FadeIn>
              <Surface style={{ gap: spacing.md, padding: spacing.xl }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: heroStatus.tone }} />
                  <Text style={{ color: heroStatus.tone, fontWeight: "700" }}>{heroStatus.title}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      {targetStop ? `Estimated to ${targetStop.name}` : "Choose your stop"}
                    </Text>
                    <Text style={{ color: colors.ink, fontSize: 40, fontWeight: "800", letterSpacing: -1 }}>
                      {snapshot ? formatEta(snapshot.etaSeconds) : bus?.isLive ? "—" : "Offline"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ color: colors.ink, fontWeight: "700" }}>
                      {snapshot && !snapshot.passedTarget ? formatDistance(snapshot.remainingMeters) : "—"}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {bus?.location ? `${Math.round(bus.location.speed)} km/h` : "No speed"}
                    </Text>
                  </View>
                </View>
                <ProgressBar value={progress} height={8} color={heroStatus.tone === colors.muted ? colors.muted : colors.primary} />
                <Text style={{ color: colors.subtle, fontSize: 12 }}>
                  {bus?.location ? `Last signal ${new Date(bus.location.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for the first GPS signal"}
                </Text>
              </Surface>
            </FadeIn>

            <FadeIn delay={80} style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 }}>YOUR STOP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.xl }}>
                {located.map((stop, i) => (
                  <Chip key={`${stop.index}-${stop.name}`} label={stop.name} active={targetIndex === i} onPress={() => chooseStop(i)} />
                ))}
              </ScrollView>
            </FadeIn>

            <FadeIn delay={120}>
              <PressScale
                accessibilityLabel={alertOn ? "Turn off arrival alert" : "Alert me when the bus is near"}
                onPress={toggleAlert}
                disabled={!targetStop}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: alertOn ? colors.successSoft : colors.surface, borderWidth: 1, borderColor: alertOn ? colors.success : colors.line }}
              >
                <Ionicons name={alertOn ? "notifications" : "notifications-outline"} size={22} color={alertOn ? colors.success : colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700" }}>{alertOn ? "Alert is on" : "Alert me when it is near"}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{targetStop ? `Within about 500 m of ${targetStop.name}` : "Pick a stop first"}</Text>
                </View>
              </PressScale>
            </FadeIn>

            <FadeIn delay={160}>
              <Surface style={{ gap: 0, paddingVertical: spacing.lg }}>
                <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16, marginBottom: spacing.md }}>Along the route</Text>
                {timeline.map((row, i) => {
                  const last = i === timeline.length - 1;
                  if (row.kind === "bus") {
                    return (
                      <View key="bus" style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 }}>
                        <View style={{ width: 28, alignItems: "center" }}>
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="bus" size={15} color="#FFFFFF" />
                          </View>
                        </View>
                        <Text style={{ color: colors.primary, fontWeight: "700" }}>{bus?.label ?? "Bus"} is here</Text>
                      </View>
                    );
                  }
                  const isTarget = row.index === targetIndex;
                  const passed = row.state === "passed";
                  const current = row.state === "current";
                  const dotColor = passed ? colors.success : current ? colors.primary : colors.border;
                  return (
                    <View key={`stop-${row.index}`} style={{ flexDirection: "row", gap: spacing.md, minHeight: 44 }}>
                      <View style={{ width: 28, alignItems: "center" }}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, marginTop: 6, backgroundColor: passed ? dotColor : colors.surface, borderWidth: 2, borderColor: dotColor }} />
                        {!last ? <View style={{ flex: 1, width: 2, backgroundColor: passed ? colors.success : colors.line, marginVertical: 2 }} /> : null}
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Set ${row.stop.name} as your stop`} onPress={() => chooseStop(located.findIndex((l) => l.index === row.stop.index))} style={{ flex: 1, paddingBottom: spacing.md }}>
                        <Text style={{ color: passed ? colors.muted : colors.ink, fontWeight: isTarget || current ? "800" : "600", fontSize: 15 }}>
                          {row.stop.name}
                        </Text>
                        {isTarget ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Your stop</Text> : null}
                      </Pressable>
                    </View>
                  );
                })}
              </Surface>
            </FadeIn>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
