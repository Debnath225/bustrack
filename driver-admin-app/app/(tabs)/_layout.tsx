import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/context/AppContext";
import { palette as p } from "../../src/theme/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Layout() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.brand,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: p.line,
          backgroundColor: p.card,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="grid-outline"
              size={size}
              color={typeof color === "number" ? p.brand : color ?? p.brand}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: user.role === "admin" ? "Manage" : "Duty",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={user.role === "admin" ? "bus-outline" : "navigate-outline"}
              size={size}
              color={typeof color === "number" ? p.brand : color ?? p.brand}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="fares"
        options={
          user.role === "driver"
            ? {
                title: "Fares",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="cash-outline"
                    size={size}
                    color={typeof color === "number" ? p.brand : color ?? p.brand}
                  />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="bookings"
        options={
          user.role === "driver"
            ? {
                title: "Tickets",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="ticket-outline"
                    size={size}
                    color={typeof color === "number" ? p.brand : color ?? p.brand}
                  />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="activity"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="analytics"
        options={
          user.role === "admin"
            ? {
                title: "Insights",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="bar-chart-outline" size={size} color={typeof color === "number" ? p.brand : color ?? p.brand} />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="drivers"
        options={
          user.role === "admin"
            ? {
                title: "Drivers",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="people-outline" size={size} color={typeof color === "number" ? p.brand : color ?? p.brand} />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={typeof color === "number" ? p.brand : color ?? p.brand}
            />
          ),
        }}
      />
    </Tabs>
  );
}
