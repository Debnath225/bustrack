import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../theme/theme";

type FeedbackDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  tone?: "success" | "error" | "info";
  onDismiss: () => void;
};

export function FeedbackDialog({
  visible,
  title,
  message,
  tone = "info",
  onDismiss,
}: FeedbackDialogProps) {
  const style = {
    success: {
      icon: "checkmark-circle" as const,
      color: palette.green,
      background: palette.greenSoft,
    },
    error: {
      icon: "alert-circle" as const,
      color: palette.red,
      background: palette.redSoft,
    },
    info: {
      icon: "information-circle" as const,
      color: palette.brand,
      background: palette.brandSoft,
    },
  }[tone];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "rgba(16, 24, 40, 0.48)",
        }}
      >
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: palette.card,
            borderRadius: 22,
            padding: 22,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              backgroundColor: style.background,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name={style.icon} size={30} color={style.color} />
          </View>
          <Text
            style={{
              color: palette.ink,
              fontSize: 19,
              fontWeight: "900",
              textAlign: "center",
              flexShrink: 1,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 14,
              lineHeight: 21,
              textAlign: "center",
              marginTop: 8,
              flexShrink: 1,
            }}
          >
            {message}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={{
              minHeight: 48,
              alignSelf: "stretch",
              backgroundColor: palette.brand,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 20,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
              Got it
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
