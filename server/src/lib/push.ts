import { existsSync } from "node:fs";
import path from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { prisma } from "./prisma";

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
  path.resolve(__dirname, "../../service-account.json");

let messaging: Messaging | null = null;

if (existsSync(serviceAccountPath)) {
  messaging = getMessaging(initializeApp({ credential: cert(serviceAccountPath) }));
} else {
  console.warn(`push: service account not found at ${serviceAccountPath}, notifications disabled`);
}

export function pushEnabled() {
  return messaging !== null;
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<number> {
  if (!messaging) return 0;
  const tokens = await prisma.deviceToken.findMany({ where: { userId } });
  if (tokens.length === 0) return 0;

  const result = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.fcmToken),
    notification: { title, body },
    data,
    android: { priority: "high" },
  });

  // Firebase reports tokens that no longer exist (app uninstalled, token
  // rotated) — drop them so we stop sending to dead devices.
  const stale = tokens.filter((_, i) => {
    const err = result.responses[i].error;
    return (
      err?.code === "messaging/registration-token-not-registered" ||
      err?.code === "messaging/invalid-argument"
    );
  });
  if (stale.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { id: { in: stale.map((t) => t.id) } } });
  }

  return result.successCount;
}
