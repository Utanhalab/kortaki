import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, getClientName } from "@/lib/clientId";

export type QueueEntry = {
  id: string;
  shop_id: number;
  client_id: string;
  customer_name: string;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  barber_name: string | null;
  position: number;
  status: "waiting" | "called" | "serving" | "done" | "left" | "removed";
  notify_at_position: number;
  joined_at: string;
  called_at: string | null;
  done_at: string | null;
  removed_reason: string | null;
};

export type QueueSettings = {
  shop_id: number;
  is_open: boolean;
  max_size: number;
  avg_cut_minutes: number;
  updated_at: string;
};

export type QueueActivity = {
  id: string;
  shop_id: number;
  kind: "joined" | "finished" | "left" | "called" | "removed" | "paused" | "resumed";
  message: string;
  created_at: string;
};

type ShopSummary = { count: number; avgWait: number; isOpen: boolean; maxSize: number };

type QueueStore = {
  entries: QueueEntry[]; // for currently viewed shop
  settings: QueueSettings | null; // for currently viewed shop
  activity: QueueActivity[]; // for currently viewed shop
  summaries: Record<number, ShopSummary>; // by shop id, for cards
  myEntries: QueueEntry[]; // user's active entries across shops
  loadShop: (shopId: number) => Promise<void>;
  loadSummaries: (shopIds: number[]) => Promise<void>;
  loadMyEntries: () => Promise<void>;
  joinQueue: (args: {
    shopId: number;
    serviceName: string;
    servicePrice: number;
    serviceDuration: number;
    barberName: string | null;
    notify: boolean;
    customerName?: string;
  }) => Promise<QueueEntry | null>;
  leaveQueue: (entryId: string) => Promise<void>;
  callNext: (shopId: number) => Promise<void>;
  removeEntry: (entryId: string, reason: string) => Promise<void>;
  setQueueOpen: (shopId: number, open: boolean) => Promise<void>;
  updateSettings: (shopId: number, patch: Partial<QueueSettings>) => Promise<void>;
  subscribeShop: (shopId: number) => () => void;
  subscribeMine: () => () => void;
};

async function logActivity(shopId: number, kind: QueueActivity["kind"], message: string) {
  await supabase.from("queue_activity").insert({ shop_id: shopId, kind, message });
}

async function ensureSettings(shopId: number): Promise<QueueSettings> {
  const { data } = await supabase
    .from("queue_settings")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();
  if (data) return data as QueueSettings;
  const { data: ins } = await supabase
    .from("queue_settings")
    .insert({ shop_id: shopId })
    .select()
    .single();
  return ins as QueueSettings;
}

