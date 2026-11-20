import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/context/AppContext";
import { request } from "../../src/lib/api";
import { palette as p } from "../../src/theme/theme";
import { Card, Pill, Txt } from "../../src/components/UI";
import { FadeIn, PressScale, ProgressBar, Skeleton } from "../../src/components/motion";

type Overview = { buses: number; users: number; routes: number; activeBuses: number };
type Assignment = { label: string; status: string; capacity: number; routeName: string | null; routeCode: string | null } | null;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, icon, tone, delay }: { label: string; value: number | string; icon: keyof typeof Ionicons.glyphMap; tone: string; delay: number }) {
  return (
    <FadeIn delay={delay} style={{ flex: 1 }}>
      <Card style={{ gap: 10, padding: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Txt color={p.muted} size={12} bold>{label.toUpperCase()}</Txt>
          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: `${tone}1F`, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={icon} size={16} color={tone} />
          </View>
        </View>
        <Txt size={30} bold>{value}</Txt>
      </Card>
    </FadeIn>
  );
}

function Action({ label, body, icon, to, delay }: { label: string; body: string; icon: keyof typeof Ionicons.glyphMap; to: string; delay: number }) {
  return (
    <FadeIn delay={delay}>
      <PressScale accessibilityLabel={label} onPress={() => router.push(to as never)} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 18, backgroundColor: p.card, borderWidth: 1, borderColor: p.line }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: p.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={21} color={p.brand} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold>{label}</Txt>
          <Txt color={p.muted} size={12}>{body}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={18} color={p.muted} />
      </PressScale>
    </FadeIn>
  );
}

export default function Home() {
  const { user, token, refresh } = useApp();
  const admin = user?.role === "admin";
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pending, setPending] = useState(0);
  const [assignment, setAssignment] = useState<Assignment>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      if (admin) {
        const [data, requests, drivers] = await Promise.all([
          request<Overview>("/api/admin/overview", {}, token),
          request<{ requests: Array<{ status: string }> }>("/api/admin/driver-access-requests", {}, token),
          request<{ drivers: Array<{ driverStatus: string }> }>("/api/admin/drivers/review", {}, token),
        ]);
        setOverview(data);
        setPending(
          requests.requests.filter((r) => r.status === "pending").length +
            drivers.drivers.filter((d) => d.driverStatus === "pending").length,
        );
      } else {
        const me = await request<{ assignment: Assignment }>("/api/auth/me", {}, token);
        setAssignment(me.assignment ?? null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [admin, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load, refresh]),
  );

  const liveShare = overview && overview.buses > 0 ? overview.activeBuses / overview.buses : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={p.brand}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <FadeIn style={{ paddingTop: 12, gap: 4 }}>
        <Txt color={p.muted} size={12} bold>{admin ? "ADMINISTRATOR" : "DRIVER"}</Txt>
        <Txt size={27} bold>{greeting()}, {user?.name?.split(" ")[0] ?? "there"}</Txt>
        <Txt color={p.muted}>{admin ? "Your fleet, routes and approvals at a glance." : "Your duty status and assigned bus."}</Txt>
      </FadeIn>

      {error ? (
        <FadeIn>
          <Card style={{ borderColor: p.red, gap: 8 }}>
            <Txt color={p.red} bold>{error}</Txt>
            <Pressable accessibilityRole="button" onPress={() => void load()}>
              <Txt color={p.brand} bold>Try again</Txt>
            </Pressable>
          </Card>
        </FadeIn>
      ) : null}

      {admin ? (
        <>
          {loading && !overview ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={110} radius={18} />
              <Skeleton height={110} radius={18} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Stat label="Buses" value={overview?.buses ?? "—"} icon="bus-outline" tone={p.brand} delay={0} />
                <Stat label="Live now" value={overview?.activeBuses ?? "—"} icon="radio-outline" tone={p.green} delay={60} />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Stat label="Routes" value={overview?.routes ?? "—"} icon="git-network-outline" tone={p.amber} delay={120} />
                <Stat label="Users" value={overview?.users ?? "—"} icon="people-outline" tone={p.brand} delay={180} />
              </View>
              <FadeIn delay={220}>
                <Card style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Txt bold size={16}>Fleet on the road</Txt>
                    <Txt color={p.muted} bold>{Math.round(liveShare * 100)}%</Txt>
                  </View>
                  <ProgressBar value={liveShare} color={p.green} />
                  <Txt color={p.muted} size={12}>Buses that reported a position in the last 90 seconds.</Txt>
                </Card>
              </FadeIn>
              {pending > 0 ? (
                <FadeIn delay={260}>
                  <PressScale accessibilityLabel={`${pending} items need review`} onPress={() => router.push("/(tabs)/drivers" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, backgroundColor: p.card, borderWidth: 1, borderColor: p.amber }}>
                    <Ionicons name="alert-circle-outline" size={22} color={p.amber} />
                    <View style={{ flex: 1 }}>
                      <Txt bold>{pending} waiting for review</Txt>
                      <Txt color={p.muted} size={12}>Driver access requests and new accounts</Txt>
                    </View>
                    <Pill label="Review" color={p.amber} />
                  </PressScale>
                </FadeIn>
              ) : null}
            </>
          )}

          <Txt bold size={17} style={{ marginTop: 6 }}>Quick control</Txt>
          <Action label="Build a route on the map" body="Tap to place stops and save a new route" icon="map-outline" to="/route-builder" delay={300} />
          <Action label="Operations" body="Bus status, assignments and capacity" icon="bus-outline" to="/(tabs)/operations" delay={340} />
          <Action label="Drivers and approvals" body="Review access requests and manage drivers" icon="people-outline" to="/(tabs)/drivers" delay={380} />
          <Action label="Insights" body="Bookings, fares and live activity" icon="bar-chart-outline" to="/(tabs)/analytics" delay={420} />
        </>
      ) : (
        <>
          {loading && !assignment ? (
            <Skeleton height={150} radius={18} />
          ) : (
            <FadeIn delay={60}>
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt bold size={16}>Your duty</Txt>
                  <Pill label={assignment ? (assignment.status === "active" ? "On duty" : "Off duty") : "Unassigned"} color={assignment?.status === "active" ? p.green : p.amber} />
                </View>
                {assignment ? (
                  <>
                    <Txt size={24} bold>{assignment.label}</Txt>
                    <Txt color={p.muted}>{assignment.routeName ?? "No route assigned yet"}{assignment.routeCode ? ` · ${assignment.routeCode}` : ""}</Txt>
                    <Txt color={p.muted} size={12}>Capacity {assignment.capacity} seats</Txt>
                  </>
                ) : (
                  <Txt color={p.muted}>An administrator will assign your bus. Contact them if this takes too long.</Txt>
                )}
              </Card>
            </FadeIn>
          )}
          <Action label="Fares" body="Set prices between your route stops" icon="cash-outline" to="/(tabs)/fares" delay={160} />
          <Action label="Tickets" body="Today's bookings and boarding" icon="ticket-outline" to="/(tabs)/bookings" delay={200} />
          <Action label="Duty and location" body="Share the bus position while on duty" icon="navigate-outline" to="/(tabs)/operations" delay={240} />
        </>
      )}
    </ScrollView>
  );
}
