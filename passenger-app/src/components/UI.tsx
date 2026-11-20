import React from "react";
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { useApp } from "../context/AppContext";
import { palette, themeColors } from "../theme/theme";

type ButtonProps = {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const { dark } = useApp();
  const colors = themeColors(dark);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: colors.primary },
        secondary && styles.secondaryButton,
        secondary && {
          backgroundColor: colors.primarySoft,
          borderColor: colors.line,
        },
        (disabled || loading) && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : "#fff"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: "#fff" },
            secondary && styles.secondaryButtonText,
            secondary && { color: colors.primary },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
}: FieldProps) {
  const { dark } = useApp();
  const colors = themeColors(dark);
  return (
    <View style={{ gap: 7 }}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        autoCorrect={keyboardType !== "email-address" && !secureTextEntry}
        style={[
          styles.input,
          {
            color: colors.ink,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { dark } = useApp();
  const colors = themeColors(dark);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { dark } = useApp();
  const colors = themeColors(dark);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    backgroundColor: palette.primary,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButton: {
    backgroundColor: "#EFF4FF",
    borderWidth: 1,
    borderColor: "#D6E4FF",
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: palette.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAECF0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink,
  },
  actionText: {
    color: palette.primary,
    fontWeight: "700",
  },
});
