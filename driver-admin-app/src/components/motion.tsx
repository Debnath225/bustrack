import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { palette as p } from "../theme/theme";

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
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function PressScale({
  onPress,
  children,
  style,
  disabled,
  accessibilityLabel,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => springTo(0.97)}
      onPressOut={() => springTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Skeleton({ height = 16, width = "100%", radius = 12 }: { height?: number; width?: number | string; radius?: number }) {
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
      style={{
        height,
        width: width as number,
        borderRadius: radius,
        backgroundColor: p.line,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
      }}
    />
  );
}

export function ProgressBar({ value, color = p.brand }: { value: number; color?: string }) {
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  useEffect(() => {
    Animated.timing(width, { toValue: clamped, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [clamped, width]);
  return (
    <View style={{ height: 8, borderRadius: 8, backgroundColor: p.line, overflow: "hidden" }}>
      <Animated.View
        style={{
          height: 8,
          borderRadius: 8,
          backgroundColor: color,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}

/** Segmented control for switching between two or three options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: p.line, borderRadius: 14, padding: 4 }}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 11,
              alignItems: "center",
              backgroundColor: active ? p.card : "transparent",
            }}
          >
            <Text style={{ color: active ? p.brand : p.muted, fontWeight: "700", fontSize: 13 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
