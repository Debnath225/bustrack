import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BusMap, DEFAULT_MAP_REGION, MapKind, MapRoute, MapStop, MapBus, getBusCoordinates, coordinateOf } from "../src/components/BusMap";
import { Chip, FadeIn, PressScale, Sheet, Surface, Toggle } from "../src/components/motion";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import { useTheme } from "../src/hooks/useTheme";
import { radius, spacing } from "../src/theme/theme";

type Bus = MapBus & { speed?: number; recordedAt?: string | null };
type RouteWithStops = {
  id: string;
  name: string;
  code: string;
  color: string;
  stops: Array<{ name: string; lat: number | null; lon: number | null }>;
};

const MAP_KINDS: Array<{ key: MapKind; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "standard", label: "Street", icon: "map-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
  { key: "satellite", label: "Satellite", icon: "earth-outline" },
  { key: "hybrid", label: "Hybrid", icon: "layers-outline" },
];

export default function LiveMap() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { busId: busIdParam } = useLocalSearchParams<{ busId?: string }>();
  const requestedBusId = typeof busIdParam === "string" ? decodeURIComponent(busIdParam) : undefined;
  const { prefs, updatePrefs, favorites, toggleFavorite } = useApp();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteWithStops[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);
  const hasFitted = useRef(false);
  const focusedBusId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api<{ data: { buses: Bus[] } }>("/api/passenger/buses");
      setBuses(response.data.buses ?? []);
    } catch (cause) {
      Alert.alert("Live map", cause instanceof Error ? cause.message : "Unable to load bus locations.");
    }
  }, []);

  useEffect(() => {
    void api<{ data: { routes: RouteWithStops[] } }>("/api/passenger/routes")
      .then((response) => setRoutes(response.data.routes ?? []))
      .catch(() => setRoutes([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (!prefs.liveTracking) return;
      const timer = setInterval(() => void load(), prefs.refreshSeconds * 1000);
      return () => clearInterval(timer);
    }, [load, prefs.liveTracking, prefs.refreshSeconds]),
  );

  const visibleBuses = requestedBusId ? buses.filter((bus) => bus.busId === requestedBusId) : buses;
  const selectedBus = visibleBuses.find((bus) => bus.busId === selectedBusId) ?? null;
  const selectedRoute = selectedBus?.route ? routes.find((route) => route.id === (selectedBus.route as { id?: string }).id || route.code === selectedBus.route?.code) : undefined;

  const mapRoutes: MapRoute[] = useMemo(
    () =>
      routes.map((route) => ({
        id: route.id,
        color: route.color || colors.primary,
        coordinates: route.stops.flatMap((stop) => {
          const c = coordinateOf({ lat: stop.lat, lon: stop.lon });
          return c ? [c] : [];
        }),
      })),
    [routes, colors.primary],
  );

  const mapStops: MapStop[] = useMemo(() => {
    const source = selectedRoute ?? null;
    if (!source) return [];
    return source.stops.flatMap((stop, index) => {
      const coordinate = coordinateOf({ lat: stop.lat, lon: stop.lon });
      return coordinate ? [{ key: `${source.id}-${index}`, coordinate, label: stop.name }] : [];
    });
  }, [selectedRoute]);

  useEffect(() => {
    if (!mapReady) return;
    if (requestedBusId && focusedBusId.current !== requestedBusId) {
      const target = buses.find((bus) => bus.busId === requestedBusId);
      const [coordinate] = target ? getBusCoordinates([target]) : [];
      if (!coordinate) return;
      focusedBusId.current = requestedBusId;
      hasFitted.current = true;
      setSelectedBusId(requestedBusId);
      mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 400);
      return;
    }
    if (requestedBusId || hasFitted.current) return;
    const coordinates = getBusCoordinates(buses);
    if (coordinates.length === 0) return;
    hasFitted.current = true;
    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion({ ...coordinates[0], latitudeDelta: 0.05, longitudeDelta: 0.05 }, 400);
    } else {
      mapRef.current?.fitToCoordinates(coordinates, { edgePadding: { top: 160, right: 60, bottom: 220, left: 60 }, animated: true });
    }
  }, [buses, mapReady, requestedBusId]);

  const locate = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location permission needed", "Allow location access to centre the map on you.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      hasFitted.current = true;
      setHasLocationPermission(true);
      mapRef.current?.animateToRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500);
    } catch {
      Alert.alert("Location unavailable", "Check that location services are enabled.");
    }
  };

  const liveCount = visibleBuses.filter((bus) => bus.isLive).length;
  const saved = selectedBus ? favorites.includes(selectedBus.busId) : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <BusMap
        mapRef={mapRef}
        buses={visibleBuses}
        kind={prefs.mapKind}
        routes={mapRoutes}
        stops={mapStops}
        selectedBusId={selectedBusId}
        initialRegion={DEFAULT_MAP_REGION}
        showUserLocation={hasLocationPermission}
        onMapReady={() => setMapReady(true)}
        onPanDrag={() => {
          hasFitted.current = true;
        }}
        onSelectBus={(bus) => setSelectedBusId(bus.busId)}
        style={{ flex: 1 }}
      />

      <SafeAreaView pointerEvents="box-none" edges={[]} style={{ position: "absolute", top: insets.top + 10, left: spacing.lg, right: spacing.lg }}>
        <FadeIn style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <PressScale accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </PressScale>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: liveCount ? colors.success : colors.warning }} />
            <Text style={{ color: colors.ink, fontWeight: "700" }}>{liveCount} live</Text>
            <Text style={{ color: colors.muted }}>· {visibleBuses.length} buses</Text>
          </View>
          <PressScale accessibilityLabel="Customise map" onPress={() => setCustomizeOpen(true)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
            <Ionicons name="options-outline" size={21} color={colors.primary} />
          </PressScale>
        </FadeIn>
      </SafeAreaView>

      <View pointerEvents="box-none" style={{ position: "absolute", right: spacing.lg, bottom: selectedBus ? 200 : insets.bottom + 24 }}>
        <PressScale accessibilityLabel="Centre on my location" onPress={() => void locate()} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 8, elevation: 4 }}>
          <Ionicons name="locate-outline" size={22} color={colors.primary} />
        </PressScale>
      </View>

      {selectedBus ? (
        <FadeIn distance={30} style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: insets.bottom + 16 }}>
          <Surface style={{ gap: spacing.md, shadowOpacity: 0.16, shadowRadius: 16, elevation: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: selectedBus.isLive ? colors.successSoft : colors.warningSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bus" size={22} color={selectedBus.isLive ? colors.success : colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }} numberOfLines={1}>{selectedBus.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{selectedBus.route?.name ?? "Route not assigned"}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Deselect bus" onPress={() => setSelectedBusId(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <PressScale accessibilityLabel="Track this bus" onPress={() => router.push(`/track/${encodeURIComponent(selectedBus.busId)}` as never)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.primary }}>
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Where is my bus?</Text>
              </PressScale>
              <PressScale accessibilityLabel={saved ? "Remove from saved" : "Save bus"} onPress={() => toggleFavorite(selectedBus.busId)} style={{ width: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primarySoft }}>
                <Ionicons name={saved ? "star" : "star-outline"} size={20} color={saved ? colors.warning : colors.primary} />
              </PressScale>
            </View>
          </Surface>
        </FadeIn>
      ) : null}

      <Sheet visible={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Customise map">
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 }}>STYLE</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {MAP_KINDS.map((kind) => (
            <Chip key={kind.key} label={kind.label} icon={kind.icon} active={prefs.mapKind === kind.key} onPress={() => updatePrefs({ mapKind: kind.key })} />
          ))}
        </View>
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: "600" }}>Show routes</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Draw each bus route on the map</Text>
            </View>
            <Toggle label="Show routes" value={prefs.showRoutes} onValueChange={(value) => updatePrefs({ showRoutes: value })} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: "600" }}>Show stops</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Stops for the bus you selected</Text>
            </View>
            <Toggle label="Show stops" value={prefs.showStops} onValueChange={(value) => updatePrefs({ showStops: value })} />
          </View>
        </View>
      </Sheet>
    </View>
  );
}
