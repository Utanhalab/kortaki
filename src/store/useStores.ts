import { create } from "zustand";
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
  toggleSave: (id: number) => void;
};

export const useShopStore = create<ShopState>((set) => ({
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
  toggleSave: (id) =>
    set((s) => ({
      saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id],
    })),
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
  status: "upcoming" | "past" | "cancelled";
};

type BookingState = {
  selectedService: string | null;
  selectedBarber: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  bookings: Booking[];
  setService: (s: string | null) => void;
  setBarber: (b: string | null) => void;
  setDate: (d: string | null) => void;
  setTime: (t: string | null) => void;
  reset: () => void;
  addBooking: (b: Booking) => void;
  cancelBooking: (id: string) => void;
};

export const useBookingStore = create<BookingState>((set) => ({
  selectedService: null,
  selectedBarber: null,
  selectedDate: null,
  selectedTime: null,
  bookings: [],
  setService: (selectedService) => set({ selectedService }),
  setBarber: (selectedBarber) => set({ selectedBarber }),
  setDate: (selectedDate) => set({ selectedDate }),
  setTime: (selectedTime) => set({ selectedTime }),
  reset: () => set({ selectedService: null, selectedBarber: null, selectedDate: null, selectedTime: null }),
  addBooking: (b) => set((s) => ({ bookings: [b, ...s.bookings] })),
  cancelBooking: (id) =>
    set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)) })),
}));
