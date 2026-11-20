import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, Txt } from "../src/components/UI";
import { StopPickerMap, PickerStop } from "../src/components/StopPickerMap";
import { FadeIn, PressScale, Segmented } from "../src/components/motion";
import { request } from "../src/lib/api";
import { palette as p } from "../src/theme/theme";

type RouteStop = { name: string; lat?: number | null; lon?: number | null };
type Route = { id: string; name: string; code: string; origin: string; destination: string; stops: RouteStop[] | string };
type Mode = "existing" | "draw";

const emailPattern = /^\S+@\S+\.\S+$/;

function getStops(value: Route["stops"]): RouteStop[] {
  let stops: unknown = value;
  if (typeof stops === "string") {
    try {
      stops = JSON.parse(stops);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(stops) || stops.some((stop) => !stop || typeof stop.name !== "string" || !stop.name.trim())) {
    return [];
  }
  return stops as RouteStop[];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function PhotoField({
  label,
  asset,
  onChoose,
}: {
  label: string;
  asset: ImagePicker.ImagePickerAsset | null;
  onChoose: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Txt bold size={13}>{label}</Txt>
      <PressScale
        accessibilityLabel={`${label}: ${asset ? "image selected" : "choose an image"}`}
        onPress={onChoose}
        style={{ minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 13, borderWidth: 1, borderColor: asset ? p.green : p.line, backgroundColor: p.bg }}
      >
        {asset ? (
          <Image source={{ uri: asset.uri }} style={{ width: 56, height: 56, borderRadius: 9, backgroundColor: p.line }} />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 9, backgroundColor: p.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="image-outline" size={23} color={p.brand} />
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Txt bold>{asset ? "Image selected" : "Choose an image"}</Txt>
          <Txt color={p.muted} size={11}>{asset?.fileName || "JPG or PNG · up to 5 MB"}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={18} color={p.muted} />
      </PressScale>
    </View>
  );
}

export default function RequestAccess() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<Mode>("existing");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routeError, setRouteError] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedStops, setSelectedStops] = useState<number[]>([]);
  const [drawnStops, setDrawnStops] = useState<PickerStop[]>([]);
  const [routeName, setRouteName] = useState("");
  const [licensePhoto, setLicensePhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [documentConsent, setDocumentConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<Record<string, string>>({});

  const selectedRoute = useMemo(() => routes.find((route) => route.id === selectedRouteId) ?? null, [routes, selectedRouteId]);
  const stops = useMemo(() => (selectedRoute ? getStops(selectedRoute.stops) : []), [selectedRoute]);

  const loadRoutes = async () => {
    setRoutesLoading(true);
    setRouteError("");
    try {
      const data = await request<{ routes: Route[] }>("/api/passenger/routes");
      setRoutes(data.routes ?? []);
    } catch (cause) {
      setRouteError(getErrorMessage(cause));
    } finally {
      setRoutesLoading(false);
    }
  };

  useEffect(() => {
    void loadRoutes();
  }, []);

  const choosePhoto = async (kind: "license" | "aadhaar") => {
    setError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Allow photo-library access to attach your identity documents.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.65, exif: false });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (photo.fileSize && photo.fileSize > 5 * 1024 * 1024) {
        setError("Choose an image smaller than 5 MB.");
        return;
      }
      if (kind === "license") {
        setLicensePhoto(photo);
        setValidation((current) => ({ ...current, license: "" }));
      } else {
        setAadhaarPhoto(photo);
        setValidation((current) => ({ ...current, aadhaar: "" }));
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  };

  const toggleStop = (index: number) => {
    setSelectedStops((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index].sort((a, b) => a - b),
    );
    setValidation((current) => ({ ...current, stops: "" }));
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter your full name.";
    if (!emailPattern.test(email.trim())) next.email = "Enter a valid email address.";
    if (phone.trim() && !/^[+\d()\-\s]{7,32}$/.test(phone.trim())) next.phone = "Enter a valid phone number or leave it blank.";
    if (reason.trim().length > 500) next.reason = "Keep the note under 500 characters.";
    if (mode === "existing") {
      if (!selectedRoute) next.route = "Choose a route.";
      if (selectedStops.length < 2) next.stops = "Choose at least two stops on your requested route.";
    } else {
      if (drawnStops.length < 2) next.stops = "Place at least two stops on the map.";
      if (drawnStops.some((s) => s.name.trim().length === 0)) next.stops = "Give every stop a name.";
      if (routeName.trim().length > 120) next.routeName = "Keep the route name under 120 characters.";
    }
    if (!licensePhoto) next.license = "Add a driving licence photo.";
    if (!aadhaarPhoto) next.aadhaar = "Add an Aadhaar card photo.";
    if (!documentConsent) next.consent = "Confirm that you agree to submit these documents.";
    setValidation(next);
    setError("");
    if (Object.keys(next).length || !licensePhoto || !aadhaarPhoto) return;

    setBusy(true);
    try {
      const body = new FormData();
      body.append("name", name.trim());
      body.append("email", email.trim().toLowerCase());
      if (phone.trim()) body.append("phone", phone.trim());
      if (reason.trim()) body.append("reason", reason.trim());
      if (mode === "existing" && selectedRoute) {
        body.append("routeId", selectedRoute.id);
        body.append("stopIndexes", JSON.stringify(selectedStops));
      } else {
        body.append("customStops", JSON.stringify(drawnStops.map((s) => ({ name: s.name.trim(), lat: s.lat, lon: s.lon }))));
        if (routeName.trim()) body.append("customRouteName", routeName.trim());
      }
      body.append("drivingLicense", { uri: licensePhoto.uri, name: licensePhoto.fileName || "driving-license.jpg", type: licensePhoto.mimeType || "image/jpeg" } as unknown as Blob);
      body.append("aadhaarCard", { uri: aadhaarPhoto.uri, name: aadhaarPhoto.fileName || "aadhaar-card.jpg", type: aadhaarPhoto.mimeType || "image/jpeg" } as unknown as Blob);
      await request("/api/auth/driver-access-requests", { method: "POST", body });
      setSubmitted(true);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 32, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 6 }}>
          <Ionicons name="arrow-back" size={20} color={p.brand} />
          <Txt color={p.brand} bold>Sign in</Txt>
        </Pressable>

        <FadeIn style={{ gap: 7 }}>
          <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: p.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={submitted ? "checkmark-circle-outline" : "person-add-outline"} size={27} color={submitted ? p.green : p.brand} />
          </View>
          <Txt color={p.brand} size={12} bold>DRIVER ACCESS</Txt>
          <Txt size={27} bold>{submitted ? "Request received" : "Request an account"}</Txt>
          <Txt color={p.muted} style={{ lineHeight: 21 }}>
            {submitted ? "Your request is waiting for administrator review." : "Share your details, pick a route or draw your own on the map, and attach your documents. An administrator reviews every request."}
          </Txt>
        </FadeIn>

        {submitted ? (
          <FadeIn delay={120}>
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <Ionicons name="time-outline" size={20} color={p.amber} />
                <Txt bold>Pending approval</Txt>
              </View>
              <Txt color={p.muted} style={{ lineHeight: 21 }}>
                You can sign in after an administrator approves your request, assigns a bus, and shares your initial credentials.
              </Txt>
              <Txt bold>{email.trim().toLowerCase()}</Txt>
              <Button title="Back to sign in" onPress={() => router.replace("/login")} />
            </Card>
          </FadeIn>
        ) : (
          <>
            <FadeIn delay={60}>
              <Card style={{ gap: 14 }}>
                <Txt bold size={16}>About you</Txt>
                <Field label="Full name" value={name} onChangeText={setName} placeholder="As on your licence" />
                {validation.name ? <Txt color={p.red} size={12}>{validation.name}</Txt> : null}
                <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
                {validation.email ? <Txt color={p.red} size={12}>{validation.email}</Txt> : null}
                <Field label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+91 98xxxxxx" keyboardType="phone-pad" />
                {validation.phone ? <Txt color={p.red} size={12}>{validation.phone}</Txt> : null}
                <View style={{ gap: 7 }}>
                  <Txt bold size={13}>Note for the administrator (optional)</Txt>
                  <TextInput
                    accessibilityLabel="Note for the administrator"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    maxLength={500}
                    placeholder="Experience, shift times, anything helpful"
                    placeholderTextColor="#9AA4B2"
                    style={{ minHeight: 80, backgroundColor: p.bg, borderWidth: 1, borderColor: p.line, borderRadius: 13, padding: 12, color: p.ink, fontSize: 15, textAlignVertical: "top" }}
                  />
                </View>
              </Card>
            </FadeIn>

            <FadeIn delay={120}>
              <Card style={{ gap: 14 }}>
                <Txt bold size={16}>Your route</Txt>
                <Segmented<Mode>
                  value={mode}
                  onChange={(next) => {
                    setMode(next);
                    setValidation((current) => ({ ...current, stops: "", route: "" }));
                  }}
                  options={[
                    { key: "existing", label: "Existing route" },
                    { key: "draw", label: "Draw on map" },
                  ]}
                />

                {mode === "existing" ? (
                  <>
                    {routesLoading ? <Txt color={p.muted}>Loading routes…</Txt> : null}
                    {routeError ? (
                      <Pressable accessibilityRole="button" onPress={() => void loadRoutes()}>
                        <Txt color={p.red}>{routeError} Tap to retry.</Txt>
                      </Pressable>
                    ) : null}
                    {!routesLoading && !routeError && routes.length === 0 ? (
                      <Txt color={p.muted} size={12}>No routes are published yet. Draw your own route on the map instead.</Txt>
                    ) : null}
                    <View style={{ gap: 8 }}>
                      {routes.map((route) => {
                        const active = route.id === selectedRouteId;
                        return (
                          <PressScale
                            key={route.id}
                            accessibilityLabel={`Route ${route.name}`}
                            onPress={() => {
                              setSelectedRouteId(route.id);
                              setSelectedStops([]);
                              setValidation((current) => ({ ...current, route: "" }));
                            }}
                            style={{ padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: active ? p.brand : p.line, backgroundColor: active ? p.brandSoft : p.bg }}
                          >
                            <Txt bold>{route.name}</Txt>
                            <Txt color={p.muted} size={12}>{route.code} · {route.origin} to {route.destination}</Txt>
                          </PressScale>
                        );
                      })}
                    </View>
                    {validation.route ? <Txt color={p.red} size={12}>{validation.route}</Txt> : null}
                    {selectedRoute ? (
                      <View style={{ gap: 8 }}>
                        <Txt bold size={13}>Stops you will serve</Txt>
                        {stops.map((stop, index) => {
                          const active = selectedStops.includes(index);
                          return (
                            <PressScale
                              key={`${stop.name}-${index}`}
                              accessibilityLabel={`${active ? "Deselect" : "Select"} ${stop.name}`}
                              onPress={() => toggleStop(index)}
                              style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 11, borderRadius: 12, backgroundColor: active ? p.brandSoft : p.bg, borderWidth: 1, borderColor: active ? p.brand : p.line }}
                            >
                              <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={20} color={active ? p.brand : p.muted} />
                              <Txt bold={active}>{stop.name}</Txt>
                            </PressScale>
                          );
                        })}
                        {validation.stops ? <Txt color={p.red} size={12}>{validation.stops}</Txt> : null}
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Txt color={p.muted} size={12}>Tap the map to place your start, stops and end point. Give each stop a name so passengers recognise it.</Txt>
                    <Field label="Route name (optional)" value={routeName} onChangeText={setRouteName} placeholder="My morning route" />
                    {validation.routeName ? <Txt color={p.red} size={12}>{validation.routeName}</Txt> : null}
                    <StopPickerMap stops={drawnStops} onChange={(next) => { setDrawnStops(next); setValidation((c) => ({ ...c, stops: "" })); }} height={280} />
                    {validation.stops ? <Txt color={p.red} size={12}>{validation.stops}</Txt> : null}
                  </>
                )}
              </Card>
            </FadeIn>

            <FadeIn delay={180}>
              <Card style={{ gap: 14 }}>
                <Txt bold size={16}>Documents</Txt>
                <PhotoField label="Driving licence" asset={licensePhoto} onChoose={() => void choosePhoto("license")} />
                {validation.license ? <Txt color={p.red} size={12}>{validation.license}</Txt> : null}
                <PhotoField label="Aadhaar card" asset={aadhaarPhoto} onChoose={() => void choosePhoto("aadhaar")} />
                {validation.aadhaar ? <Txt color={p.red} size={12}>{validation.aadhaar}</Txt> : null}
                <PressScale accessibilityLabel="Confirm document consent" onPress={() => setDocumentConsent((value) => !value)} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Ionicons name={documentConsent ? "checkbox" : "square-outline"} size={22} color={documentConsent ? p.brand : p.muted} />
                  <Txt color={p.muted} size={13} style={{ flex: 1, lineHeight: 19 }}>
                    I agree that these documents are mine and may be reviewed by an administrator to verify my identity.
                  </Txt>
                </PressScale>
                {validation.consent ? <Txt color={p.red} size={12}>{validation.consent}</Txt> : null}
              </Card>
            </FadeIn>

            {error ? <Txt color={p.red}>{error}</Txt> : null}
            <Button title="Submit request" onPress={() => void submit()} loading={busy} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
