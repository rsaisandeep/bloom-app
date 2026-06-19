// SERVER-ONLY — do not import from client components or 'use client' files
import webpush, { PushSubscription, RequestOptions } from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const mailto = process.env.VAPID_MAILTO;

if (!publicKey || !privateKey || !mailto) {
  throw new Error(
    "Missing VAPID env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_MAILTO must all be set."
  );
}

webpush.setVapidDetails(`mailto:${mailto}`, publicKey, privateKey);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
  options?: RequestOptions
): Promise<void> {
  await webpush.sendNotification(
    subscription,
    JSON.stringify(payload),
    options
  );
}

export { publicKey as VAPID_PUBLIC_KEY };
