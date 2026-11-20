import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { request } from "../lib/api";
import { setPaletteDarkMode } from "../theme/theme";
type User = {
  id: string;
  name: string;
  email: string;
  role: "driver" | "admin" | "passenger";
};
type Ctx = {
  user: User | null;
  token: string | null;
  ready: boolean;
  dark: boolean;
  setDark: (enabled: boolean) => void;
  setupComplete: boolean;
  onboardingDone: boolean;
  completeOnboarding: () => Promise<void>;
  completeSetup: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: number;
  reload: () => void;
};
const C = createContext<Ctx>(null as any);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [token, setToken] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [setupComplete, setSetupComplete] = useState(false),
    [onboardingDone, setOnboardingDone] = useState(false),
    [dark, setDarkState] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const onboarded = await AsyncStorage.getItem("ops_onboarding_done");
        setOnboardingDone(onboarded === "true");
        const [u, t, savedDarkMode] = await Promise.all([
          AsyncStorage.getItem("ops_user"),
          AsyncStorage.getItem("ops_token"),
          AsyncStorage.getItem("ops_dark_mode"),
        ]);
        if (savedDarkMode === "true" || savedDarkMode === "false") {
          const enabled = savedDarkMode === "true";
          setDarkState(enabled);
          setPaletteDarkMode(enabled);
        }
        if (u && t) {
          const restoredUser = JSON.parse(u) as User;
          setUser(restoredUser);
          setToken(t);
          setSetupComplete(
            (await AsyncStorage.getItem(`ops_setup_complete:${restoredUser.id}`)) ===
              "true",
          );
        }
      } catch (error) {
        console.warn(
          "Could not restore the operations session.",
          error instanceof Error ? error.message : error,
        );
      } finally {
        setReady(true);
      }
    })();
  }, []);
  const login = async (email: string, password: string) => {
    const d = await request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!["driver", "admin"].includes(d.user.role))
      throw new Error("This app is for drivers and administrators.");
    const completed =
      (await AsyncStorage.getItem(`ops_setup_complete:${d.user.id}`)) === "true";
    await Promise.all([
      AsyncStorage.setItem("ops_user", JSON.stringify(d.user)),
      AsyncStorage.setItem("ops_token", d.token),
    ]);
    setUser(d.user);
    setToken(d.token);
    setSetupComplete(completed);
    return !completed;
  };
  const completeOnboarding = async () => {
    await AsyncStorage.setItem("ops_onboarding_done", "true");
    setOnboardingDone(true);
  };
  const completeSetup = async () => {
    if (!user) throw new Error("Sign in before completing app setup.");
    await AsyncStorage.setItem(`ops_setup_complete:${user.id}`, "true");
    setSetupComplete(true);
  };
  const setDark = (enabled: boolean) => {
    setDarkState(enabled);
    setPaletteDarkMode(enabled);
    void AsyncStorage.setItem("ops_dark_mode", String(enabled)).catch((error) =>
      console.warn(
        "Could not save appearance preference.",
        error instanceof Error ? error.message : error,
      ),
    );
  };
  const logout = async () => {
    await AsyncStorage.multiRemove(["ops_user", "ops_token"]);
    setUser(null);
    setToken(null);
  };
  return (
    <C.Provider
      value={{
        user,
        token,
        ready,
        dark,
        setDark,
        setupComplete,
        onboardingDone,
        completeOnboarding,
        completeSetup,
        login,
        logout,
        refresh,
        reload: () => setRefresh((x) => x + 1),
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useApp = () => useContext(C);
