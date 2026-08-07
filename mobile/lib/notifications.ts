import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "./api";

// Remote push does not work inside Expo Go (Android, SDK 53+) — only in a
// real dev/EAS build. expo-notifications is imported lazily so Expo Go never
// loads it (importing it there triggers a warning toast).
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Registers this device for push and routes notification taps. */
export function usePushNotifications(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || isExpoGo) return;

    let sub: { remove(): void } | undefined;
    let cancelled = false;

    (async () => {
      const Notifications = await import("expo-notifications");

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "রিমাইন্ডার",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        const token = await Notifications.getDevicePushTokenAsync();
        await api.post("/devices", { fcmToken: String(token.data), platform: Platform.OS });
      }

      if (cancelled) return;
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const url = response.notification.request.content.data?.url;
        if (typeof url === "string" && url.startsWith("/")) {
          router.push(url as never);
        }
      });
    })().catch(() => {
      // Push is best-effort; never break the app over it.
    });

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);
}
