// Run every 5 minutes via pg_cron. For each upcoming booking inside the 24h / 60min / 15min
// windows, sends a push reminder if it hasn't been sent yet.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

async function notify(payload: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify(payload),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const now = Date.now();
  const windows = [
    {
      type: "reminder_24h",
      target: now + 24 * 3600_000,
      pref: "reminder_24h",
      title: "🗓️ Lembrete para amanhã",
      body: (b: any) => `Tem um corte amanhã às ${fmtTime(b.appointment_at)} em ${b.shop_name}`,
    },
    {
      type: "reminder_60",
      target: now + 60 * 60_000,
      pref: "reminder_60",
      title: "✂️ O seu corte é em 1 hora!",
      body: (b: any) =>
        `${b.service_name} com ${b.barber_name ?? "o barbeiro"} às ${fmtTime(b.appointment_at)} em ${b.shop_name}`,
    },
    {
      type: "reminder_15",
      target: now + 15 * 60_000,
      pref: "reminder_15",
      title: "⏰ Está quase na hora!",
      body: (b: any) => `${b.shop_name} está à sua espera em 15 minutos.`,
    },
  ];

  let total = 0;
  for (const w of windows) {
    const start = new Date(w.target - 2.5 * 60_000).toISOString();
    const end = new Date(w.target + 2.5 * 60_000).toISOString();
    const { data: bookings } = await admin
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("appointment_at", start)
      .lte("appointment_at", end);
    if (!bookings?.length) continue;

    // Filter out those already reminded for this type
    const due = bookings.filter((b) => !(b.reminded_types ?? []).includes(w.type));
    if (!due.length) continue;

    // Check prefs
    const userIds = due.map((b) => b.user_id);
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("user_id, " + w.pref)
      .in("user_id", userIds);
    const allow = new Map((prefs ?? []).map((p: any) => [p.user_id, p[w.pref] !== false]));

    for (const b of due) {
      if (allow.get(b.user_id) === false) continue;
      await notify({
        user_id: b.user_id,
        title: w.title,
        body: w.body(b),
        type: w.type,
        shop_id: b.shop_id,
        url: `/bookings`,
        data: { booking_id: b.id },
      });
      await admin
        .from("bookings")
        .update({ reminded_types: [...(b.reminded_types ?? []), w.type] })
        .eq("id", b.id);
      total++;
    }
  }
  return new Response(JSON.stringify({ sent: total }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
