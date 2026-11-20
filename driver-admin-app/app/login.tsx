import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, Txt } from "../src/components/UI";
import { useApp } from "../src/context/AppContext";
import { palette as p } from "../src/theme/theme";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { login } = useApp();

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const nextEmailError = emailPattern.test(normalizedEmail)
      ? ""
      : "Enter a valid email address.";
    const nextPasswordError =
      password.length >= 8 ? "" : "Password must be at least 8 characters.";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setError("");
    if (nextEmailError || nextPasswordError) return;

    setBusy(true);
    try {
      const needsSetup = await login(normalizedEmail, password);
      router.replace(needsSetup ? "/setup" : "/(tabs)");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not sign in. Check your details and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 22,
            gap: 18,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 10 }}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 19,
                backgroundColor: p.brand,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="bus" size={30} color="#fff" />
            </View>
            <Txt color={p.brand} size={12} bold>
              BUS TRACK INDIA
            </Txt>
            <Txt size={29} bold>
              Operations portal
            </Txt>
            <Txt color={p.muted} style={{ lineHeight: 21 }}>
              Sign in with an account provided or approved by your administrator.
            </Txt>
          </View>

          <Card style={{ gap: 15 }}>
            {error ? (
              <View
                accessibilityRole="alert"
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: p.redSoft,
                }}
              >
                <Ionicons name="alert-circle-outline" size={19} color={p.red} />
                <Txt color={p.red} size={13} style={{ flex: 1, lineHeight: 19 }}>
                  {error}
                </Txt>
              </View>
            ) : null}
            <View style={{ gap: 5 }}>
              <Field
                label="Email address"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setEmailError("");
                  setError("");
                }}
                placeholder="name@example.com"
                keyboardType="email-address"
              />
              {emailError ? (
                <Txt color={p.red} size={12}>
                  {emailError}
                </Txt>
              ) : null}
            </View>
            <View style={{ gap: 5 }}>
              <Field
                label="Password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setPasswordError("");
                  setError("");
                }}
                placeholder="At least 8 characters"
                secureTextEntry
              />
              {passwordError ? (
                <Txt color={p.red} size={12}>
                  {passwordError}
                </Txt>
              ) : null}
            </View>
            <Button
              title="Sign in securely"
              onPress={() => void submit()}
              loading={busy}
              disabled={busy}
            />
            <Txt color={p.muted} size={12} style={{ lineHeight: 18 }}>
              Driver sign-in is enabled only after an administrator approves
              your request and assigns a bus.
            </Txt>
          </Card>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => router.push("/request-access")}
            style={{
              minHeight: 52,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: p.line,
              backgroundColor: p.card,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 9,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Ionicons name="person-add-outline" size={19} color={p.brand} />
            <Txt color={p.brand} bold>
              Request driver access
            </Txt>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/legal")}
            style={{ alignItems: "center", paddingVertical: 3 }}
          >
            <Txt color={p.muted} size={12}>
              Terms & privacy
            </Txt>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
