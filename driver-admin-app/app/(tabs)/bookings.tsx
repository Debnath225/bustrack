import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Pill, ToggleSwitch, Txt } from "../../src/components/UI";
import { FeedbackDialog } from "../../src/components/FeedbackDialog";
import { useApp } from "../../src/context/AppContext";
import { request } from "../../src/lib/api";
import { palette as p } from "../../src/theme/theme";

type BusSettings = {
  busId: string;
  label: string;
  capacity: number;
  routeName: string | null;
  live: boolean;
  enabled: boolean;
  hasRoute: boolean;
};
type Booking = {
  id: string;
  bookingReference: string;
  passengerName: string;
  fromStop: string;
  toStop: string;
  seats: number;
  totalFare: number;
  status: "confirmed" | "boarded" | "cancelled";
  paymentStatus: "due_on_board" | "collected_on_board";
};
type Notice = {
  title: string;
  message: string;
  tone: "success" | "error" | "info";
};

export default function DriverBookings() {
  const { token } = useApp();
  const [bus, setBus] = useState<BusSettings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceDate, setServiceDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boardingId, setBoardingId] = useState("");
  const [pendingBoarding, setPendingBoarding] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [settings, manifest] = await Promise.all([
        request<{ bus: BusSettings }>("/api/driver/bookings/settings", {}, token),
        request<{
          busId: string;
          travelDate: string;
          bookings: Booking[];
        }>("/api/driver/bookings", {}, token),
      ]);
      setBus(settings.bus);
      setServiceDate(manifest.travelDate);
      setBookings(manifest.bookings);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load today's booking manifest.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), 10_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const setBookingAvailability = async (enabled: boolean) => {
    if (!token) return;
    setSaving(true);
    try {
      await request(
        "/api/driver/bookings/settings",
        { method: "PUT", body: JSON.stringify({ enabled }) },
        token,
      );
      setBus((current) => (current ? { ...current, enabled } : current));
      setNotice({
        title: enabled ? "Bookings opened" : "Bookings paused",
        message: enabled
          ? "Passengers can reserve seats while your bus is live."
          : "New passenger reservations are now disabled.",
        tone: "success",
      });
    } catch (saveError) {
      setNotice({
        title: "Could not update bookings",
        message:
          saveError instanceof Error ? saveError.message : "Try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const markBoarded = async () => {
    if (!token || !pendingBoarding) return;
    const booking = pendingBoarding;
    setBoardingId(booking.id);
    try {
      await request(
        `/api/driver/bookings/${encodeURIComponent(booking.id)}/board`,
        { method: "POST" },
        token,
      );
      setPendingBoarding(null);
      setNotice({
        title: "Passenger boarded",
        message: `₹${Number(booking.totalFare).toFixed(2)} marked as collected in cash.`,
        tone: "success",
      });
      await load();
    } catch (boardingError) {
      setNotice({
        title: "Could not update ticket",
        message:
          boardingError instanceof Error
            ? boardingError.message
            : "Try again.",
        tone: "error",
      });
    } finally {
      setBoardingId("");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 34 }}
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
        <View style={{ paddingTop: 10, gap: 5 }}>
          <Txt color={p.muted}>DRIVER WORKSPACE</Txt>
          <Txt size={27} bold>
            Ticket bookings
          </Txt>
          <Txt color={p.muted}>
            Open or pause reservations and manage today's boarding list.
          </Txt>
        </View>

        {loading ? (
          <ActivityIndicator style={{ padding: 28 }} color={p.brand} />
        ) : error ? (
          <Card style={{ gap: 12 }}>
            <Txt bold size={17}>
              Booking manifest unavailable
            </Txt>
            <Txt color={p.muted}>{error}</Txt>
            <Button
              title="Try again"
              kind="soft"
              onPress={() => {
                setRefreshing(true);
                void load();
              }}
            />
          </Card>
        ) : bus ? (
          <>
            <Card style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt bold size={17}>
                    {bus.label || bus.busId}
                  </Txt>
                  <Txt color={p.muted} size={12}>
                    {bus.busId} · {bus.routeName || "No route assigned"}
                  </Txt>
                </View>
                <Pill
                  label={bus.live ? "LIVE" : "OFFLINE"}
                  color={bus.live ? p.green : p.amber}
                />
              </View>
              <View
                style={{
                  minHeight: 55,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: p.line,
                  paddingTop: 10,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Txt bold>Accept bookings</Txt>
                  <Txt size={11} color={p.muted}>
                    Passengers pay cash when boarding
                  </Txt>
                </View>
                {saving ? (
                  <ActivityIndicator color={p.brand} />
                ) : (
                  <ToggleSwitch
                    label="Accept passenger bookings"
                    value={bus.enabled}
                    disabled={!bus.hasRoute || saving}
                    onValueChange={(enabled) => void setBookingAvailability(enabled)}
                  />
                )}
              </View>
              {!bus.hasRoute ? (
                <Txt color={p.amber} size={12}>
                  Ask your administrator to assign a route before enabling bookings.
                </Txt>
              ) : !bus.live && bus.enabled ? (
                <Txt color={p.amber} size={12}>
                  Booking is enabled, but passengers can only reserve while the
                  bus is live and on duty.
                </Txt>
              ) : null}
            </Card>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Txt bold size={18}>
                  Today's manifest
                </Txt>
                <Txt color={p.muted} size={12}>
                  {serviceDate} · refreshes every 10 seconds
                </Txt>
              </View>
              <Pill
                label={`${bookings.filter((item) => item.status === "confirmed").length} waiting`}
                color={p.brand}
              />
            </View>

            {bookings.length === 0 ? (
              <Card style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
                <Ionicons name="ticket-outline" size={34} color={p.brand} />
                <Txt bold size={16}>
                  No tickets booked today
                </Txt>
                <Txt color={p.muted} style={{ textAlign: "center" }}>
                  Passenger reservations will appear here as they are made.
                </Txt>
              </Card>
            ) : (
              bookings.map((booking) => {
                const boarded = booking.status === "boarded";
                const cancelled = booking.status === "cancelled";
                return (
                  <Card key={booking.id} style={{ gap: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Txt bold size={16}>
                          {booking.passengerName}
                        </Txt>
                        <Txt color={p.muted} size={12}>
                          Ref. {booking.bookingReference}
                        </Txt>
                      </View>
                      <Pill
                        label={cancelled ? "CANCELLED" : boarded ? "BOARDED" : "CONFIRMED"}
                        color={cancelled ? p.muted : boarded ? p.green : p.brand}
                      />
                    </View>
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: p.bg,
                        gap: 4,
                      }}
                    >
                      <Txt bold>
                        {booking.fromStop} → {booking.toStop}
                      </Txt>
                      <Txt color={p.muted} size={12}>
                        {booking.seats} {booking.seats === 1 ? "seat" : "seats"} ·
                        {" "}₹{Number(booking.totalFare).toFixed(2)}
                      </Txt>
                    </View>
                    {booking.status === "confirmed" ? (
                      <Button
                        title="Collect cash & mark boarded"
                        onPress={() => setPendingBoarding(booking)}
                        loading={boardingId === booking.id}
                      />
                    ) : boarded ? (
                      <Txt color={p.green} size={12}>
                        Cash collected on boarding.
                      </Txt>
                    ) : null}
                  </Card>
                );
              })
            )}
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={pendingBoarding !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingBoarding(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 22,
            backgroundColor: "rgba(16, 24, 40, 0.5)",
          }}
        >
          <Card style={{ gap: 14 }}>
            <Txt bold size={19}>
              Confirm boarding and cash?
            </Txt>
            <Txt color={p.muted}>
              Mark {pendingBoarding?.passengerName} as boarded and record ₹
              {Number(pendingBoarding?.totalFare ?? 0).toFixed(2)} collected.
            </Txt>
            <Button
              title="Go back"
              kind="soft"
              onPress={() => setPendingBoarding(null)}
            />
            <Button
              title="Confirm collected"
              onPress={() => void markBoarded()}
              loading={Boolean(boardingId)}
            />
          </Card>
        </View>
      </Modal>

      <FeedbackDialog
        visible={notice !== null}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        tone={notice?.tone}
        onDismiss={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}
