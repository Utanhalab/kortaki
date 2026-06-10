// Owner-only: broadcasts a promotional notification to an audience.
// Body: { shop_id, shop_name, message, audience: "saved" | "all" | "recent_30" }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:hello@cutnear.ao", VAPID_PUBLIC, VAPID_PRIVATE);
}
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const Body = z.object({
  shop_id: z.number().int(),
  shop_name: z.string().min(1).max(120),
  message: z.string().min(1).max(120),
  audience: z.enum(["saved", "all", "recent_30"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Auth: caller must be a shop owner of shop_id
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: who } = await userClient.auth.getUser();
    if (!who?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { shop_id, shop_name, message, audience } = parsed.data;

    const { data: ownerRow } = await admin
      .from("shop_owners")
      .select("id")
      .eq("user_id", who.user.id)
      .eq("shop_id", shop_id)
      .maybeSingle();
    if (!ownerRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute audience: collect user_ids from bookings at this shop (saved-shop tracking is client-side only)
    let userIds: string[] = [];
    if (audience === "all" || audience === "saved") {
      const { data } = await admin
        .from("bookings")
        .select("user_id")
        .eq("shop_id", shop_id);
      userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    } else {
      const cutoff = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
      const { data } = await admin
        .from("bookings")
        .select("user_id")
        .eq("shop_id", shop_id)
        .gte("created_at", cutoff);
      userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    }

    // Filter by notification_preferences.promotions == true
    if (userIds.length) {
      const { data: prefs } = await admin
        .from("notification_preferences")
        .select("user_id, promotions")
        .in("user_id", userIds);
      const optedIn = new Set((prefs ?? []).filter((p) => p.promotions).map((p) => p.user_id));
      userIds = userIds.filter((id) => optedIn.has(id) || !prefs?.find((p) => p.user_id === id));
    }

    // Log promotion
    await admin.from("promotion_sends").insert({
      shop_id,
      sent_by: who.user.id,
      message,
      audience_type: audience,
      recipient_count: userIds.length,
    });

    if (!userIds.length) {
      return new Response(JSON.stringify({ recipients: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = `🎉 Oferta em ${shop_name}`;
    const url = `/shop/${shop_id}`;

    // Insert log rows
    await admin.from("notifications").insert(
      userIds.map((uid) => ({
        user_id: uid,
        shop_id,
        type: "promotion",
        title,
        body: message,
        data: { url },
      })),
    );

    let sent = 0;
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      // Get all push subs in batches
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("user_id, id, endpoint, p256dh, auth")
        .in("user_id", userIds);

      const payload = JSON.stringify({
        title,
        body: message,
        icon: "/icon.svg",
        data: { type: "promotion", url },
      });

      // Batches of 50 with 200ms delay
      const BATCH = 50;
      for (let i = 0; i < (subs ?? []).length; i += BATCH) {
        const slice = (subs ?? []).slice(i, i + BATCH);
        await Promise.all(
          slice.map(async (s) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
              );
              sent++;
            } catch (err: any) {
              if (err?.statusCode === 404 || err?.statusCode === 410) {
                await admin.from("push_subscriptions").delete().eq("id", s.id);
              }
            }
          }),
        );
        if (i + BATCH < (subs ?? []).length) await new Promise((r) => setTimeout(r, 200));
      }
    }

    return new Response(JSON.stringify({ recipients: userIds.length, sent }), {
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
