import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { themeColors } from "../../src/theme/theme";
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { dark } = useApp();
  const colors = themeColors(dark);
  return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.subtle,
          tabBarStyle: {
            height: 56 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopColor: colors.line,
            backgroundColor: colors.surface,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Explore",
            tabBarAccessibilityLabel: "Explore buses",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="navigate-circle"
                color={
                  typeof color === "number" ? colors.primary : (color ?? colors.primary)
                }
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: "Saved",
            tabBarAccessibilityLabel: "Saved buses",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="heart"
                color={
                  typeof color === "number" ? colors.primary : (color ?? colors.primary)
                }
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tickets"
          options={{
            title: "Tickets",
            tabBarAccessibilityLabel: "Your tickets",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="ticket-outline"
                color={typeof color === "number" ? colors.primary : color ?? colors.primary}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarAccessibilityLabel: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="options"
                color={
                  typeof color === "number" ? colors.primary : (color ?? colors.primary)
                }
                size={size}
              />
            ),
          }}
        />
      </Tabs>
  );
}
