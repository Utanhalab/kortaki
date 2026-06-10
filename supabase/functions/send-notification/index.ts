// Sends a Web Push to every subscription for a user, and logs the notification.
// Body: { user_id, title, body, type, icon?, actions?, data?, vibrate?, shop_id?, skip_log? }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:hello@cutnear.ao", VAPID_PUBLIC, VAPID_PRIVATE);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const Body = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  type: z.string().min(1).max(64),
  icon: z.string().optional(),
  shop_id: z.number().int().optional(),
  data: z.record(z.unknown()).optional(),
  vibrate: z.array(z.number()).optional(),
  actions: z.array(z.object({ action: z.string(), title: z.string() })).optional(),
  url: z.string().optional(),
  skip_log: z.boolean().optional(),
});

async function dispatch(input: z.infer<typeof Body>) {
  const { user_id, title, body, type, icon, shop_id, data, vibrate, actions, url, skip_log } = input;

  if (!skip_log) {
    await admin.from("notifications").insert({
      user_id,
      shop_id: shop_id ?? null,
      type,
      title,
      body,
      data: { ...(data ?? {}), url },
    });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { sent: 0, skipped: true, reason: "VAPID keys not configured" };
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id);
  if (!subs || subs.length === 0) return { sent: 0 };

  const payload = JSON.stringify({
    title,
    body,
    icon: icon ?? "/icon.svg",
    actions,
    data: { type, url: url ?? "/", vibrate, ...(data ?? {}) },
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("push error", err?.statusCode, err?.body);
        }
      }
    }),
  );
  return { sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await dispatch(parsed.data);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
