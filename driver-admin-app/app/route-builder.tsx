import React, { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, Txt } from "../src/components/UI";
import { StopPickerMap, PickerStop } from "../src/components/StopPickerMap";
import { FadeIn } from "../src/components/motion";
import { useApp } from "../src/context/AppContext";
import { request } from "../src/lib/api";
import { palette as p } from "../src/theme/theme";

export default function RouteBuilder() {
  const { user, token, reload } = useApp();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState<PickerStop[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user?.role !== "admin") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg, padding: 20, justifyContent: "center" }}>
        <Txt>Only administrators can build routes.</Txt>
      </SafeAreaView>
    );
  }

  const normalisedCode = code.trim().toUpperCase();
  const valid =
    name.trim().length >= 2 &&
    /^[A-Z0-9-]{2,30}$/.test(normalisedCode) &&
    origin.trim().length >= 2 &&
    destination.trim().length >= 2 &&
    stops.length >= 2 &&
    stops.every((s) => s.name.trim().length > 0);

  const save = async () => {
    if (!valid || !token) {
      setError("Add a name, a code, both endpoints and at least two named stops.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/routes", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          code: normalisedCode,
          origin: origin.trim(),
          destination: destination.trim(),
          stops: stops.map((s) => ({ name: s.name.trim(), lat: s.lat, lon: s.lon })),
        }),
      }, token);
      reload();
      Alert.alert("Route saved", `${name.trim()} is now available for buses and driver requests.`, [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the route.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 6 }}>
          <Ionicons name="arrow-back" size={20} color={p.brand} />
          <Txt color={p.brand} bold>Back</Txt>
        </Pressable>

        <FadeIn style={{ gap: 6 }}>
          <Txt color={p.brand} bold size={12}>NEW ROUTE</Txt>
          <Txt size={26} bold>Build a route on the map</Txt>
          <Txt color={p.muted}>Tap the map to place stops in order. Buses on this route will follow them.</Txt>
        </FadeIn>

        <Card style={{ gap: 14 }}>
          <Field label="Route name" value={name} onChangeText={setName} placeholder="City Centre to Station" />
          <Field label="Code" value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="DGP-04" />
          <Field label="Origin" value={origin} onChangeText={setOrigin} placeholder="City Centre" />
          <Field label="Destination" value={destination} onChangeText={setDestination} placeholder="Durgapur Station" />
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt bold size={16}>Stops</Txt>
          <StopPickerMap stops={stops} onChange={setStops} height={320} />
        </Card>

        {error ? <Txt color={p.red}>{error}</Txt> : null}
        <Button title="Save route" onPress={() => void save()} loading={busy} disabled={!valid} />
      </ScrollView>
    </SafeAreaView>
  );
}
