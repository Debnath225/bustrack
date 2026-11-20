import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing } from "../theme/theme";

/** Fades and slides children in once on mount. Use `delay` to stagger lists. */
export function FadeIn({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Gives buttons and cards a springy press response. */
export function PressScale({
  onPress,
  children,
  style,
  disabled,
  accessibilityLabel,
  accessibilityRole = "button",
  hitSlop,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "tab";
  hitSlop?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onPressIn={() => springTo(0.97)}
      onPressOut={() => springTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Shimmering placeholder shown while data loads. */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radius.sm,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: colors.line, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
        style,
      ]}
    />
  );
}

/** Animated horizontal bar. value is clamped to 0..1. */
export function ProgressBar({
  value,
  color,
  height = 8,
  trackColor,
}: {
  value: number;
  color?: string;
  height?: number;
  trackColor?: string;
}) {
  const colors = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  useEffect(() => {
    Animated.timing(width, { toValue: clamped, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [clamped, width]);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: trackColor ?? colors.line, overflow: "hidden" }}>
      <Animated.View
        style={{
          height,
          borderRadius: height,
          backgroundColor: color ?? colors.primary,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  const colors = useTheme();
  const accent = color ?? colors.primary;
  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? accent : colors.border,
        backgroundColor: active ? accent : colors.surface,
      }}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? "#FFFFFF" : colors.muted} /> : null}
      <Text style={{ color: active ? "#FFFFFF" : colors.ink, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </PressScale>
  );
}

export function Toggle({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
}) {
  const colors = useTheme();
  const knob = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(knob, { toValue: value ? 1 : 0, useNativeDriver: true, speed: 24, bounciness: 6 }).start();
  }, [value, knob]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: value ? colors.primary : colors.border, justifyContent: "center" }}
    >
      <Animated.View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#FFFFFF",
          transform: [{ translateX: knob.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
        }}
      />
    </Pressable>
  );
}

/** Bottom sheet with a spring-like slide and backdrop fade. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const colors = useTheme();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = React.useState(visible);
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, mounted, slide]);
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", opacity: slide }}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: height * 0.8,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          padding: spacing.xl,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
        }}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "700" }}>{title}</Text>
        {children}
      </Animated.View>
    </Modal>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const colors = useTheme();
  return (
    <FadeIn style={{ alignItems: "center", gap: 10, padding: spacing.xl }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "700", textAlign: "center" }}>{title}</Text>
      {body ? <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 20 }}>{body}</Text> : null}
      {action}
    </FadeIn>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.line,
          shadowColor: "#0B1220",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const colors = useTheme();
  return <Text style={[{ color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 }, style]}>{children}</Text>;
}
