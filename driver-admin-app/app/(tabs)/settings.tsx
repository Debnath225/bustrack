import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, ToggleSwitch, Txt } from "../../src/components/UI";
import { FeedbackDialog } from "../../src/components/FeedbackDialog";
import { useApp } from "../../src/context/AppContext";
import { palette as p } from "../../src/theme/theme";

type Notice = {
  title: string;
  message: string;
  tone: "success" | "error" | "info";
};

export default function Settings() {
  const { user, logout, dark, setDark } = useApp();
  const [notice, setNotice] = useState<Notice | null>(null);

  const exit = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      setNotice({
        title: "Could not sign out",
        message: error instanceof Error ? error.message : "Try again.",
        tone: "error",
      });
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ padding: 18, paddingTop: 22, paddingBottom: 34, gap: 14 }}
    >
      <View style={{ paddingTop: 4, paddingBottom: 4, gap: 5 }}>
        <Txt color={p.muted} size={12} bold>
          YOUR OPERATIONS ACCOUNT
        </Txt>
        <Txt size={28} bold>
          Settings
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Txt size={17} bold>
          Account details
        </Txt>
        <Card style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                backgroundColor: p.brandSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person-outline" size={27} color={p.brand} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt size={16} bold>
                {user?.name || "Operations user"}
              </Txt>
              <Txt color={p.muted} size={13}>
                {user?.email || "No email available"}
              </Txt>
              <Txt color={p.brand} size={11} bold>
                {user?.role?.toUpperCase() || "ACCOUNT"}
              </Txt>
            </View>
          </View>
          <Button title="Sign out" kind="danger" onPress={() => void exit()} />
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <Txt size={17} bold>
          Appearance
        </Txt>
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                backgroundColor: p.brandSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={dark ? "moon-outline" : "sunny-outline"}
                size={21}
                color={p.brand}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt bold>Dark theme</Txt>
              <Txt size={12} color={p.muted}>
                Apply a darker palette across the operations app
              </Txt>
            </View>
            <ToggleSwitch label="Dark theme" value={dark} onValueChange={setDark} />
          </View>
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <Txt size={17} bold>
          About
        </Txt>
        <Card style={{ paddingVertical: 4 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/legal")}
            style={{
              minHeight: 54,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Ionicons name="document-text-outline" size={21} color={p.brand} />
            <Txt style={{ flex: 1 }} bold>
              Terms & privacy
            </Txt>
            <Ionicons name="chevron-forward" size={19} color={p.muted} />
          </Pressable>
        </Card>
      </View>

      <Txt color={p.muted} size={11} style={{ textAlign: "center", marginTop: 2 }}>
        BusTrack India Operations · Local development build
      </Txt>

      <FeedbackDialog
        visible={notice !== null}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        tone={notice?.tone}
        onDismiss={() => setNotice(null)}
      />
    </ScrollView>
  );
}
