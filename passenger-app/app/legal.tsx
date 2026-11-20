import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../src/components/UI";
import { useApp } from "../src/context/AppContext";
import { themeColors } from "../src/theme/theme";

type LegalSectionProps = {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  dark: boolean;
};

function LegalSection({ title, body, icon, dark }: LegalSectionProps) {
  const colors = themeColors(dark);
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name={icon} size={21} color={colors.primary} />
        <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 16 }}>
          {title}
        </Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>
        {body}
      </Text>
    </Card>
  );
}

export default function Legal() {
  const { dark } = useApp();
  const colors = themeColors(dark);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 14 }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingVertical: 6,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "800" }}>
            Settings
          </Text>
        </Pressable>

        <View style={{ gap: 6, marginBottom: 4 }}>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: "900" }}>
            Terms & privacy
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
            Clear information about using BusTrack India Passenger.
          </Text>
        </View>

        <LegalSection
          title="Terms of use"
          icon="document-text-outline"
          dark={dark}
          body="BusTrack is a travel aid, not a guarantee of service. Bus locations, fares, route details, and estimated arrival information can be delayed or inaccurate; confirm important details with the operator. Reservations are for the current service day, are paid in cash when boarding, and must be cancelled before boarding if you can no longer travel. Use the app lawfully and keep your sign-in details private."
        />
        <LegalSection
          title="Your information"
          icon="lock-closed-outline"
          dark={dark}
          body="Account details are sent to the BusTrack API configured for this app. This development build stores account data in its connected local database. Saved buses, preferences, and an active arrival reminder are stored on your device. Do not use real or sensitive information with an untrusted server."
        />
        <LegalSection
          title="Location & notifications"
          icon="navigate-outline"
          dark={dark}
          body="Location access is optional and is used to center the map when you request it. Arrival alerts are optional local notifications based on live bus coordinates. Reminder checks run only while the app is open; this build does not provide reliable background alerts or continuous passenger location tracking."
        />
        <Text
          style={{
            color: colors.subtle,
            fontSize: 12,
            lineHeight: 18,
            marginTop: 2,
          }}
        >
          BusTrack India is currently a local development service. These
          in-app notes describe this build and are not a substitute for
          jurisdiction-specific legal advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
