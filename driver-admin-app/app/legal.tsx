import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Txt } from "../src/components/UI";
import { palette as p } from "../src/theme/theme";

type SectionProps = {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function Section({ title, body, icon }: SectionProps) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name={icon} size={21} color={p.brand} />
        <Txt size={16} bold>
          {title}
        </Txt>
      </View>
      <Txt color={p.muted} style={{ lineHeight: 22 }}>
        {body}
      </Txt>
    </Card>
  );
}

export default function Legal() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 14 }}
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
          <Ionicons name="arrow-back" size={20} color={p.brand} />
          <Txt color={p.brand} bold>
            Settings
          </Txt>
        </Pressable>

        <View style={{ gap: 6, marginBottom: 4 }}>
          <Txt size={28} bold>
            Terms & privacy
          </Txt>
          <Txt color={p.muted} style={{ lineHeight: 21 }}>
            How the BusTrack India Operations app is intended to be used.
          </Txt>
        </View>

        <Section
          title="Operations terms"
          icon="document-text-outline"
          body="Use this app only with an account provided by your transport administrator. Keep your credentials private and use operational tools only for your assigned responsibilities. Bus and route information, location updates, fare settings, and booking records may be delayed or incomplete; follow your organization's operating procedures and confirm critical information with the appropriate staff."
        />
        <Section
          title="Information and access"
          icon="lock-closed-outline"
          body="Sign-in details and operational actions are sent to the API configured for this app and may be stored in its connected database. Use only a server and network approved by your organization. Appearance preferences are stored on this device. Sign out when using a shared device."
        />
        <Section
          title="Driver access documents"
          icon="id-card-outline"
          body="A driver access request includes the route and stops you selected, plus the identity photos you submit. Uploaded licence and Aadhaar images are kept in private server storage and can only be viewed by an authenticated administrator while the request is pending. The server deletes the images after the request is approved or declined. Do not submit documents unless you agree to share them for this review."
        />
        <Section
          title="Location sharing"
          icon="navigate-outline"
          body="Driver location is shared only when the driver enables location sharing during duty. This development build sends updates while the app is in the foreground and is not a guaranteed background tracking service. Administrators may see operational location records associated with the fleet."
        />
        <Txt color={p.muted} size={12} style={{ lineHeight: 18 }}>
          This is a local development app. These notes describe current behavior
          and are not a substitute for your organization's policies or legal
          advice.
        </Txt>
        <Button title="Back to settings" kind="soft" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
