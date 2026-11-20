import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/lib/api";
import { Button, Card } from "../src/components/UI";
import { MapBus } from "../src/components/BusMap";
import { useApp } from "../src/context/AppContext";
import { themeColors } from "../src/theme/theme";

type Bus = MapBus & {
  speed?: number;
  status?: string;
  route?: {
    name?: string;
    code?: string;
    origin?: string;
    destination?: string;
  } | null;
};
type BusFilter = "all" | "live" | "offline";

export default function Buses() {
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const { prefs, dark } = useApp();
  const colors = themeColors(dark);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [query, setQuery] = useState(
    typeof initialQuery === "string" ? initialQuery : "",
  );
  const [busFilter, setBusFilter] = useState<BusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api<{ data: { buses: Bus[] } }>(
        "/api/passenger/buses",
      );
      setBuses(response.data.buses ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load buses.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setQuery(typeof initialQuery === "string" ? initialQuery : "");
  }, [initialQuery]);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (!prefs.liveTracking) return;
      const timer = setInterval(
        () => void load(),
        prefs.refreshSeconds * 1000,
      );
      return () => clearInterval(timer);
    }, [load, prefs.liveTracking, prefs.refreshSeconds]),
  );

  const filteredBuses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return buses.filter((bus) => {
      if (busFilter === "live" && !bus.isLive) return false;
      if (busFilter === "offline" && bus.isLive) return false;
      if (!normalizedQuery) return true;
      return [
        bus.label,
        bus.busId,
        bus.route?.name,
        bus.route?.code,
        bus.route?.origin,
        bus.route?.destination,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [buses, busFilter, query]);

  const busCounts = useMemo(
    () => ({
      all: buses.length,
      live: buses.filter((bus) => bus.isLive).length,
      offline: buses.filter((bus) => !bus.isLive).length,
    }),
    [buses],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to explore"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginBottom: 18,
            paddingVertical: 6,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.muted} />
          <Text style={{ color: colors.muted, fontWeight: "700" }}>Explore</Text>
        </Pressable>

        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>
          LIVE FLEET
        </Text>
        <Text
          style={{
            fontSize: 29,
            fontWeight: "900",
            color: colors.ink,
            marginTop: 4,
          }}
        >
          All buses
        </Text>
        <Text style={{ color: colors.muted, marginTop: 6, marginBottom: 18 }}>
          Search by bus name, ID, or route.
        </Text>

        <View
          style={{
            height: 52,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            marginBottom: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search buses"
            value={query}
            onChangeText={setQuery}
            placeholder="Search buses or routes"
            placeholderTextColor={colors.subtle}
            autoCapitalize="none"
            returnKeyType="search"
            style={{ flex: 1, color: colors.ink, fontSize: 15 }}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={20} color={colors.subtle} />
            </Pressable>
          )}
        </View>

        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}
        >
          {([
            ["all", `All ${busCounts.all}`],
            ["live", `Live ${busCounts.live}`],
            ["offline", `Offline ${busCounts.offline}`],
          ] as [BusFilter, string][]).map(([value, label]) => {
            const selected = busFilter === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setBusFilter(value)}
                style={{
                  flex: 1,
                  minHeight: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 13,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: selected ? colors.primary : colors.muted,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/map")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 15,
            marginBottom: 20,
            borderRadius: 16,
            backgroundColor: colors.navy,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
            <Ionicons name="map-outline" size={21} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800" }}>
              View all buses on the map
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>

        {loading ? (
          <ActivityIndicator style={{ padding: 28 }} color={colors.primary} />
        ) : error ? (
          <Card>
            <Text style={{ color: colors.danger, fontWeight: "800" }}>
              Couldn’t load buses
            </Text>
            <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>
              {error}
            </Text>
            <View style={{ marginTop: 14 }}>
              <Button
                title="Try again"
                secondary
                onPress={() => {
                  setLoading(true);
                  void load();
                }}
              />
            </View>
          </Card>
        ) : filteredBuses.length === 0 ? (
          <Card style={{ alignItems: "center", padding: 26 }}>
            <Ionicons name="bus-outline" size={34} color={colors.primary} />
            <Text
              style={{
                color: colors.ink,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 10,
              }}
            >
              {query ? "No matching buses" : "No buses available"}
            </Text>
            <Text
              style={{
                color: colors.muted,
                textAlign: "center",
                marginTop: 5,
                lineHeight: 20,
              }}
            >
              {query
                ? "Try a different bus ID or route name."
                : "Buses will appear here when the service is online."}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredBuses.map((bus) => (
              <Pressable
                key={bus.busId}
                accessibilityRole="button"
                accessibilityLabel={`View ${bus.label}, ${bus.route?.name || "route not assigned"}`}
                onPress={() =>
                  router.push(`/bus/${encodeURIComponent(bus.busId)}`)
                }
              >
                <Card
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: colors.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="bus" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.ink,
                        fontWeight: "800",
                        fontSize: 15,
                      }}
                    >
                      {bus.label}
                    </Text>
                    <Text
                      style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}
                    >
                      {bus.route?.name || "Route not assigned"} · {bus.busId}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        color: bus.isLive ? colors.success : colors.warning,
                        fontSize: 11,
                        fontWeight: "900",
                      }}
                    >
                      {bus.isLive ? "LIVE" : "STALE"}
                    </Text>
                    <Text
                      style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}
                    >
                      {Math.round(Number(bus.speed) || 0)} km/h
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
