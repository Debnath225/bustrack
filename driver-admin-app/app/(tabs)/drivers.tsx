import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, Pill, Txt } from "../../src/components/UI";
import { useApp } from "../../src/context/AppContext";
import { getBaseUrl, request } from "../../src/lib/api";
import { palette as p } from "../../src/theme/theme";

type AccessRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  reason: string | null;
  requestedRoute: { id: string; name: string; code: string } | null;
  selectedStops: { index: number; name: string }[];
  hasDrivingLicense: boolean;
  hasAadhaarCard: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type Bus = {
  bus_id: string;
  label: string | null;
  status: string;
  route_id: string | null;
  route_name: string | null;
  driver_id: string | null;
};

type Driver = {
  id: string;
  name: string;
  email: string;
  driverStatus: "pending" | "approved" | "suspended";
  busId: string | null;
  busLabel: string | null;
};

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString();
}

function DocumentPreview({
  requestId,
  documentType,
  label,
  token,
}: {
  requestId: string;
  documentType: "driving-license" | "aadhaar-card";
  label: string;
  token: string;
}) {
  const [baseUrl, setBaseUrl] = useState("");
  const [failed, setFailed] = useState(false);

  React.useEffect(() => {
    let active = true;
    void getBaseUrl()
      .then((url) => {
        if (active) setBaseUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={{ gap: 7 }}>
      <Txt bold size={13}>{label}</Txt>
      {failed || !baseUrl ? (
        <View
          style={{
            height: 170,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: p.bg,
          }}
        >
          <Txt color={p.muted} size={12}>
            {failed ? "Could not load this document." : "Loading secure document…"}
          </Txt>
        </View>
      ) : (
        <Image
          accessibilityLabel={label}
          source={{
            uri: `${baseUrl}/api/admin/driver-access-requests/${encodeURIComponent(requestId)}/documents/${documentType}`,
            headers: { Authorization: `Bearer ${token}` },
          }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: 210,
            borderRadius: 12,
            backgroundColor: p.bg,
          }}
        />
      )}
    </View>
  );
}

export default function Drivers() {
  const { user, token } = useApp();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reviewRequest, setReviewRequest] = useState<AccessRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<AccessRequest | null>(null);
  const [selectedBus, setSelectedBus] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!token || user?.role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const [driverData, requestData, fleetData] = await Promise.all([
        request<{ drivers: Driver[] }>("/api/admin/drivers/review", {}, token),
        request<{ requests: AccessRequest[] }>("/api/admin/driver-access-requests", {}, token),
        request<{ buses: Bus[] }>("/api/admin/fleet", {}, token),
      ]);
      setDrivers(driverData.drivers ?? []);
      setRequests(requestData.requests ?? []);
      setBuses(fleetData.buses ?? []);
    } catch (error) {
      setLoadError(messageFrom(error));
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pendingRequests = useMemo(
    () => requests.filter((item) => item.status === "pending"),
    [requests],
  );
  const reviewedRequests = useMemo(
    () => requests.filter((item) => item.status !== "pending").slice(0, 5),
    [requests],
  );
  const availableBuses = useMemo(
    () => buses.filter((bus) => !bus.driver_id && bus.status !== "blocked"),
    [buses],
  );
  const routeBuses = useMemo(
    () => availableBuses.filter(
      (bus) => !reviewRequest?.requestedRoute || bus.route_id === reviewRequest.requestedRoute.id,
    ),
    [availableBuses, reviewRequest],
  );

  const openApproval = (item: AccessRequest) => {
    setReviewRequest(item);
    setSelectedBus("");
    setInitialPassword("");
    setFormError("");
  };

  const approve = async () => {
    if (!reviewRequest || !token) return;
    if (initialPassword.length < 8 || initialPassword.length > 72) {
      setFormError("Set an initial password between 8 and 72 characters.");
      return;
    }
    if (!selectedBus) {
      setFormError("Choose an available bus before approving this request.");
      return;
    }
    setWorking(true);
    setFormError("");
    try {
      await request(
        `/api/admin/driver-access-requests/${encodeURIComponent(reviewRequest.id)}/approve`,
        {
          method: "POST",
          body: JSON.stringify({ password: initialPassword, busId: selectedBus }),
        },
        token,
      );
      setReviewRequest(null);
      setInitialPassword("");
      setNotice(`Account approved for ${reviewRequest.name}. Share the initial password securely.`);
      await load();
    } catch (error) {
      setFormError(messageFrom(error));
    } finally {
      setWorking(false);
    }
  };

  const reject = async () => {
    if (!rejectRequest || !token) return;
    setWorking(true);
    setFormError("");
    try {
      await request(
        `/api/admin/driver-access-requests/${encodeURIComponent(rejectRequest.id)}/reject`,
        { method: "POST" },
        token,
      );
      setRejectRequest(null);
      setNotice(`Access request for ${rejectRequest.name} was declined.`);
      await load();
    } catch (error) {
      setFormError(messageFrom(error));
    } finally {
      setWorking(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, justifyContent: "center", padding: 22 }}>
        <Card style={{ gap: 8 }}>
          <Txt bold size={18}>Administrator access required</Txt>
          <Txt color={p.muted}>Only administrators can review driver accounts and access requests.</Txt>
        </Card>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: p.bg }}
        contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={p.brand} />
        }
      >
        <View style={{ paddingTop: 12, gap: 5 }}>
          <Txt color={p.muted}>ADMINISTRATION</Txt>
          <Txt size={27} bold>Drivers & access</Txt>
          <Txt color={p.muted}>Review requests, assign a bus, and manage approved driver accounts.</Txt>
        </View>

        {notice ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setNotice("")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              padding: 13,
              borderRadius: 13,
              backgroundColor: p.greenSoft,
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={p.green} />
            <Txt color={p.green} size={13} style={{ flex: 1, lineHeight: 19 }}>{notice}</Txt>
            <Ionicons name="close" size={18} color={p.green} />
          </Pressable>
        ) : null}

        {loadError ? (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
              <Ionicons name="cloud-offline-outline" size={20} color={p.red} />
              <Txt color={p.red} style={{ flex: 1, lineHeight: 20 }}>{loadError}</Txt>
            </View>
            <Button title="Retry loading" kind="soft" onPress={() => void load()} />
          </Card>
        ) : null}

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ gap: 3 }}>
              <Txt size={18} bold>Access requests</Txt>
              <Txt color={p.muted} size={12}>New requests do not create accounts until approved.</Txt>
            </View>
            <Pill label={`${pendingRequests.length} pending`} color={pendingRequests.length ? p.amber : p.green} />
          </View>
          {loading && requests.length === 0 ? (
            <Txt color={p.muted}>Loading access requests…</Txt>
          ) : pendingRequests.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 15, gap: 7 }}>
              <Ionicons name="checkmark-done-circle-outline" size={29} color={p.green} />
              <Txt bold>No pending requests</Txt>
              <Txt color={p.muted} size={12} style={{ textAlign: "center" }}>
                New driver requests will appear here for review.
              </Txt>
            </View>
          ) : (
            pendingRequests.map((item) => (
              <View
                key={item.id}
                style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: p.line, gap: 10 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt bold>{item.name}</Txt>
                    <Txt color={p.muted} size={12}>{item.email}</Txt>
                    <Txt color={p.muted} size={11}>Requested {dateLabel(item.createdAt)}</Txt>
                  </View>
                  <Pill label="Pending" color={p.amber} />
                </View>
                {item.phone ? <Txt size={12} style={{ lineHeight: 18 }}>Phone · {item.phone}</Txt> : null}
                {item.requestedRoute ? (
                  <View style={{ gap: 3 }}>
                    <Txt size={12} bold>
                      Requested route · {item.requestedRoute.name} ({item.requestedRoute.code})
                    </Txt>
                    {item.selectedStops.length ? (
                      <Txt color={p.muted} size={11} style={{ lineHeight: 17 }}>
                        Stops · {item.selectedStops.map((stop) => stop.name).join(" · ")}
                      </Txt>
                    ) : null}
                  </View>
                ) : null}
                <Txt color={p.muted} size={11}>
                  Documents · {item.hasDrivingLicense ? "Licence" : "No licence"} · {item.hasAadhaarCard ? "Aadhaar" : "No Aadhaar"}
                </Txt>
                {item.reason ? (
                  <View style={{ padding: 10, borderRadius: 11, backgroundColor: p.bg }}>
                    <Txt color={p.muted} size={12} style={{ lineHeight: 18 }}>{item.reason}</Txt>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", gap: 9 }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Review & approve" onPress={() => openApproval(item)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Decline" kind="danger" onPress={() => {
                      setRejectRequest(item);
                      setFormError("");
                    }} />
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        {reviewedRequests.length ? (
          <Card style={{ gap: 11 }}>
            <Txt bold size={17}>Recently reviewed</Txt>
            {reviewedRequests.map((item) => (
              <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, paddingTop: 9, borderTopWidth: 1, borderTopColor: p.line }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt bold>{item.name}</Txt>
                  <Txt color={p.muted} size={11}>{item.email}</Txt>
                </View>
                <Pill
                  label={item.status === "approved" ? "Approved" : "Declined"}
                  color={item.status === "approved" ? p.green : p.red}
                />
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={{ gap: 11 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ gap: 3 }}>
              <Txt size={18} bold>Driver accounts</Txt>
              <Txt color={p.muted} size={12}>Existing accounts and bus assignments.</Txt>
            </View>
            <Pill label={`${drivers.length} total`} color={p.brand} />
          </View>
          {loading && drivers.length === 0 ? (
            <Txt color={p.muted}>Loading driver accounts…</Txt>
          ) : drivers.length === 0 ? (
            <Txt color={p.muted} style={{ paddingVertical: 12 }}>
              No driver accounts yet. Approve an access request to create the first one.
            </Txt>
          ) : (
            drivers.map((driver) => (
              <View key={driver.id} style={{ paddingTop: 11, borderTopWidth: 1, borderTopColor: p.line, gap: 7 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt bold>{driver.name}</Txt>
                    <Txt color={p.muted} size={12}>{driver.email}</Txt>
                  </View>
                  <Pill
                    label={driver.driverStatus}
                    color={driver.driverStatus === "approved" ? p.green : driver.driverStatus === "suspended" ? p.red : p.amber}
                  />
                </View>
                <Txt color={p.muted} size={12}>
                  {driver.busId ? `${driver.busLabel || driver.busId} · ${driver.busId}` : "No bus assigned"}
                </Txt>
                {driver.driverStatus === "pending" ? (
                  <Txt color={p.amber} size={12}>Assign a bus before approving sign-in.</Txt>
                ) : null}
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <Modal
        visible={!!reviewRequest}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!working) setReviewRequest(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "#0008" }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={{ gap: 13 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt size={20} bold>Approve driver access</Txt>
                  <Txt color={p.muted}>{reviewRequest?.name} · {reviewRequest?.email}</Txt>
                </View>
                <Pressable disabled={working} onPress={() => setReviewRequest(null)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={p.muted} />
                </Pressable>
              </View>
              <Txt color={p.muted} size={12} style={{ lineHeight: 18 }}>
                Review the route preference and identity documents before approval.
                Approval creates the account, assigns a matching bus, and enables
                sign-in. Share the initial password securely; it will not be
                shown again after approval.
              </Txt>
              {reviewRequest?.requestedRoute ? (
                <View style={{ gap: 5, padding: 11, borderRadius: 12, backgroundColor: p.brandSoft }}>
                  <Txt bold size={13}>
                    Requested route · {reviewRequest.requestedRoute.name} ({reviewRequest.requestedRoute.code})
                  </Txt>
                  <Txt color={p.muted} size={12} style={{ lineHeight: 18 }}>
                    Stops · {reviewRequest.selectedStops.map((stop) => stop.name).join(" · ") || "No stops selected"}
                  </Txt>
                </View>
              ) : null}
              <View style={{ gap: 12 }}>
                {reviewRequest?.hasDrivingLicense && token ? (
                  <DocumentPreview
                    requestId={reviewRequest.id}
                    documentType="driving-license"
                    label="Driving licence"
                    token={token}
                  />
                ) : (
                  <Txt color={p.amber} size={12}>No driving licence image is attached.</Txt>
                )}
                {reviewRequest?.hasAadhaarCard && token ? (
                  <DocumentPreview
                    requestId={reviewRequest.id}
                    documentType="aadhaar-card"
                    label="Aadhaar card"
                    token={token}
                  />
                ) : (
                  <Txt color={p.amber} size={12}>No Aadhaar image is attached.</Txt>
                )}
              </View>
              <View style={{ gap: 8 }}>
                <Txt bold size={13}>Available bus</Txt>
                {routeBuses.length === 0 ? (
                  <View style={{ padding: 12, backgroundColor: p.amber + "20", borderRadius: 12 }}>
                    <Txt color={p.amber} size={12} style={{ lineHeight: 18 }}>
                      {reviewRequest?.requestedRoute
                        ? "No unassigned buses are available on the requested route. Assign or add a matching bus before approving."
                        : "No unassigned buses are available. Assign or add a bus before approving."}
                    </Txt>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {routeBuses.map((bus) => {
                      const selected = selectedBus === bus.bus_id;
                      return (
                        <Pressable
                          key={bus.bus_id}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => {
                            setSelectedBus(bus.bus_id);
                            setFormError("");
                          }}
                          style={{
                            paddingVertical: 9,
                            paddingHorizontal: 12,
                            borderRadius: 11,
                            backgroundColor: selected ? p.brand : p.brandSoft,
                          }}
                        >
                          <Txt color={selected ? "#FFFFFF" : p.brand} bold size={12}>
                            {bus.label || bus.bus_id}
                          </Txt>
                          <Txt color={selected ? "#FFFFFF" : p.brand} size={10}>{bus.bus_id}</Txt>
                          <Txt color={selected ? "#FFFFFF" : p.muted} size={10}>{bus.status}</Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <Field
                label="Initial password (8–72 characters)"
                value={initialPassword}
                onChangeText={(value) => {
                  setInitialPassword(value);
                  setFormError("");
                }}
                placeholder="Set a temporary password"
                secureTextEntry
              />
              {formError ? (
                <View accessibilityRole="alert" style={{ padding: 10, backgroundColor: p.redSoft, borderRadius: 11 }}>
                  <Txt color={p.red} size={12} style={{ lineHeight: 18 }}>{formError}</Txt>
                </View>
              ) : null}
              <Button
                title="Create account & approve"
                onPress={() => void approve()}
                loading={working}
                disabled={working || routeBuses.length === 0}
              />
              <Button
                title="Cancel"
                kind="soft"
                onPress={() => setReviewRequest(null)}
                disabled={working}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={!!rejectRequest}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!working) setRejectRequest(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 18, backgroundColor: "#0008" }}>
          <Card style={{ gap: 13 }}>
            <Txt size={20} bold>Decline this request?</Txt>
            <Txt color={p.muted} style={{ lineHeight: 20 }}>
              {rejectRequest?.name} ({rejectRequest?.email}) will not be able to sign in. They may submit a new request later.
            </Txt>
            {formError ? <Txt color={p.red} size={12}>{formError}</Txt> : null}
            <Button title="Decline request" kind="danger" onPress={() => void reject()} loading={working} disabled={working} />
            <Button title="Keep request" kind="soft" onPress={() => setRejectRequest(null)} disabled={working} />
          </Card>
        </SafeAreaView>
      </Modal>
    </>
  );
}
