import React from "react";
import MapView, { LatLng, Marker, Polyline, Region } from "react-native-maps";
import { StyleProp, View, ViewStyle, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";

export type MapBus = {
  busId: string;
  label: string;
  lat: number | string | null;
  lon: number | string | null;
  isLive?: boolean;
  route?: {
    name?: string;
    code?: string;
    origin?: string;
    destination?: string;
  } | null;
};

export type MapKind = "standard" | "dark" | "satellite" | "hybrid";

export type MapRoute = {
  id: string;
  color: string;
  coordinates: LatLng[];
};

export type MapStop = {
  key: string;
  coordinate: LatLng;
  label: string;
  highlighted?: boolean;
};

export const DEFAULT_MAP_REGION: Region = {
  latitude: 23.548,
  longitude: 87.289,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d7deea" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#202a38" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38465a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#111b2a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#aab5c5" }] },
];

export function coordinateOf(value: { lat: number | string | null; lon: number | string | null }): LatLng | null {
  if (value.lat === null || value.lon === null) return null;
  const latitude = Number(value.lat);
  const longitude = Number(value.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function getBusCoordinates(buses: MapBus[]): LatLng[] {
  return buses.flatMap((bus) => {
    const coordinate = coordinateOf(bus);
    return coordinate ? [coordinate] : [];
  });
}

type Props = {
  buses: MapBus[];
  onSelectBus: (bus: MapBus) => void;
  style: StyleProp<ViewStyle>;
  mapRef?: React.Ref<MapView>;
  initialRegion?: Region;
  showUserLocation?: boolean;
  onMapReady?: () => void;
  onPanDrag?: () => void;
  kind?: MapKind;
  routes?: MapRoute[];
  stops?: MapStop[];
  selectedBusId?: string | null;
};

export function BusMap({
  buses,
  onSelectBus,
  style,
  mapRef,
  initialRegion = DEFAULT_MAP_REGION,
  showUserLocation = false,
  onMapReady,
  onPanDrag,
  kind,
  routes = [],
  stops = [],
  selectedBusId = null,
}: Props) {
  const { dark, prefs } = useApp();
  const resolvedKind: MapKind = kind ?? (dark ? "dark" : "standard");
  const mapType = resolvedKind === "satellite" || resolvedKind === "hybrid" ? resolvedKind : "standard";
  const customMapStyle = resolvedKind === "dark" ? DARK_MAP_STYLE : [];

  return (
    <MapView
      ref={mapRef}
      style={style}
      initialRegion={initialRegion}
      mapType={mapType}
      showsUserLocation={showUserLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      customMapStyle={customMapStyle}
      accessibilityLabel="Map showing bus locations"
      onMapReady={onMapReady}
      onPanDrag={onPanDrag}
    >
      {prefs.showRoutes
        ? routes.map((route) => (
            <Polyline key={route.id} coordinates={route.coordinates} strokeColor={route.color} strokeWidth={4} lineCap="round" lineJoin="round" />
          ))
        : null}
      {prefs.showStops
        ? stops.map((stop) => (
            <Marker key={stop.key} coordinate={stop.coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} title={stop.label}>
              <View
                style={{
                  width: stop.highlighted ? 16 : 10,
                  height: stop.highlighted ? 16 : 10,
                  borderRadius: 8,
                  backgroundColor: stop.highlighted ? "#12B76A" : "#FFFFFF",
                  borderWidth: 2,
                  borderColor: "#2563EB",
                }}
              />
            </Marker>
          ))
        : null}
      {buses.map((bus) => {
        const coordinate = coordinateOf(bus);
        if (!coordinate) return null;
        const selected = bus.busId === selectedBusId;
        const color = bus.isLive ? "#12B76A" : "#F79009";
        return (
          <Marker
            key={bus.busId}
            coordinate={coordinate}
            title={bus.label}
            description={bus.route?.name || bus.busId}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            onPress={() => onSelectBus(bus)}
          >
            <View
              style={{
                minWidth: selected ? 40 : 34,
                height: selected ? 40 : 34,
                paddingHorizontal: 6,
                borderRadius: 20,
                backgroundColor: color,
                borderWidth: selected ? 3 : 2,
                borderColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 3,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Ionicons name="bus" size={selected ? 20 : 17} color="#FFFFFF" />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}
