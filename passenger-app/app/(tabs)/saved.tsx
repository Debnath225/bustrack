import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { Button, Card } from "../../src/components/UI";
import { MapBus } from "../../src/components/BusMap";
import { themeColors } from "../../src/theme/theme";

type Bus = MapBus & { route?: { name?: string } | null };

export default function Saved() {
  const { favorites, toggleFavorite, dark } = useApp();
  const colors = themeColors(dark);
  const [buses, setBuses] = useState<Bus[]>([]);
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
      setError(e instanceof Error ? e.message : "Unable to load saved buses.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const savedBuses = useMemo(
    () => buses.filter((bus) => favorites.includes(bus.busId)),
    [buses, favorites],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 18, paddingBottom: 28 }}
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
        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>
          YOUR SHORTLIST
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "900",
            color: colors.ink,
            marginBottom: 20,
            marginTop: 4,
          }}
        >
          Saved buses
        </Text>

        {loading ? (
          <ActivityIndicator style={{ padding: 28 }} color={colors.primary} />
        ) : error ? (
          <Card>
            <Text style={{ color: colors.danger, fontWeight: "800" }}>
              Couldn’t load your saved buses
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
        ) : savedBuses.length === 0 ? (
          <Card style={{ alignItems: "center", padding: 28 }}>
            <Ionicons name="heart-outline" size={36} color={colors.primary} />
            <Text
              style={{ fontWeight: "800", fontSize: 16, marginTop: 12 }}
            >
              Nothing saved yet
            </Text>
            <Text
              style={{
                color: colors.muted,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              Save buses from Explore to keep them close.
            </Text>
            <View style={{ marginTop: 16, width: "100%" }}>
              <Button
                title="Explore buses"
                onPress={() => router.replace("/(tabs)")}
              />
            </View>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {savedBuses.map((bus) => (
              <Card
                key={bus.busId}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${bus.label}`}
                  onPress={() =>
                    router.push(`/bus/${encodeURIComponent(bus.busId)}`)
                  }
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: colors.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="bus" color={colors.primary} size={23} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: colors.ink }}>
                      {bus.label}
                    </Text>
                    <Text
                      style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}
                    >
                      {bus.route?.name || bus.busId}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    color={colors.subtle}
                    size={18}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${bus.label} from saved buses`}
                  onPress={() => toggleFavorite(bus.busId)}
                  hitSlop={8}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="heart" color="#F04438" size={23} />
                </Pressable>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
