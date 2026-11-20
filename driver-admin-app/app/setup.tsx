import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Txt } from "../src/components/UI";
import { useApp } from "../src/context/AppContext";
import { palette as p } from "../src/theme/theme";
import { FeedbackDialog } from "../src/components/FeedbackDialog";

type SetupStep = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const driverSteps: SetupStep[] = [
  {
    title: "Confirm your assignment",
    description:
      "Your administrator creates your account and assigns your bus and route. Contact them if your assignment is missing.",
    icon: "person-outline",
  },
  {
    title: "Start your duty and location",
    description:
      "Open Duty, review the assigned bus, and start sharing its live location before service begins. Keep location access enabled while on duty.",
    icon: "navigate-outline",
  },
  {
    title: "Set route fares",
    description:
      "Use Fares to enter prices between route stops. Passengers see these values when comparing their trip options.",
    icon: "cash-outline",
  },
  {
    title: "Manage boarding",
    description:
      "In Tickets, enable same-day bookings when you can accept them. Check each reservation, collect cash on boarding, then mark the passenger boarded.",
    icon: "ticket-outline",
  },
];

const adminSteps: SetupStep[] = [
  {
    title: "Set up routes and buses",
    description:
      "In Manage, check that service routes, stops, bus capacity, and operational status are correct before assigning drivers.",
    icon: "bus-outline",
  },
  {
    title: "Create and assign accounts",
    description:
      "Create driver accounts and assign each one to the correct bus. Drivers cannot begin live duty until their assignment is in place.",
    icon: "people-outline",
  },
  {
    title: "Verify live operations",
    description:
      "Review the dashboard and Activity feed during service to confirm buses are reporting current locations and operational events.",
    icon: "pulse-outline",
  },
  {
    title: "Review fares and bookings",
    description:
      "Drivers manage their assigned route fares and choose whether to accept bookings. Bookings are for the current service day and are paid in cash on boarding.",
    icon: "clipboard-outline",
  },
];

export default function Setup() {
  const { user, setupComplete, completeSetup } = useApp();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  if (!user) return <Redirect href="/login" />;

  const steps = user.role === "admin" ? adminSteps : driverSteps;
  const current = steps[step];
  const finish = async () => {
    setBusy(true);
    try {
      await completeSetup();
      router.replace("/(tabs)");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save setup progress.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: p.bg }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          padding: 22,
          gap: 24,
        }}
      >
        <View style={{ gap: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ gap: 4 }}>
              <Txt color={p.brand} bold size={12}>
                BUS TRACK INDIA · {user.role.toUpperCase()} SETUP
              </Txt>
              <Txt size={26} bold>
                {setupComplete ? "Getting started" : "Welcome, " + user.name}
              </Txt>
            </View>
            {setupComplete ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                hitSlop={10}
              >
                <Txt color={p.brand} bold>
                  Close
                </Txt>
              </Pressable>
            ) : null}
          </View>

          <Card style={{ gap: 18, padding: 22 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: p.brandSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={current.icon} size={28} color={p.brand} />
            </View>
            <View style={{ gap: 8 }}>
              <Txt color={p.brand} bold size={12}>
                STEP {step + 1} OF {steps.length}
              </Txt>
              <Txt size={23} bold>
                {current.title}
              </Txt>
              <Txt color={p.muted} size={15}>
                {current.description}
              </Txt>
            </View>
          </Card>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 7 }}>
            {steps.map((item, index) => (
              <View
                key={item.title}
                style={{
                  height: 7,
                  width: index === step ? 22 : 7,
                  borderRadius: 5,
                  backgroundColor: index === step ? p.brand : p.line,
                }}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {step < steps.length - 1 ? (
            <Button title="Continue" onPress={() => setStep(step + 1)} />
          ) : (
            <Button
              title={setupComplete ? "Back to app" : "Finish setup"}
              onPress={() => void finish()}
              loading={busy}
            />
          )}
          {step > 0 ? (
            <Button
              title="Back"
              kind="soft"
              onPress={() => setStep(step - 1)}
            />
          ) : !setupComplete ? (
            <Button
              title="Skip for now"
              kind="soft"
              onPress={() => void finish()}
              loading={busy}
            />
          ) : null}
          <Txt color={p.muted} size={12} style={{ textAlign: "center" }}>
            You can review this guide later from Settings.
          </Txt>
        </View>
      </ScrollView>
      <FeedbackDialog
        visible={notice.length > 0}
        title="Setup could not be saved"
        message={notice}
        tone="error"
        onDismiss={() => setNotice("")}
      />
    </SafeAreaView>
  );
}
