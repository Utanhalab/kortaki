import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FN_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufToBase64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

async function fetchVapidPublicKey(): Promise<string> {
  const r = await fetch(`${FN_BASE}/get-vapid-public-key`, {
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
  });
  const j = await r.json().catch(() => ({}));
  return j.publicKey ?? "";
}

export type PushStatus = "unsupported" | "denied" | "default" | "granted" | "loading";

export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [subscribed, setSubscribed] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PushStatus);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!user) throw new Error("Inicie sessão para activar notificações");
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("O seu dispositivo não suporta notificações push");
    }
    const perm = await Notification.requestPermission();
    setStatus(perm as PushStatus);
    if (perm !== "granted") throw new Error("Permissão negada");

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) throw new Error("VAPID_PUBLIC_KEY ainda não configurado");
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = sub.toJSON();
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? bufToBase64(sub.getKey("p256dh")),
        auth: json.keys?.auth ?? bufToBase64(sub.getKey("auth")),
        user_agent: navigator.userAgent.slice(0, 200),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
    setSubscribed(true);
    return sub;
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", sub.endpoint);
      }
      setSubscribed(false);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  return { status, subscribed, subscribe, unsubscribe, refresh };
}

export async function sendNotification(payload: {
  user_id: string;
  title: string;
  body: string;
  type: string;
  url?: string;
  shop_id?: number;
  data?: Record<string, unknown>;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  await fetch(`${FN_BASE}/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${session?.access_token ?? ANON}`,
    },
    body: JSON.stringify(payload),
  });
}
