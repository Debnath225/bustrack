import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Notifications from "expo-notifications";
import { api, getToken } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { Card, Button } from "../../src/components/UI";
import { FeedbackDialog } from "../../src/components/FeedbackDialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { ARRIVAL_REMINDER_RADIUS_METERS } from "../../src/lib/arrivalReminder";
import { DARK_MAP_STYLE } from "../../src/components/BusMap";
import { themeColors } from "../../src/theme/theme";
type Availability = {
  enabled: boolean;
  live: boolean;
  seatsAvailable: number;
  unitFare: number | null;
};
export default function BusDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detailMapRef = useRef<MapView>(null);
  const [bus, setBus] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [fromStopIndex, setFromStopIndex] = useState<number | null>(null);
  const [toStopIndex, setToStopIndex] = useState<number | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [seats, setSeats] = useState(1);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingNotice, setBookingNotice] = useState<{
    title: string;
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const {
    favorites,
    toggleFavorite,
    prefs,
    arrivalReminder,
    setArrivalReminder,
    dark,
  } = useApp();
  const colors = themeColors(dark);
  const load = useCallback(async () => {
    try {
      const r = await api<any>(`/api/passenger/bus/${encodeURIComponent(id)}`);
      setBus(r.data.bus);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
    if (!prefs.liveTracking) return;
    const t = setInterval(() => void load(), prefs.refreshSeconds * 1000);
    return () => clearInterval(t);
  }, [load, prefs.liveTracking, prefs.refreshSeconds]);
  useEffect(() => {
    const latitude = Number(bus?.location?.lat);
    const longitude = Number(bus?.location?.lon);
    if (
      !bus?.location ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return;
    }
    detailMapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 },
      500,
    );
  }, [bus?.location?.lat, bus?.location?.lon]);
  useEffect(() => {
    if (
      !bus?.bookingsEnabled ||
      fromStopIndex === null ||
      toStopIndex === null
    ) {
      setAvailability(null);
      setAvailabilityError("");
      return;
    }

    let active = true;
    setAvailability(null);
    setAvailabilityLoading(true);
    setAvailabilityError("");
    const path = `/api/passenger/bus/${encodeURIComponent(id)}/availability?fromStopIndex=${fromStopIndex}&toStopIndex=${toStopIndex}`;
    void api<any>(path)
      .then((response) => {
        if (active) setAvailability(response.data);
      })
      .catch((availabilityLoadError) => {
        if (active)
          setAvailabilityError(
            availabilityLoadError instanceof Error
              ? availabilityLoadError.message
              : "Could not check seat availability.",
          );
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bus?.bookingsEnabled, fromStopIndex, toStopIndex, id]);
  if (loading)
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center" }}
        edges={["top", "bottom"]}
      >
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  if (!bus)
    return (
      <SafeAreaView
        style={{ flex: 1, padding: 25, justifyContent: "center" }}
        edges={["top", "bottom"]}
      >
        <Text>{error || "Bus not found"}</Text>
        <Button
          title="Back to explore"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        />
      </SafeAreaView>
    );
  const loc = bus.location;
  let stopsData = bus.stops;
  if (typeof stopsData === "string") {
    try {
      stopsData = JSON.parse(stopsData);
    } catch {
      stopsData = [];
    }
  }
  const stops: Array<any> = Array.isArray(stopsData)
    ? stopsData.flatMap((stop: any, index: number) =>
        stop && typeof stop.name === "string"
          ? [{ ...stop, routeStopIndex: index }]
          : [],
      )
    : [];
  const mapStops = stops.filter(
    (stop) =>
      Number.isFinite(Number(stop.lat)) &&
      Number.isFinite(Number(stop.lon)) &&
      Math.abs(Number(stop.lat)) <= 90 &&
      Math.abs(Number(stop.lon)) <= 180,
  );
  const latitude = Number(loc?.lat);
  const longitude = Number(loc?.lon);
  const hasValidLocation =
    !!loc &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const eta =
    loc?.speed > 3 ? Math.max(1, Math.round((1.5 / loc.speed) * 60)) : null;
  const selectedFare =
    fromStopIndex !== null && toStopIndex !== null
      ? bus.fares?.find(
          (fare: { fromStopIndex: number; toStopIndex: number }) =>
            fare.fromStopIndex === Math.min(fromStopIndex, toStopIndex) &&
            fare.toStopIndex === Math.max(fromStopIndex, toStopIndex),
        )
      : null;
  const selectedDestination =
    toStopIndex === null
      ? null
      : stops.find((stop) => stop.routeStopIndex === toStopIndex) ?? null;
  const hasDestinationCoordinates =
    selectedDestination &&
    Number.isFinite(Number(selectedDestination.lat)) &&
    Number.isFinite(Number(selectedDestination.lon)) &&
    Math.abs(Number(selectedDestination.lat)) <= 90 &&
    Math.abs(Number(selectedDestination.lon)) <= 180;
  const reminderIsSet =
    !!arrivalReminder &&
    arrivalReminder.busId === bus.busId &&
    arrivalReminder.stopIndex === toStopIndex;
  const selectStop = (index: number) => {
    if (pickerTarget === "from") setFromStopIndex(index);
    if (pickerTarget === "to") setToStopIndex(index);
    setPickerTarget(null);
  };
  const toggleArrivalReminder = async () => {
    if (reminderIsSet) {
      setArrivalReminder(null);
      setBookingNotice({
        title: "Reminder cancelled",
        message: "You will no longer receive an alert for this stop.",
        tone: "info",
      });
      return;
    }
    const destinationIndex = toStopIndex;
    if (destinationIndex === null) return;
    if (!prefs.arrivalAlerts) {
      setBookingNotice({
        title: "Arrival alerts are off",
        message: "Turn on Arrival alerts in Settings before adding a reminder.",
        tone: "info",
      });
      return;
    }
    if (!selectedDestination || !hasDestinationCoordinates) {
      setBookingNotice({
        title: "Stop location unavailable",
        message: "This route stop has no valid map coordinates for a reminder.",
        tone: "error",
      });
      return;
    }

    try {
      const currentPermission = await Notifications.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        setBookingNotice({
          title: "Notifications are off",
          message: "Allow notifications in Android settings to receive arrival reminders.",
          tone: "info",
        });
        return;
      }

      setArrivalReminder({
        busId: bus.busId,
        busLabel: bus.label,
        stopIndex: destinationIndex,
        stopName: selectedDestination.name,
        latitude: Number(selectedDestination.lat),
        longitude: Number(selectedDestination.lon),
        createdAt: Date.now(),
      });
      setBookingNotice({
        title: "Arrival reminder set",
        message: `We'll alert you when ${bus.label} is within ${ARRIVAL_REMINDER_RADIUS_METERS} m of ${selectedDestination.name}. Keep BusTrack open for live checking.`,
        tone: "success",
      });
    } catch (reminderError) {
      setBookingNotice({
        title: "Could not set reminder",
        message:
          reminderError instanceof Error
            ? reminderError.message
            : "Try again in a moment.",
        tone: "error",
      });
    }
  };
  const bookSeats = async () => {
    if (fromStopIndex === null || toStopIndex === null) return;
    try {
      const token = await getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      setBookingBusy(true);
      await api("/api/passenger/bookings", {
        method: "POST",
        body: JSON.stringify({
          busId: bus.busId,
          fromStopIndex,
          toStopIndex,
          seats,
        }),
      });
      router.push("/(tabs)/tickets");
    } catch (bookingError) {
      setBookingNotice({
        title: "Could not reserve seats",
        message:
          bookingError instanceof Error
            ? bookingError.message
            : "Please try again.",
        tone: "error",
      });
    } finally {
      setBookingBusy(false);
    }
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top", "bottom"]}
    >
      <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingTop: 18, paddingBottom: 35 }}
    >
      <Pressable
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <Ionicons name="arrow-back" size={22} color={colors.muted} />
        <Text style={{ fontWeight: "800", color: colors.muted }}>
          Back to explore
        </Text>
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 12, fontWeight: "900", color: colors.primary }}>
            {bus.busId}
          </Text>
          <Text
            style={{
              fontSize: 27,
              fontWeight: "900",
              color: colors.ink,
              marginTop: 5,
            }}
          >
            {bus.label}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 5 }}>
            {bus.routeName || "Unassigned route"}
          </Text>
        </View>
        <Pressable
          onPress={() => toggleFavorite(bus.busId)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={favorites.includes(bus.busId) ? "heart" : "heart-outline"}
            color={colors.danger}
            size={24}
          />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginVertical: 20 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>LIVE STATUS</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: bus.isLive ? colors.success : colors.warning,
              marginTop: 6,
            }}
          >
            {bus.isLive ? "Live" : "Stale"}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>SPEED</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: colors.ink,
              marginTop: 6,
            }}
          >
            {Math.round(Number(loc?.speed) || 0)} km/h
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>CAPACITY</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: colors.ink,
              marginTop: 6,
            }}
          >
            {bus.capacity || "—"}
          </Text>
        </Card>
      </View>
      {hasValidLocation ? (
        <Card style={{ padding: 5, overflow: "hidden", marginBottom: 20 }}>
          <MapView
            ref={detailMapRef}
            style={{ height: 280, borderRadius: 14 }}
            customMapStyle={dark ? DARK_MAP_STYLE : []}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            }}
          >
            <Marker
              coordinate={{
                latitude,
                longitude,
              }}
              title={bus.label}
              description="Latest simulated GPS location"
              pinColor="#12B76A"
            />
            {mapStops.length > 1 && (
              <Polyline
                coordinates={mapStops.map((p: any) => ({
                  latitude: Number(p.lat),
                  longitude: Number(p.lon),
                }))}
                strokeColor="#2563EB"
                strokeWidth={4}
              />
            )}
            {hasDestinationCoordinates ? (
              <Marker
                coordinate={{
                  latitude: Number(selectedDestination.lat),
                  longitude: Number(selectedDestination.lon),
                }}
                title="Your destination"
                description={selectedDestination.name}
                pinColor="#2563EB"
              />
            ) : null}
          </MapView>
        </Card>
      ) : (
        <Card style={{ marginBottom: 20 }}>
          <Text style={{ color: colors.warning, fontWeight: "800" }}>
            No GPS signal yet
          </Text>
          <Text style={{ color: colors.muted, marginTop: 5 }}>
            The simulator may need a few seconds to publish the first location.
          </Text>
        </Card>
      )}
      <Button
        title="Track this bus on the map"
        secondary
        onPress={() =>
          router.push(`/map?busId=${encodeURIComponent(bus.busId)}`)
        }
      />
      <Card style={{ marginBottom: 20 }}>
        <Text style={{ fontWeight: "900", fontSize: 17, color: colors.ink }}>
          Journey details
        </Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>
          Route: {bus.routeCode || "—"}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 5 }}>
          Last GPS update:{" "}
          {loc?.recordedAt
            ? new Date(loc.recordedAt).toLocaleTimeString()
            : "Not available"}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 5 }}>
          {prefs.liveTracking
            ? `Auto-refreshing every ${prefs.refreshSeconds} seconds.`
            : "Auto-refresh is paused. Use Refresh location to update."}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 5 }}>
          GPS accuracy: {loc?.accuracy ? `${loc.accuracy} m` : "—"}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 5 }}>
          Estimated arrival:{" "}
          {eta
            ? `About ${eta} min (rough demo estimate)`
            : "Waiting for movement"}
        </Text>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <Text style={{ fontWeight: "900", fontSize: 17, color: colors.ink }}>
          Check your fare
        </Text>
        <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 19 }}>
          The driver sets this bus’s price for each stop pair. The same fare
          applies in either direction.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose starting stop"
            disabled={stops.length < 2}
            onPress={() => setPickerTarget("from")}
            style={{
              flex: 1,
              minHeight: 56,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              justifyContent: "center",
              backgroundColor: colors.surface,
              opacity: stops.length < 2 ? 0.55 : 1,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>FROM</Text>
            <Text
              numberOfLines={1}
              style={{ color: colors.ink, fontWeight: "800", marginTop: 3 }}
            >
              {fromStopIndex === null
                ? "Choose stop"
                : stops[fromStopIndex]?.name}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose destination stop"
            disabled={stops.length < 2}
            onPress={() => setPickerTarget("to")}
            style={{
              flex: 1,
              minHeight: 56,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              justifyContent: "center",
              backgroundColor: colors.surface,
              opacity: stops.length < 2 ? 0.55 : 1,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>TO</Text>
            <Text
              numberOfLines={1}
              style={{ color: colors.ink, fontWeight: "800", marginTop: 3 }}
            >
              {toStopIndex === null ? "Choose stop" : stops[toStopIndex]?.name}
            </Text>
          </Pressable>
        </View>
        {selectedFare ? (
          <View
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              backgroundColor: colors.successSoft,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ color: colors.success, fontWeight: "800" }}>
                Driver-set fare
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>
                For this bus and stop pair
              </Text>
            </View>
            <Text style={{ color: colors.success, fontSize: 23, fontWeight: "900" }}>
              ₹{Number(selectedFare.amount).toFixed(2)}
            </Text>
          </View>
        ) : fromStopIndex !== null && toStopIndex !== null ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.warning, fontWeight: "700", marginTop: 12 }}
          >
            Fare not set by the driver yet.
          </Text>
        ) : stops.length < 2 ? (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>
            Route stops are not available for this bus yet.
          </Text>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>
            Choose two stops to see the price.
          </Text>
        )}
        {bus.bookingsEnabled ? (
          <View
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: colors.line,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Ionicons name="ticket-outline" size={19} color={colors.primary} />
              <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 16 }}>
                Reserve seats
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              Same-day reservation · cash paid to the driver when boarding.
            </Text>
            {fromStopIndex === null || toStopIndex === null ? (
              <Text style={{ color: colors.muted, marginTop: 12 }}>
                Choose your starting stop and destination above.
              </Text>
            ) : availabilityLoading ? (
              <ActivityIndicator style={{ padding: 18 }} color={colors.primary} />
            ) : availabilityError ? (
              <Text style={{ color: colors.danger, marginTop: 12 }}>
                {availabilityError}
              </Text>
            ) : !availability?.live ? (
              <Text style={{ color: colors.warning, fontWeight: "700", marginTop: 12 }}>
                Bookings are paused until this bus is live.
              </Text>
            ) : availability.seatsAvailable < 1 ? (
              <Text style={{ color: colors.warning, fontWeight: "700", marginTop: 12 }}>
                No reserved seats remain for this part of the route.
              </Text>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 14,
                  }}
                >
                  <Text style={{ color: colors.muted, fontWeight: "700" }}>
                    Seats ({availability.seatsAvailable} available)
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove one seat"
                      disabled={seats <= 1}
                      onPress={() => setSeats((count) => Math.max(1, count - 1))}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.primarySoft,
                        opacity: seats <= 1 ? 0.45 : 1,
                      }}
                    >
                      <Ionicons name="remove" size={20} color={colors.primary} />
                    </Pressable>
                    <Text style={{ color: colors.ink, fontWeight: "900", minWidth: 18, textAlign: "center" }}>
                      {seats}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add one seat"
                      disabled={seats >= Math.min(6, availability.seatsAvailable)}
                      onPress={() => setSeats((count) => count + 1)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.primarySoft,
                        opacity:
                          seats >= Math.min(6, availability.seatsAvailable)
                            ? 0.45
                            : 1,
                      }}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
                <View
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.softCanvas,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.muted }}>Total · pay on boarding</Text>
                  <Text style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
                    ₹{(Number(selectedFare?.amount ?? 0) * seats).toFixed(2)}
                  </Text>
                </View>
                <Button
                  title="Reserve seats"
                  onPress={() => void bookSeats()}
                  loading={bookingBusy}
                  disabled={
                    !selectedFare ||
                    seats > availability.seatsAvailable ||
                    availability.unitFare === null
                  }
                />
              </>
            )}
          </View>
        ) : (
          <View
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: colors.line,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 9,
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={colors.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontWeight: "800" }}>
                Tickets aren't available on this bus
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                The driver has not opened reservations.
              </Text>
            </View>
          </View>
        )}
      </Card>
      <Card style={{ marginBottom: 20, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 17 }}>
            Arrival reminder
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          Get one alert when this bus comes within{" "}
          {ARRIVAL_REMINDER_RADIUS_METERS} m of your destination.
        </Text>
        <Text style={{ color: colors.muted, fontWeight: "700" }}>
          {selectedDestination
            ? `Destination: ${selectedDestination.name}`
            : "Choose a destination in Check your fare above."}
        </Text>
        {arrivalReminder && !reminderIsSet ? (
          <Text style={{ color: colors.warning, fontSize: 12 }}>
            Your current reminder is for {arrivalReminder.busLabel} near{" "}
            {arrivalReminder.stopName}; setting this one will replace it.
          </Text>
        ) : null}
        {!hasDestinationCoordinates && selectedDestination ? (
          <Text style={{ color: colors.warning, fontSize: 12 }}>
            This stop has no valid map coordinates, so a reminder can't be set.
          </Text>
        ) : null}
        {prefs.arrivalAlerts ? (
          <Button
            title={
              reminderIsSet
                ? "Cancel reminder"
                : arrivalReminder
                  ? "Replace current reminder"
                  : "Remind me at this stop"
            }
            secondary={reminderIsSet || !hasDestinationCoordinates}
            disabled={!reminderIsSet && !hasDestinationCoordinates}
            onPress={() => void toggleArrivalReminder()}
          />
        ) : (
          <Button
            title="Turn on arrival alerts"
            secondary
            onPress={() => router.push("/(tabs)/settings")}
          />
        )}
        {reminderIsSet ? (
          <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700" }}>
            Reminder is active on this device.
          </Text>
        ) : null}
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
          Keep BusTrack open for location checks. Background reminders aren't
          supported in this build.
        </Text>
      </Card>
      <Text
        style={{
          fontSize: 17,
          fontWeight: "900",
          color: colors.ink,
          marginBottom: 12,
        }}
      >
        Route stops
      </Text>
      {stops.length === 0 ? (
        <Text style={{ color: colors.muted, marginBottom: 16 }}>
          No route stops have been added.
        </Text>
      ) : stops.map((p: any) => (
        <View
          key={`${p.name}-${p.routeStopIndex}`}
          style={{
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
            paddingVertical: 9,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "900" }}>
              {p.routeStopIndex + 1}
            </Text>
          </View>
          <Text style={{ fontWeight: "700", color: colors.muted }}>{p.name}</Text>
        </View>
      ))}
      <Button title="Refresh location" secondary onPress={() => void load()} />
      </ScrollView>
      <Modal
        visible={pickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerTarget(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 22,
            backgroundColor: "rgba(16, 24, 40, 0.48)",
          }}
        >
          <View
            style={{
              maxHeight: "75%",
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: colors.ink,
                fontSize: 18,
                fontWeight: "900",
                marginBottom: 12,
              }}
            >
              {pickerTarget === "from"
                ? "Choose starting stop"
                : "Choose destination"}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {stops.map((stop: any, index: number) => {
                const disabledIndex =
                  pickerTarget === "from" ? toStopIndex : fromStopIndex;
                const disabled = stop.routeStopIndex === disabledIndex;
                return (
                  <Pressable
                    key={`${stop.name}-${stop.routeStopIndex}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => selectStop(stop.routeStopIndex)}
                    style={{
                      minHeight: 50,
                      justifyContent: "center",
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                      opacity: disabled ? 0.45 : 1,
                    }}
                  >
                    <Text style={{ color: colors.muted, fontWeight: "700" }}>
                      {stop.routeStopIndex + 1}. {stop.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerTarget(null)}
              style={{ paddingVertical: 13, alignItems: "center" }}
            >
              <Text style={{ color: colors.primary, fontWeight: "800" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <FeedbackDialog
        visible={bookingNotice !== null}
        title={bookingNotice?.title ?? ""}
        message={bookingNotice?.message ?? ""}
        tone={bookingNotice?.tone}
        onDismiss={() => setBookingNotice(null)}
      />
    </SafeAreaView>
  );
}
