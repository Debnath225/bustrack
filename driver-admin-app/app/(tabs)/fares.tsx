import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Txt } from "../../src/components/UI";
import { FeedbackDialog } from "../../src/components/FeedbackDialog";
import { useApp } from "../../src/context/AppContext";
import { request } from "../../src/lib/api";
import { palette as p } from "../../src/theme/theme";

type Stop = { name: string };
type Fare = {
  fromStopIndex: number;
  toStopIndex: number;
  amount: number;
};
type FareData = {
  bus: { busId: string; label: string; routeName: string | null };
  stops: Stop[];
  fares: Fare[];
};
type Notice = {
  title: string;
  message: string;
  tone: "success" | "error" | "info";
};

const fareKey = (fromStopIndex: number, toStopIndex: number) =>
  `${fromStopIndex}:${toStopIndex}`;

export default function DriverFares() {
  const { token } = useApp();
  const [data, setData] = useState<FareData | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await request<FareData>("/api/driver/fares", {}, token);
      setData(response);
      setValues(
        Object.fromEntries(
          response.fares.map((fare) => [
            fareKey(fare.fromStopIndex, fare.toStopIndex),
            String(fare.amount),
          ]),
        ),
      );
      setError("");
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load fare settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pairs = useMemo(() => {
    const result: Array<{ from: number; to: number }> = [];
    if (!data) return result;
    for (let from = 0; from < data.stops.length; from += 1) {
      for (let to = from + 1; to < data.stops.length; to += 1) {
        result.push({ from, to });
      }
    }
    return result;
  }, [data]);

  const save = async () => {
    if (!data) return;
    const fares: Fare[] = [];
    for (const pair of pairs) {
      const rawAmount = (values[fareKey(pair.from, pair.to)] ?? "")
        .trim()
        .replace(",", ".");
      if (!rawAmount) continue;
      const amount = Number(rawAmount);
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 10000 ||
        Math.abs(amount * 100 - Math.round(amount * 100)) >= 1e-8
      ) {
        setNotice({
          title: "Check the fare",
          message: "Enter a price greater than ₹0 with up to two decimal places.",
          tone: "error",
        });
        return;
      }
      fares.push({
        fromStopIndex: pair.from,
        toStopIndex: pair.to,
        amount,
      });
    }

    setSaving(true);
    try {
      await request(
        "/api/driver/fares",
        { method: "PUT", body: JSON.stringify({ fares }) },
        token || undefined,
      );
      setData((current) => (current ? { ...current, fares } : current));
      setNotice({
        title: "Fares updated",
        message: "Passengers will now see these prices for your assigned bus.",
        tone: "success",
      });
    } catch (saveError) {
      setNotice({
        title: "Could not save fares",
        message:
          saveError instanceof Error ? saveError.message : "Try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: 12, gap: 5 }}>
          <Txt color={p.muted}>DRIVER WORKSPACE</Txt>
          <Txt size={27} bold>
            Bus fares
          </Txt>
          <Txt color={p.muted}>
            Set the ticket price passengers see for each pair of stops.
          </Txt>
        </View>

        {loading ? (
          <ActivityIndicator style={{ padding: 28 }} color={p.brand} />
        ) : !data ? (
          <Card style={{ gap: 12 }}>
            <Txt bold size={17}>
              Fare settings unavailable
            </Txt>
            <Txt color={p.muted}>{error || "No route is assigned to this bus."}</Txt>
            <Button title="Try again" kind="soft" onPress={() => void load()} />
          </Card>
        ) : (
          <>
            <Card style={{ gap: 5 }}>
              <Txt bold size={17}>
                {data.bus.label || data.bus.busId}
              </Txt>
              <Txt color={p.muted}>
                {data.bus.busId} · {data.bus.routeName || "Assigned route"}
              </Txt>
            </Card>

            <Card style={{ gap: 8 }}>
              <Txt bold size={16}>
                Fare guide
              </Txt>
              <Txt color={p.muted} size={12}>
                Each price applies to the full stop pair in either direction;
                it is not a per-stop rate. Leave a pair blank to mark that fare
                as unavailable. Saving replaces the current fare list for this
                bus.
              </Txt>
            </Card>

            <Card style={{ gap: 2 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 10,
                }}
              >
                <Txt bold size={17}>
                  Stop-pair prices
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reload fare data"
                  onPress={() => void load()}
                  hitSlop={8}
                >
                  <Ionicons name="refresh" size={20} color={p.brand} />
                </Pressable>
              </View>
              {pairs.length === 0 ? (
                <Txt color={p.muted}>This route needs at least two stops.</Txt>
              ) : (
                pairs.map(({ from, to }) => {
                  const key = fareKey(from, to);
                  return (
                    <View
                      key={key}
                      style={{
                        minHeight: 62,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        borderTopWidth: 1,
                        borderTopColor: p.line,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Txt size={13} bold>
                          {data.stops[from].name}
                        </Txt>
                        <Txt size={11} color={p.muted}>
                          to {data.stops[to].name}
                        </Txt>
                      </View>
                      <View
                        style={{
                          width: 108,
                          height: 44,
                          flexDirection: "row",
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: p.line,
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          backgroundColor: p.card,
                        }}
                      >
                        <Text style={{ color: p.muted, fontWeight: "700" }}>
                          ₹
                        </Text>
                        <TextInput
                          accessibilityLabel={`Fare from ${data.stops[from].name} to ${data.stops[to].name}`}
                          value={values[key] ?? ""}
                          onChangeText={(value) =>
                            setValues((current) => ({ ...current, [key]: value }))
                          }
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor={p.muted}
                          style={{
                            flex: 1,
                            color: p.ink,
                            paddingVertical: 0,
                            paddingLeft: 5,
                            textAlign: "right",
                          }}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </Card>

            <Button
              title="Save fares"
              onPress={() => void save()}
              loading={saving}
              disabled={loading}
            />
          </>
        )}
      </ScrollView>
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
