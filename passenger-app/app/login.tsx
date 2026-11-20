import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, saveToken } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import { Button, Field } from "../src/components/UI";
import { SafeAreaView } from "react-native-safe-area-context";
import { themeColors } from "../src/theme/theme";
export default function Login() {
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const { setUser, dark } = useApp();
  const colors = themeColors(dark);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<any>(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(
          register ? { name, email, password } : { email, password },
        ),
      });
      await saveToken(r.data.token);
      setUser(r.data.user);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Could not sign in", e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 24, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        >
          <Ionicons name="close" size={26} color={colors.muted} />
        </Pressable>
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="bus" size={32} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 30, fontWeight: "900", color: colors.ink }}>
          {register ? "Create your account" : "Welcome back"}
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>
          {register
            ? "Create a passenger account to save your favourite buses."
            : "Sign in to manage your saved buses and preferences."}
        </Text>
        {register && (
          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
        )}
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
        />
        <Button
          title={register ? "Create account" : "Sign in"}
          onPress={submit}
          loading={busy}
        />
        <Pressable onPress={() => setRegister(!register)}>
          <Text
            style={{ textAlign: "center", color: colors.primary, fontWeight: "800" }}
          >
            {register
              ? "Already have an account? Sign in"
              : "New to BusTrack? Create an account"}
          </Text>
        </Pressable>
        <Text
          style={{
            fontSize: 12,
            color: colors.subtle,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          Accounts are stored in your local MySQL database. Use this only on
          your trusted local network.
        </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
