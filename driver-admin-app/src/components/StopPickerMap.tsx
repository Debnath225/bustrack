import React, { useEffect, useRef } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "./UI";
import { palette as p } from "../theme/theme";

export type PickerStop = { name: string; lat: number; lon: number };

export const DEFAULT_PICKER_REGION: Region = {
  latitude: 23.548,
  longitude: 87.289,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

function roleLabel(index: number, total: number) {
  if (index === 0) return "Start";
  if (index === total - 1) return "End";
  return `Via ${index}`;
}

/**
 * Lets a driver or admin draw a route on the map. Tapping the map adds a stop.
 * The first stop is the start and the last stop is the end. Stops can be renamed,
 * reordered or removed from the list below the map.
 */
export function StopPickerMap({
  stops,
  onChange,
  height = 300,
}: {
  stops: PickerStop[];
  onChange: (stops: PickerStop[]) => void;
  height?: number;
}) {
  const mapRef = useRef<MapView>(null);
  const fittedFor = useRef(0);

  useEffect(() => {
    // Fit the map to the route when it first gets two or more stops, and after reordering.
    if (stops.length >= 2 && stops.length !== fittedFor.current) {
      fittedFor.current = stops.length;
      mapRef.current?.fitToCoordinates(stops.map((s) => ({ latitude: s.lat, longitude: s.lon })), {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }
  }, [stops]);

  const addStop = (lat: number, lon: number, name?: string) =>
    onChange([...stops, { name: name ?? `Stop ${stops.length + 1}`, lat, lon }]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const useCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location needed", "Allow location access, or tap the map to place stops.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      addStop(location.coords.latitude, location.coords.longitude, "Current location");
    } catch {
      Alert.alert("Location unavailable", "Check that location services are on.");
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ height, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: p.line }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={DEFAULT_PICKER_REGION}
          onPress={(event) => {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            addStop(latitude, longitude);
          }}
          toolbarEnabled={false}
          accessibilityLabel="Route map. Tap to add a stop."
        >
          {stops.length > 1 ? (
            <Polyline coordinates={stops.map((s) => ({ latitude: s.lat, longitude: s.lon }))} strokeColor={p.brand} strokeWidth={4} lineCap="round" lineJoin="round" />
          ) : null}
          {stops.map((stop, index) => {
            const isStart = index === 0;
            const isEnd = index === stops.length - 1 && stops.length > 1;
            const background = isStart ? p.green : isEnd ? p.red : p.brand;
            return (
              <Marker key={`${index}-${stop.lat}-${stop.lon}`} coordinate={{ latitude: stop.lat, longitude: stop.lon }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: background, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                  <Txt color="#FFFFFF" bold size={12}>{isStart ? "A" : isEnd ? "B" : String(index)}</Txt>
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={() => void useCurrentLocation()} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 12, borderRadius: 13, backgroundColor: p.brandSoft }}>
          <Ionicons name="locate-outline" size={17} color={p.brand} />
          <Txt color={p.brand} bold size={13}>Add my location</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={stops.length === 0} onPress={() => onChange(stops.slice(0, -1))} style={{ paddingHorizontal: 14, justifyContent: "center", borderRadius: 13, backgroundColor: p.line, opacity: stops.length === 0 ? 0.5 : 1 }}>
          <Txt bold size={13}>Undo</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={stops.length === 0} onPress={() => onChange([])} style={{ paddingHorizontal: 14, justifyContent: "center", borderRadius: 13, backgroundColor: p.redSoft, opacity: stops.length === 0 ? 0.5 : 1 }}>
          <Txt color={p.red} bold size={13}>Clear</Txt>
        </Pressable>
      </View>

      <Txt color={p.muted} size={12}>
        {stops.length < 2
          ? "Tap the map to place your start, any stops in between, and your end point. Choose at least two."
          : `${stops.length} stops. The first is the start and the last is the end.`}
      </Txt>

      {stops.map((stop, index) => (
        <View key={`row-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.card }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: index === 0 ? p.green : index === stops.length - 1 && stops.length > 1 ? p.red : p.brand, alignItems: "center", justifyContent: "center" }}>
            <Txt color="#FFFFFF" bold size={11}>{index === 0 ? "A" : index === stops.length - 1 && stops.length > 1 ? "B" : String(index)}</Txt>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt color={p.muted} size={10} bold>{roleLabel(index, stops.length).toUpperCase()}</Txt>
            <TextInput
              accessibilityLabel={`Name for stop ${index + 1}`}
              value={stop.name}
              maxLength={120}
              onChangeText={(name) => onChange(stops.map((s, i) => (i === index ? { ...s, name } : s)))}
              style={{ color: p.ink, fontSize: 15, fontWeight: "600", padding: 0 }}
            />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Move stop up" disabled={index === 0} onPress={() => move(index, -1)} hitSlop={8} style={{ opacity: index === 0 ? 0.3 : 1 }}>
            <Ionicons name="chevron-up" size={20} color={p.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Move stop down" disabled={index === stops.length - 1} onPress={() => move(index, 1)} hitSlop={8} style={{ opacity: index === stops.length - 1 ? 0.3 : 1 }}>
            <Ionicons name="chevron-down" size={20} color={p.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove stop" onPress={() => onChange(stops.filter((_, i) => i !== index))} hitSlop={8}>
            <Ionicons name="close-circle" size={21} color={p.red} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