async function recomputePositions(shopId: number) {
  const { data } = await supabase
    .from("queue_entries")
    .select("id, joined_at")
    .eq("shop_id", shopId)
    .in("status", ["waiting", "called"])
    .order("joined_at", { ascending: true });
  if (!data) return;
  await Promise.all(
    data.map((row, idx) =>
      supabase.from("queue_entries").update({ position: idx + 1 }).eq("id", row.id),
    ),
  );
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  entries: [],
  settings: null,
  activity: [],
  summaries: {},
  myEntries: [],

  async loadShop(shopId) {
    const [entriesRes, settings, actRes] = await Promise.all([
      supabase
        .from("queue_entries")
        .select("*")
        .eq("shop_id", shopId)
        .in("status", ["waiting", "called", "serving"])
        .order("position", { ascending: true }),
      ensureSettings(shopId),
      supabase
        .from("queue_activity")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    set({
      entries: (entriesRes.data ?? []) as QueueEntry[],
      settings,
      activity: (actRes.data ?? []) as QueueActivity[],
    });
  },

  async loadSummaries(shopIds) {
    if (!shopIds.length) return;
    const [entriesRes, settingsRes] = await Promise.all([
      supabase
        .from("queue_entries")
        .select("shop_id, service_duration_minutes")
        .in("shop_id", shopIds)
        .in("status", ["waiting", "called"]),
      supabase.from("queue_settings").select("*").in("shop_id", shopIds),
    ]);
    const summaries: Record<number, ShopSummary> = {};
    const settingsMap = new Map<number, QueueSettings>();
    (settingsRes.data ?? []).forEach((s) => settingsMap.set(s.shop_id, s as QueueSettings));
    for (const id of shopIds) {
      const s = settingsMap.get(id);
      const rows = (entriesRes.data ?? []).filter((r) => r.shop_id === id);
      const avg = s?.avg_cut_minutes ?? 20;
      summaries[id] = {
        count: rows.length,
        avgWait: rows.length * avg,
        isOpen: s?.is_open ?? true,
        maxSize: s?.max_size ?? 15,
      };
    }
    set((st) => ({ summaries: { ...st.summaries, ...summaries } }));
  },

  async loadMyEntries() {
    const clientId = getClientId();
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("client_id", clientId)
      .in("status", ["waiting", "called", "serving"])
      .order("joined_at", { ascending: false });
    set({ myEntries: (data ?? []) as QueueEntry[] });
  },

  async joinQueue({ shopId, serviceName, servicePrice, serviceDuration, barberName, notify, customerName }) {
    const clientId = getClientId();
    const name = customerName || getClientName();
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) throw new Error("Precisas de iniciar sessão para entrar na fila");
    const settings = await ensureSettings(shopId);
    if (!settings.is_open) throw new Error("A fila está em pausa");

    const { data: existing } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("shop_id", shopId)
      .in("status", ["waiting", "called"]);
    if ((existing?.length ?? 0) >= settings.max_size) throw new Error("Fila cheia");

    const pos = (existing?.length ?? 0) + 1;
    const { data, error } = await supabase
      .from("queue_entries")
      .insert({
        shop_id: shopId,
        client_id: clientId,
        user_id: uid,
        customer_name: name,
        service_name: serviceName,
        service_price: servicePrice,
        service_duration_minutes: serviceDuration,
        barber_name: barberName,
        position: pos,
        notify_at_position: notify ? 2 : 0,
      })
      .select()
      .single();
    if (error) throw error;
    await logActivity(shopId, "joined", `${name} entrou na fila`);
    return data as QueueEntry;
  },

  async leaveQueue(entryId) {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("id", entryId)
      .single();
    if (!data) return;
    await supabase.from("queue_entries").update({ status: "left" }).eq("id", entryId);
    await logActivity(data.shop_id, "left", `${data.customer_name} saiu da fila`);
    await recomputePositions(data.shop_id);
  },

  async callNext(shopId) {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("shop_id", shopId)
      .eq("status", "waiting")
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data) return;
    await supabase
      .from("queue_entries")
      .update({ status: "called", called_at: new Date().toISOString() })
      .eq("id", data.id);
    await logActivity(shopId, "called", `${data.customer_name} foi chamado(a)`);

    // Mark anyone "called" before as done implicitly when a new one is called? Keep simple: previous "called" becomes done.
    await supabase
      .from("queue_entries")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("shop_id", shopId)
      .eq("status", "called")
      .neq("id", data.id);

    await recomputePositions(shopId);
  },

  async removeEntry(entryId, reason) {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("id", entryId)
      .single();
    if (!data) return;
    await supabase
      .from("queue_entries")
      .update({ status: "removed", removed_reason: reason })
      .eq("id", entryId);
    await logActivity(data.shop_id, "removed", `${data.customer_name} removido(a) (${reason})`);
    await recomputePositions(data.shop_id);
  },

  async setQueueOpen(shopId, open) {
    await ensureSettings(shopId);
    await supabase
      .from("queue_settings")
      .update({ is_open: open, updated_at: new Date().toISOString() })
      .eq("shop_id", shopId);
    await logActivity(shopId, open ? "resumed" : "paused", open ? "Fila reaberta" : "Fila em pausa");
  },

  async updateSettings(shopId, patch) {
    await ensureSettings(shopId);
    await supabase
      .from("queue_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("shop_id", shopId);
  },

  subscribeShop(shopId) {
    const channel = supabase
      .channel(`queue-shop-${shopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries", filter: `shop_id=eq.${shopId}` },
        () => get().loadShop(shopId).then(() => get().loadMyEntries()),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_settings", filter: `shop_id=eq.${shopId}` },
        () => get().loadShop(shopId),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "queue_activity", filter: `shop_id=eq.${shopId}` },
        (payload) =>
          set((st) => ({
            activity: [payload.new as QueueActivity, ...st.activity].slice(0, 5),
          })),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeMine() {
    const clientId = getClientId();
    const channel = supabase
      .channel(`queue-mine-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries", filter: `client_id=eq.${clientId}` },
        () => get().loadMyEntries(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
