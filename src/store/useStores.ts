import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { shops as initialShops, type Shop } from "@/data/shops";

export type FilterKey = "all" | "open" | "top" | "nearby" | "budget" | "premium";
export type SortKey = "distance" | "rating" | "price";
export type ViewMode = "list" | "map";

type ShopState = {
  shops: Shop[];
  filter: FilterKey;
  search: string;
  sort: SortKey;
  view: ViewMode;
  saved: number[];
  setFilter: (f: FilterKey) => void;
  setSearch: (s: string) => void;
  setSort: (s: SortKey) => void;
  setView: (v: ViewMode) => void;
  fetchSaved: () => Promise<void>;
  toggleSave: (id: number) => Promise<{ error?: string }>;
};

export const useShopStore = create<ShopState>((set, get) => ({
  shops: initialShops,
  filter: "all",
  search: "",
  sort: "distance",
  view: "list",
  saved: [],
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setSort: (sort) => set({ sort }),
  setView: (view) => set({ view }),

  fetchSaved: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { set({ saved: [] }); return; }
    const { data, error } = await supabase
      .from("saved_shops")
      .select("shop_id")
      .eq("user_id", auth.user.id)
      .order("saved_at", { ascending: false });
    if (!error && data) set({ saved: data.map((r) => r.shop_id) });
  },

  toggleSave: async (id) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "auth" };
    const prev = get().saved;
    const isSaved = prev.includes(id);
    set({ saved: isSaved ? prev.filter((x) => x !== id) : [...prev, id] });
    const { error } = isSaved
      ? await supabase.from("saved_shops").delete().eq("user_id", auth.user.id).eq("shop_id", id)
      : await supabase.from("saved_shops").insert({ user_id: auth.user.id, shop_id: id });
    if (error) { set({ saved: prev }); return { error: error.message }; }
    return {};
  },
}));

export type Booking = {
  id: string;
  shopId: number;
  shopName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  price: number;
  /** Service length in minutes; used for overlap checks. */
  durationMinutes: number;
  status: "upcoming" | "past" | "cancelled";
};

export type BusyRange = { start: number; end: number; barber: string | null };

type NewBooking = Omit<Booking, "id" | "status">;


type BookingState = {
  selectedService: string | null;
  selectedBarber: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  bookings: Booking[];
  loading: boolean;
  setService: (s: string | null) => void;
  setBarber: (b: string | null) => void;
  setDate: (d: string | null) => void;
  setTime: (t: string | null) => void;
  reset: () => void;
  fetchBookings: () => Promise<void>;
  addBooking: (b: NewBooking) => Promise<{ error?: string }>;
  cancelBooking: (id: string) => Promise<{ error?: string }>;
};

function toRow(b: NewBooking, userId: string) {
  return {
    user_id: userId,
    shop_id: b.shopId,
    shop_name: b.shopName,
    service_name: b.service,
    barber_name: b.barber,
    appointment_at: new Date(`${b.date}T${b.time}:00`).toISOString(),
    price: b.price,
    status: "upcoming",
  };
}

type Row = {
  id: string;
  shop_id: number;
  shop_name: string;
  service_name: string;
  barber_name: string | null;
  appointment_at: string;
  price: number;
  status: string;
};

function fromRow(r: Row): Booking {
  const d = new Date(r.appointment_at);
  const status: Booking["status"] =
    r.status === "cancelled"
      ? "cancelled"
      : d.getTime() < Date.now()
        ? "past"
        : "upcoming";
  return {
    id: r.id,
    shopId: r.shop_id,
    shopName: r.shop_name,
    service: r.service_name,
    barber: r.barber_name ?? "Qualquer disponível",
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    price: r.price,
    status,
  };
}

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedService: null,
  selectedBarber: null,
  selectedDate: null,
  selectedTime: null,
  bookings: [],
  loading: false,
  setService: (selectedService) => set({ selectedService }),
  setBarber: (selectedBarber) => set({ selectedBarber }),
  setDate: (selectedDate) => set({ selectedDate }),
  setTime: (selectedTime) => set({ selectedTime }),
  reset: () => set({ selectedService: null, selectedBarber: null, selectedDate: null, selectedTime: null }),

  fetchBookings: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { set({ bookings: [], loading: false }); return; }
    set({ loading: true });
    const { data, error } = await supabase
      .from("bookings")
      .select("id, shop_id, shop_name, service_name, barber_name, appointment_at, price, status")
      .eq("user_id", auth.user.id)
      .order("appointment_at", { ascending: false });
    set({ bookings: error || !data ? [] : (data as Row[]).map(fromRow), loading: false });
  },

  addBooking: async (b) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "auth" };
    const { data, error } = await supabase
      .from("bookings")
      .insert(toRow(b, auth.user.id))
      .select("id, shop_id, shop_name, service_name, barber_name, appointment_at, price, status")
      .single();
    if (error || !data) return { error: error?.message ?? "insert" };
    set({ bookings: [fromRow(data as Row), ...get().bookings] });
    return {};
  },

  cancelBooking: async (id) => {
    const prev = get().bookings;
    set({ bookings: prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)) });
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) { set({ bookings: prev }); return { error: error.message }; }
    return {};
  },
}));

