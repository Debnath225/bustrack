import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { Button, Card, Field, Pill, ToggleSwitch, Txt } from "../../src/components/UI";
import { useApp } from "../../src/context/AppContext";
import { request } from "../../src/lib/api";
import { palette as p } from "../../src/theme/theme";

type Bus = {
  bus_id: string;
  label: string | null;
  route_name: string | null;
  status: string;
};

export default function Operations() {
  const { user, token } = useApp();
  const admin = user?.role === "admin";
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState("");
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [routeId, setRouteId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPassword, setDriverPassword] = useState("");
  const [driverBus, setDriverBus] = useState("");
  const [duty, setDuty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(5);

  const load = useCallback(async () => {
    if (!admin || !token) return;
    try {
      const data = await request<{ buses: Bus[] }>("/api/admin/fleet", {}, token);
      setBuses(data.buses ?? []);
    } catch (error) {
      Alert.alert(
        "Fleet unavailable",
        error instanceof Error ? error.message : "Could not load fleet data.",
      );
    }
  }, [admin, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const createDriver = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await request(
        "/api/admin/drivers",
        {
          method: "POST",
          body: JSON.stringify({
            name: driverName.trim(),
            email: driverEmail.trim(),
            password: driverPassword,
            busId: driverBus.trim() || undefined,
          }),
        },
        token,
      );
      setDriverName("");
      setDriverEmail("");
      setDriverPassword("");
      setDriverBus("");
      Alert.alert(
        "Driver created",
        "The account is pending review. Approve it in the Drivers tab before the driver can sign in.",
      );
    } catch (error) {
      Alert.alert(
        "Could not create driver",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const createBus = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await request(
        "/api/admin/buses",
        {
          method: "POST",
          body: JSON.stringify({
            busId: busId.trim(),
            label: label.trim(),
            capacity: Number(capacity),
            routeId: routeId.trim() || null,
          }),
        },
        token,
      );
      setBusId("");
      setLabel("");
      Alert.alert("Bus created", "The vehicle is now in the fleet.");
      await load();
    } catch (error) {
      Alert.alert(
        "Could not create bus",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!duty || admin || !token) return;
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const sendLocation = async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await request(
          "/api/driver/location",
          {
            method: "POST",
            body: JSON.stringify({
              lat: location.coords.latitude,
              lon: location.coords.longitude,
              speed: Math.max(0, (location.coords.speed || 0) * 3.6),
              bearing: location.coords.heading || 0,
              accuracy: location.coords.accuracy || 30,
            }),
          },
          token,
        );
      } catch (error) {
        if (active) {
          console.warn(
            "Could not send driver location.",
            error instanceof Error ? error.message : error,
          );
        }
      }
    };

    const startDuty = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (active) {
            Alert.alert(
              "Location permission required",
              "Allow location access while using the app to share your bus position.",
            );
            setDuty(false);
          }
          return;
        }
        await sendLocation();
        if (active) timer = setInterval(() => void sendLocation(), intervalSeconds * 1000);
      } catch (error) {
        if (active) {
          Alert.alert(
            "Could not start duty",
            error instanceof Error ? error.message : "Check location permissions and try again.",
          );
          setDuty(false);
        }
      }
    };
    void startDuty();
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [duty, admin, token, intervalSeconds]);

  const setStatus = async (id: string, status: string) => {
    if (!token) return;
    try {
      await request(
        `/api/admin/buses/${encodeURIComponent(id)}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token,
      );
      await load();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Could not update bus status.",
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ padding: 18, paddingBottom: 32, gap: 14 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingTop: 12, gap: 5 }}>
        <Txt color={p.muted}>{admin ? "ADMINISTRATION" : "DRIVER WORKSPACE"}</Txt>
        <Txt size={27} bold>{admin ? "Fleet management" : "My duty"}</Txt>
        <Txt color={p.muted}>
          {admin
            ? "Create vehicles and manage operational status."
            : "Share your live GPS position while on duty."}
        </Txt>
      </View>

      {admin ? (
        <>
          <Card style={{ gap: 12 }}>
            <Txt bold size={18}>Add a vehicle</Txt>
            <Field label="Bus ID" value={busId} onChangeText={setBusId} placeholder="DGP-04-01" />
            <Field label="Display name" value={label} onChangeText={setLabel} placeholder="City Centre Express" />
            <Field label="Capacity" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
            <Field label="Route ID (optional)" value={routeId} onChangeText={setRouteId} placeholder="Paste route UUID" />
            <Button title="Create bus" onPress={() => void createBus()} loading={busy} />
          </Card>

          <Card style={{ gap: 12 }}>
            <Txt bold size={18}>Create driver account</Txt>
            <Field label="Driver name" value={driverName} onChangeText={setDriverName} placeholder="Full name" />
            <Field label="Driver email" value={driverEmail} onChangeText={setDriverEmail} placeholder="driver@example.com" keyboardType="email-address" />
            <Field label="Temporary password" value={driverPassword} onChangeText={setDriverPassword} placeholder="At least 8 characters" secureTextEntry />
            <Field label="Assign bus ID (optional)" value={driverBus} onChangeText={setDriverBus} placeholder="DGP-01-01" />
            <Button title="Create driver" onPress={() => void createDriver()} loading={busy} />
          </Card>

          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <Txt bold size={18}>Fleet ({buses.length})</Txt>
              <View style={{ minWidth: 96 }}>
                <Button title="Refresh" kind="soft" onPress={() => void load()} />
              </View>
            </View>
            {buses.map((bus) => (
              <View
                key={bus.bus_id}
                style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: p.line, gap: 8 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt bold>{bus.label || bus.bus_id}</Txt>
                    <Txt size={12} color={p.muted}>
                      {bus.bus_id} · {bus.route_name || "Unassigned route"}
                    </Txt>
                  </View>
                  <Pill
                    label={bus.status || "offline"}
                    color={bus.status === "active" ? p.green : bus.status === "blocked" ? p.red : p.amber}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    { title: "Set active", status: "active", kind: "soft" as const },
                    { title: "Offline", status: "offline", kind: "soft" as const },
                    { title: "Block", status: "blocked", kind: "danger" as const },
                  ].map((action) => (
                    <View key={action.status} style={{ flex: 1 }}>
                      <Button
                        title={action.title}
                        kind={action.kind}
                        onPress={() => void setStatus(bus.bus_id, action.status)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
            {buses.length === 0 ? <Txt color={p.muted}>No buses in the fleet yet.</Txt> : null}
          </Card>
        </>
      ) : (
        <>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Txt bold size={18}>Live location sharing</Txt>
              <Pill label={duty ? "ON DUTY" : "OFF DUTY"} color={duty ? p.green : p.amber} />
            </View>
            <Txt color={p.muted} style={{ lineHeight: 20 }}>
              When enabled, your phone sends a compact GPS update to the local
              backend at the selected interval. Keep this screen open during testing.
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
              <View style={{ flex: 1 }}>
                <Txt bold>Share GPS while on duty</Txt>
              </View>
              <ToggleSwitch label="Share GPS while on duty" value={duty} onValueChange={setDuty} />
            </View>
            <View style={{ gap: 8 }}>
              <Txt bold>Update frequency</Txt>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[5, 10, 15, 30].map((seconds) => (
                  <View key={seconds} style={{ flex: 1 }}>
                    <Button
                      title={`${seconds}s`}
                      kind={intervalSeconds === seconds ? "primary" : "soft"}
                      onPress={() => setIntervalSeconds(seconds)}
                    />
                  </View>
                ))}
              </View>
            </View>
            <Txt size={12} color={p.muted} style={{ lineHeight: 17 }}>
              Lower frequency uses less mobile data. 10–15 seconds is a good starting point.
            </Txt>
          </Card>
          <Card style={{ gap: 8 }}>
            <Txt bold size={17}>Before starting</Txt>
            <Txt color={p.muted} style={{ lineHeight: 20 }}>
              Your administrator must create your driver account and assign a
              vehicle before GPS updates can be associated with your bus.
            </Txt>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
