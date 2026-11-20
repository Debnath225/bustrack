import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, getToken } from "../../src/lib/api";
import { Button, Card } from "../../src/components/UI";
import { FeedbackDialog } from "../../src/components/FeedbackDialog";
import { useApp } from "../../src/context/AppContext";
import { themeColors } from "../../src/theme/theme";

type Booking = {
  id: string;
  bookingReference: string;
  travelDate: string;
  busId: string;
  busLabel: string;
  routeName: string | null;
  fromStop: string;
  toStop: string;
  seats: number;
  unitFare: number;
  totalFare: number;
  status: "confirmed" | "boarded" | "cancelled";
  paymentStatus: "due_on_board" | "collected_on_board";
};
type Notice = {
  title: string;
  message: string;
  tone: "success" | "error" | "info";
};

export default function Tickets() {
  const { dark } = useApp();
  const colors = themeColors(dark);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceDate, setServiceDate] = useState("");
  const [hasAccount, setHasAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pendingCancel, setPendingCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setHasAccount(Boolean(token));
      if (!token) {
        setBookings([]);
        setError("");
        return;
      }
      const response = await api<{
        success: boolean;
        data: { bookings: Booking[]; serviceDate: string };
      }>("/api/passenger/bookings");
      setBookings(response.data.bookings);
      setServiceDate(response.data.serviceDate);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your tickets.",
      );
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

  const cancelBooking = async () => {
    if (!pendingCancel) return;
    setCancelling(true);
    try {
      await api(`/api/passenger/bookings/${encodeURIComponent(pendingCancel.id)}/cancel`, {
        method: "POST",
      });
      setPendingCancel(null);
      setNotice({
        title: "Ticket cancelled",
        message: "The reserved seats are available again. No payment was taken.",
        tone: "success",
      });
      await load();
    } catch (cancelError) {
      setNotice({
        title: "Could not cancel ticket",
        message:
          cancelError instanceof Error ? cancelError.message : "Try again.",
        tone: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 32, gap: 14 }}
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
        <View style={{ gap: 5 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
            YOUR BUS TRACK INDIA
          </Text>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: "900" }}>
            Tickets
          </Text>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            Keep your booking reference ready when you board. Pay the driver in cash.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ padding: 30 }} color={colors.primary} />
        ) : !hasAccount ? (
          <Card style={{ alignItems: "center", gap: 10, paddingVertical: 26 }}>
            <Ionicons name="ticket-outline" size={38} color={colors.primary} />
            <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
              Sign in to manage tickets
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 20 }}>
              You can browse buses without an account. Sign in when you are ready
              to reserve a seat.
            </Text>
            <Button title="Sign in" onPress={() => router.push("/login")} />
          </Card>
        ) : error ? (
          <Card style={{ gap: 12 }}>
            <Text style={{ color: colors.danger, fontWeight: "800" }}>
              Tickets are unavailable
            </Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>{error}</Text>
            <Button
              title="Try again"
              secondary
              onPress={() => {
                setRefreshing(true);
                void load();
              }}
            />
          </Card>
        ) : bookings.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 10, paddingVertical: 26 }}>
            <Ionicons name="bus-outline" size={38} color={colors.primary} />
            <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
              No tickets yet
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 20 }}>
              Find a live bus with bookings enabled, choose your stops, and
              reserve seats for today.
            </Text>
            <Button title="Explore buses" onPress={() => router.push("/buses")} />
          </Card>
        ) : (
          bookings.map((booking) => {
            const canCancel =
              booking.status === "confirmed" &&
              booking.travelDate === serviceDate;
            const isBoarded = booking.status === "boarded";
            const isCancelled = booking.status === "cancelled";
            const isExpired =
              booking.status === "confirmed" && booking.travelDate !== serviceDate;
            return (
              <Card key={booking.id} style={{ gap: 13, padding: 17 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{                     color: colors.primary, fontSize: 11, fontWeight: "900" }}>
                      {booking.busId} · {booking.travelDate}
                    </Text>
                    <Text
                      style={{
                        color: colors.ink,
                        fontSize: 17,
                        fontWeight: "900",
                        marginTop: 4,
                      }}
                    >
                      {booking.busLabel}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: isCancelled
                        ? colors.softCanvas
                        : isBoarded
                          ? colors.successSoft
                          : isExpired
                            ? colors.warningSoft
                            : colors.infoSoft,
                    }}
                  >
                    <Text
                      style={{
                        color: isCancelled
                          ? colors.muted
                          : isBoarded
                            ? colors.success
                            : isExpired
                              ? colors.warning
                              : colors.primary,
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      {isCancelled
                        ? "CANCELLED"
                        : isBoarded
                          ? "BOARDED"
                          : isExpired
                            ? "EXPIRED"
                            : "CONFIRMED"}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: colors.softCanvas,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>
                    {booking.fromStop} → {booking.toStop}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {booking.routeName || "Bus route"} · {booking.seats}{" "}
                    {booking.seats === 1 ? "seat" : "seats"}
                  </Text>
                </View>

                <View
                  style={{
                    borderStyle: "dashed",
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>
                      BOOKING REFERENCE
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: colors.ink,
                        fontSize: 18,
                        fontWeight: "900",
                        letterSpacing: 1.5,
                        marginTop: 3,
                      }}
                    >
                      {booking.bookingReference}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>Pay on boarding</Text>
                    <Text style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
                      ₹{Number(booking.totalFare).toFixed(2)}
                    </Text>
                  </View>
                </View>
                {canCancel ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPendingCancel(booking)}
                    style={{ alignItems: "center", paddingVertical: 5 }}
                  >
                    <Text style={{ color: colors.danger, fontWeight: "800" }}>
                      Cancel reservation
                    </Text>
                  </Pressable>
                ) : null}
                {isBoarded ? (
                  <Text style={{ color: colors.success, fontSize: 12 }}>
                    Cash collected by the driver.
                  </Text>
                ) : null}
                {isCancelled ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    This ticket was cancelled; no payment was collected.
                  </Text>
                ) : null}
                {isExpired ? (
                  <Text style={{ color: colors.warning, fontSize: 12 }}>
                    This same-day reservation has expired. Contact the bus operator
                    if you need help.
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}

        {refreshing ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRefreshing(true);
              void load();
            }}
            style={{ alignItems: "center", padding: 9 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>Refresh tickets</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={pendingCancel !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingCancel(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(16, 24, 40, 0.5)",
          }}
        >
          <Card style={{ gap: 14 }}>
            <Text style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
              Cancel this ticket?
            </Text>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>
              {pendingCancel?.seats} reserved{" "}
              {pendingCancel?.seats === 1 ? "seat will" : "seats will"} be released.
              No payment has been taken.
            </Text>
            <Button
              title="Keep ticket"
              secondary
              onPress={() => setPendingCancel(null)}
            />
            <Button
              title="Cancel ticket"
              onPress={() => void cancelBooking()}
              loading={cancelling}
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
