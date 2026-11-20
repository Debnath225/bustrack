import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Pill, Txt } from "../../src/components/UI";
import { useApp } from "../../src/context/AppContext";
import { request } from "../../src/lib/api";
import { palette as p } from "../../src/theme/theme";

type AnalyticsData = {
  days: number;
  startDate: string;
  endDate: string;
  bookingsByDay: Array<{ day: string; bookings: number; boarded: number; confirmed: number }>;
  fleetByStatus: Array<{ status: string; count: number }>;
  totals: { bookings: number; boarded: number; collectedFare: number };
};
type ActivityEvent = { bus_id: string; latitude: number; longitude: number; source: string; recorded_at: string };

export default function Analytics() {
  const { token } = useApp();
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [result, activity] = await Promise.all([
        request<AnalyticsData>(`/api/admin/analytics?days=${days}`, {}, token),
        request<{ events: ActivityEvent[] }>("/api/admin/activity", {}, token),
      ]);
      setData(result);
      setEvents(activity.events ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, token]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const maxBookings = Math.max(1, ...(data?.bookingsByDay.map((item) => item.bookings) ?? [0]));
  const chartWidth = days === 7 ? "100%" : 900;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.bg }} contentContainerStyle={{ padding: 18, gap: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
      <View style={{ paddingTop: 10, gap: 5 }}>
        <Txt color={p.muted}>ADMINISTRATION / INSIGHTS</Txt>
        <Txt size={27} bold>Performance</Txt>
        <Txt color={p.muted}>Bookings, boarding and fleet status from your database.</Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {([7, 30] as const).map((range) => <View key={range} style={{ flex: 1 }}><Button title={`Last ${range} days`} kind={days === range ? "primary" : "soft"} onPress={() => { setLoading(true); setDays(range); }} /></View>)}
      </View>
      {loading && !data ? <ActivityIndicator color={p.brand} style={{ padding: 28 }} /> : error ? <Card style={{ gap: 10 }}><Txt bold color={p.red}>Analytics unavailable</Txt><Txt color={p.muted}>{error}</Txt><Button title="Try again" kind="soft" onPress={() => { setLoading(true); void load(); }} /></Card> : data ? <>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1, gap: 6 }}><Txt color={p.muted}>Bookings</Txt><Txt size={27} bold>{data.totals.bookings}</Txt><Txt size={11} color={p.muted}>{data.days} day total</Txt></Card>
          <Card style={{ flex: 1, gap: 6 }}><Txt color={p.muted}>Boarded</Txt><Txt size={27} bold color={p.green}>{data.totals.boarded}</Txt><Txt size={11} color={p.muted}>Cash collected</Txt></Card>
        </View>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Txt bold size={17}>Daily bookings</Txt><Pill label={`${data.startDate} – ${data.endDate}`} color={p.brand} /></View>
          <ScrollView horizontal={days === 30} showsHorizontalScrollIndicator={days === 30} nestedScrollEnabled>
          <View style={{ height: 190, flexDirection: "row", alignItems: "flex-end", gap: 7, width: chartWidth as number | `${number}%` }}>
            {data.bookingsByDay.map((item) => {
              const height = item.bookings ? Math.max(8, (item.bookings / maxBookings) * 140) : 3;
              return <View key={item.day} accessibilityLabel={`${item.day}: ${item.bookings} bookings`} style={{ flex: 1, height: 180, justifyContent: "flex-end", alignItems: "center", gap: 5 }}>
                <Txt size={10} color={p.muted}>{item.bookings}</Txt>
                <View style={{ width: "65%", height, maxHeight: 140, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: p.brand }} />
                <Txt size={9} color={p.muted}>{item.day.slice(5)}</Txt>
              </View>;
            })}
          </View>
          </ScrollView>
          {days === 30 ? <Txt size={11} color={p.muted}>Swipe horizontally to inspect each day.</Txt> : null}
        </Card>
        <Card style={{ gap: 12 }}>
          <Txt bold size={17}>Fleet status</Txt>
          {data.fleetByStatus.length ? data.fleetByStatus.map((item) => {
            const total = Math.max(1, data.fleetByStatus.reduce((sum, row) => sum + row.count, 0));
            const color = item.status === "active" ? p.green : item.status === "blocked" ? p.red : p.amber;
            return <View key={item.status} style={{ gap: 6 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Txt>{item.status}</Txt><Txt bold>{item.count}</Txt></View><View style={{ height: 8, backgroundColor: p.line, borderRadius: 8, overflow: "hidden" }}><View style={{ width: `${(item.count / total) * 100}%`, height: 8, backgroundColor: color }} /></View></View>;
          }) : <View style={{ alignItems: "center", gap: 8, padding: 12 }}><Ionicons name="bus-outline" size={26} color={p.muted} /><Txt color={p.muted}>No buses in the fleet yet.</Txt></View>}
        </Card>
        <Card style={{ gap: 5 }}><Txt bold size={17}>Collected fare</Txt><Txt size={25} bold>₹{Number(data.totals.collectedFare).toFixed(2)}</Txt><Txt size={11} color={p.muted}>Boarded tickets only, for the selected dates.</Txt></Card>
        <Card style={{ gap: 10 }}>
          <Txt bold size={17}>Recent fleet activity</Txt>
          {events.length ? events.slice(0, 8).map((event, index) => <View key={`${event.bus_id}-${event.recorded_at}-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 10 }}>
            <View style={{ flex: 1, gap: 3 }}><Txt bold>{event.bus_id}</Txt><Txt size={11} color={p.muted}>{new Date(event.recorded_at).toLocaleString()}</Txt></View>
            <Pill label={event.source || "GPS"} color={p.brand} />
          </View>) : <Txt color={p.muted} size={12}>No GPS reports have been recorded yet.</Txt>}
        </Card>
      </> : null}
    </ScrollView>
  );
}
