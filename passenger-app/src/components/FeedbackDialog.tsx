import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { themeColors } from "../theme/theme";

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
  const { dark } = useApp();
  const colors = themeColors(dark);
  const style = {
    success: {
      icon: "checkmark-circle" as const,
      color: colors.success,
      background: colors.successSoft,
    },
    error: {
      icon: "alert-circle" as const,
      color: colors.danger,
      background: colors.primarySoft,
    },
    info: {
      icon: "information-circle" as const,
      color: colors.primary,
      background: colors.primarySoft,
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
            backgroundColor: colors.surface,
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
              color: colors.ink,
              fontSize: 19,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: 14,
              lineHeight: 21,
              textAlign: "center",
              marginTop: 8,
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
              backgroundColor: colors.primary,
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
