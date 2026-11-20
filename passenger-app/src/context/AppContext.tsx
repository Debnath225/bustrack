import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { api, getToken, saveToken } from "../lib/api";
import type { AccentKey } from "../theme/theme";
import type { MapKind } from "../components/BusMap";
import {
  ARRIVAL_REMINDER_RADIUS_METERS,
  ArrivalReminder,
  distanceMeters,
  isArrivalReminder,
} from "../lib/arrivalReminder";

type User = { id: string; name: string; email: string; role: string };
type Prefs = {
  arrivalAlerts: boolean;
  sound: boolean;
  refreshSeconds: number;
  liveTracking: boolean;
  accent: AccentKey;
  mapKind: MapKind;
  showRoutes: boolean;
  showStops: boolean;
};
type ContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
  ready: boolean;
  arrivalReminder: ArrivalReminder | null;
  setArrivalReminder: (reminder: ArrivalReminder | null) => void;
  signOut: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  prefs: Prefs;
  updatePrefs: (prefs: Partial<Prefs>) => void;
  dark: boolean;
  setDark: (enabled: boolean) => void;
};

const USER_KEY = "bustrack.user";
const REMINDER_KEY = "bustrack.arrivalReminder";
const Context = createContext<ContextValue | null>(null);

function logStorageError(error: unknown) {
  console.warn(
    "Could not persist passenger app preferences.",
    error instanceof Error ? error.message : error,
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [arrivalReminder, setArrivalReminderState] =
    useState<ArrivalReminder | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [dark, setDarkState] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    arrivalAlerts: false,
    sound: true,
    refreshSeconds: 5,
    liveTracking: true,
    accent: "ocean",
    mapKind: "standard",
    showRoutes: true,
    showStops: true,
  });

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const [
          storedFavorites,
          storedPrefs,
          storedDark,
          storedUser,
          storedReminder,
          token,
        ] = await Promise.all([
            AsyncStorage.getItem("bustrack.favorites"),
            AsyncStorage.getItem("bustrack.prefs"),
            AsyncStorage.getItem("bustrack.dark"),
            AsyncStorage.getItem(USER_KEY),
            AsyncStorage.getItem(REMINDER_KEY),
            getToken(),
          ]);
        if (!active) return;
        if (storedFavorites) {
          const parsed: unknown = JSON.parse(storedFavorites);
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string"))
            setFavorites(parsed);
        }
        if (storedPrefs) {
          const parsed: unknown = JSON.parse(storedPrefs);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
            setPrefs((current) => ({ ...current, ...parsed }));
        }
        if (storedDark === "true" || storedDark === "false")
          setDarkState(storedDark === "true");
        if (storedReminder) {
          const parsed: unknown = JSON.parse(storedReminder);
          if (isArrivalReminder(parsed)) setArrivalReminderState(parsed);
        }
        if (token && storedUser) {
          const parsed: unknown = JSON.parse(storedUser);
          if (
            parsed &&
            typeof parsed === "object" &&
            "id" in parsed &&
            "name" in parsed &&
            "email" in parsed
          ) {
            setUserState(parsed as User);
          }
        }
      } catch (error) {
        logStorageError(error);
      } finally {
        if (active) setReady(true);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: prefs.sound,
        shouldSetBadge: false,
      }),
    });
  }, [prefs.sound]);

  const processingReminder = useRef<string | null>(null);
  useEffect(() => {
    if (!arrivalReminder || appState !== "active" || !prefs.arrivalAlerts)
      return;

    let active = true;
    let checking = false;
    let lastErrorAt = 0;
    const reminderKey = `${arrivalReminder.busId}:${arrivalReminder.stopIndex}:${arrivalReminder.createdAt}`;
    const checkArrival = async () => {
      if (!active || checking || AppState.currentState !== "active") return;
      checking = true;
      try {
        const response = await api<any>(
          `/api/passenger/bus/${encodeURIComponent(arrivalReminder.busId)}`,
        );
        if (!active) return;
        const bus = response.data?.bus;
        const location = bus?.location;
        const latitude = Number(location?.lat);
        const longitude = Number(location?.lon);
        const recordedAt = location?.recordedAt
          ? new Date(location.recordedAt).getTime()
          : NaN;
        const fresh =
          bus?.isLive === true &&
          Number.isFinite(recordedAt) &&
          Date.now() - recordedAt <= 90_000;
        if (
          !fresh ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180 ||
          distanceMeters(
            { latitude, longitude },
            {
              latitude: arrivalReminder.latitude,
              longitude: arrivalReminder.longitude,
            },
          ) > ARRIVAL_REMINDER_RADIUS_METERS
        ) {
          return;
        }
        if (processingReminder.current === reminderKey) return;
        processingReminder.current = reminderKey;
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Your bus is near",
              body: `${arrivalReminder.busLabel} is near ${arrivalReminder.stopName}. Get ready to board.`,
              sound: prefs.sound ? "default" : undefined,
              data: {
                busId: arrivalReminder.busId,
                stopIndex: arrivalReminder.stopIndex,
              },
            },
            trigger: null,
          });
          if (active) setArrivalReminder(null);
        } catch (error) {
          processingReminder.current = null;
          throw error;
        }
      } catch (error) {
        if (Date.now() - lastErrorAt > 60_000) {
          console.warn(
            "Could not check arrival reminder.",
            error instanceof Error ? error.message : error,
          );
          lastErrorAt = Date.now();
        }
      } finally {
        checking = false;
      }
    };

    void checkArrival();
    const timer = setInterval(() => void checkArrival(), 10_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [arrivalReminder, appState, prefs.arrivalAlerts, prefs.sound]);

  const setUser = (nextUser: User | null) => {
    setUserState(nextUser);
    const save = nextUser
      ? AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      : AsyncStorage.removeItem(USER_KEY);
    void save.catch(logStorageError);
  };

  const setArrivalReminder = (nextReminder: ArrivalReminder | null) => {
    setArrivalReminderState(nextReminder);
    processingReminder.current = null;
    const save = nextReminder
      ? AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(nextReminder))
      : AsyncStorage.removeItem(REMINDER_KEY);
    void save.catch(logStorageError);
  };

  const toggleFavorite = (id: string) =>
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      void AsyncStorage.setItem("bustrack.favorites", JSON.stringify(next)).catch(
        logStorageError,
      );
      return next;
    });

  const updatePrefs = (partial: Partial<Prefs>) =>
    setPrefs((current) => {
      const next = { ...current, ...partial };
      void AsyncStorage.setItem("bustrack.prefs", JSON.stringify(next)).catch(
        logStorageError,
      );
      return next;
    });

  const signOut = async () => {
    await Promise.all([
      saveToken(null),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setUserState(null);
  };

  const setDark = (enabled: boolean) => {
    setDarkState(enabled);
    void AsyncStorage.setItem("bustrack.dark", String(enabled)).catch(
      logStorageError,
    );
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      ready,
      arrivalReminder,
      setArrivalReminder,
      signOut,
      favorites,
      toggleFavorite,
      prefs,
      updatePrefs,
      dark,
      setDark,
    }),
    [user, ready, arrivalReminder, favorites, prefs, dark],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("AppProvider missing");
  return value;
}
