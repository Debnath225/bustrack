import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
} from "react-native";
import { palette as p } from "../theme/theme";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: p.card,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: p.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Txt({
  children,
  size = 14,
  bold = false,
  color = p.ink,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        { fontSize: size, color, fontWeight: bold ? "700" : "400", flexShrink: 1 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  kind = "primary",
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "soft" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg = kind === "primary" ? p.brand : kind === "danger" ? p.redSoft : p.brandSoft;
  const fg = kind === "soft" ? p.brand : kind === "danger" ? p.red : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        minHeight: 50,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Txt color={fg} bold style={{ textAlign: "center" }}>
          {title}
        </Txt>
      )}
    </Pressable>
  );
}

export function ToggleSwitch({
  value,
  onValueChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{
        width: 52,
        height: 30,
        borderRadius: 16,
        padding: 3,
        justifyContent: "center",
        backgroundColor: value ? p.brand : p.line,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#FFFFFF",
          alignSelf: value ? "flex-end" : "flex-start",
        }}
      />
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Txt bold size={13}>{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA4B2"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        autoCorrect={keyboardType !== "email-address" && !secureTextEntry}
        style={{
          backgroundColor: p.bg,
          borderWidth: 1,
          borderColor: p.line,
          borderRadius: 13,
          paddingHorizontal: 14,
          paddingVertical: 13,
          color: p.ink,
          fontSize: 15,
        }}
      />
    </View>
  );
}

export function Pill({ label, color = p.green }: { label: string; color?: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: `${color}18`,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 30,
      }}
    >
      <Txt color={color} bold size={11}>{label}</Txt>
    </View>
  );
}
