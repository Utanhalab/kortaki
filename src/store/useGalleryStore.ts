import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type StyleCategory = {
  id: string;
  slug: string;
  name_pt: string;
  icon: string | null;
  position: number;
};

export type StylePhoto = {
  id: string;
  barber_id: string;
  shop_id: number;
  category_id: string | null;
  service_id: string | null;
  storage_path: string;
  public_url: string;
  style_name: string;
  description: string | null;
  tags: string[];
  is_public: boolean;
  is_featured: boolean;
  view_count: number;
  save_count: number;
  booking_count: number;
  created_at: string;
  // hydrated joins
  barber_name?: string;
  barber_avatar?: string | null;
  shop_name?: string;
  category_slug?: string;
  weekly_bookings?: number;
};

export type SearchResults = {
  styles: StylePhoto[];
  barbers: { id: string; name: string; avatar_url: string | null; shop_id: number }[];
  shops: { id: number; name: string }[];
};

export type StyleMeta = {
  categoryId: string;
  styleName: string;
  description?: string;
  tags?: string[];
  serviceId?: string;
  shopId: number;
  isPublic?: boolean;
};

type GalleryStore = {
  photos: StylePhoto[];
  trending: StylePhoto[];
  categories: StyleCategory[];
  activeCategory: string;
  searchQuery: string;
  searchResults: SearchResults;
  savedStyleIds: Set<string>;
  savedPhotos: StylePhoto[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  recentSearches: string[];

  fetchCategories: () => Promise<void>;
  fetchPhotos: (categorySlug: string, page: number) => Promise<void>;
  fetchTrending: () => Promise<void>;
  fetchByShop: (shopId: number, limit?: number) => Promise<StylePhoto[]>;
  fetchByBarber: (barberId: string) => Promise<StylePhoto[]>;
  getPhoto: (id: string) => Promise<StylePhoto | null>;
  getSimilar: (photo: StylePhoto, limit?: number) => Promise<StylePhoto[]>;
  search: (query: string) => Promise<void>;
  pushRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  removeRecentSearch: (q: string) => void;
  saveStyle: (photoId: string) => Promise<void>;
  unsaveStyle: (photoId: string) => Promise<void>;
  fetchSaved: () => Promise<void>;
  incrementView: (photoId: string) => Promise<void>;
  uploadStyle: (barberId: string, file: File, meta: StyleMeta) => Promise<StylePhoto | null>;
  setActiveCategory: (cat: string) => void;
};

const PAGE_SIZE = 12;
const RECENT_KEY = "cutnear.recentSearches";

const loadRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveRecent = (list: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
  } catch {}
};

const hydrate = async (rows: any[]): Promise<StylePhoto[]> => {
  if (!rows.length) return [];
  const barberIds = Array.from(new Set(rows.map((r) => r.barber_id).filter(Boolean)));
  const { data: barbers } = await supabase
    .from("barbers")
    .select("id, name, avatar_url, shop_id")
    .in("id", barberIds);
  const bMap = new Map((barbers ?? []).map((b) => [b.id, b]));

  // shop names from local data
  const { shops } = await import("@/data/shops");
  const sMap = new Map(shops.map((s) => [s.id, s.name]));

  const cats = useGalleryStore.getState().categories;
  const cMap = new Map(cats.map((c) => [c.id, c.slug]));

  return rows.map((r) => ({
    ...r,
    barber_name: bMap.get(r.barber_id)?.name,
    barber_avatar: bMap.get(r.barber_id)?.avatar_url ?? null,
    shop_name: sMap.get(r.shop_id),
    category_slug: r.category_id ? cMap.get(r.category_id) : undefined,
  })) as StylePhoto[];
};

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  photos: [],
  trending: [],
  categories: [],
  activeCategory: "trending",
  searchQuery: "",
  searchResults: { styles: [], barbers: [], shops: [] },
  savedStyleIds: new Set(),
  savedPhotos: [],
  isLoading: false,
  hasMore: true,
  page: 0,
  recentSearches: loadRecent(),

  setActiveCategory: (cat) => set({ activeCategory: cat, photos: [], page: 0, hasMore: true }),

  async fetchCategories() {
    const { data } = await supabase
      .from("style_categories")
      .select("*")
      .order("position", { ascending: true });
    set({ categories: (data ?? []) as StyleCategory[] });
  },

  async fetchPhotos(categorySlug, page) {
    set({ isLoading: true });
    let query = supabase
      .from("style_photos")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (categorySlug && categorySlug !== "trending" && categorySlug !== "all") {
      const cat = get().categories.find((c) => c.slug === categorySlug);
      if (cat) query = query.eq("category_id", cat.id);
    }

    const { data, error } = await query;
    if (error) {
      set({ isLoading: false });
      return;
    }
    const hydrated = await hydrate(data ?? []);
    set((s) => ({
      photos: page === 0 ? hydrated : [...s.photos, ...hydrated],
      page,
      hasMore: (data?.length ?? 0) === PAGE_SIZE,
      isLoading: false,
    }));
  },

  async fetchTrending() {
    const { data: trendingRows } = await supabase
      .from("style_trending")
      .select("style_photo_id, weekly_bookings")
      .order("trending_score", { ascending: false })
      .limit(10);

    let photos: StylePhoto[] = [];
    if (trendingRows?.length) {
      const ids = trendingRows.map((r) => r.style_photo_id);
      const { data: photoRows } = await supabase
        .from("style_photos")
        .select("*")
        .in("id", ids)
        .eq("is_public", true);
      const wkMap = new Map(trendingRows.map((r) => [r.style_photo_id, r.weekly_bookings]));
      const ordered = (photoRows ?? []).sort(
        (a, b) => (wkMap.get(b.id) ?? 0) - (wkMap.get(a.id) ?? 0),
      );
      photos = (await hydrate(ordered)).map((p) => ({
        ...p,
        weekly_bookings: wkMap.get(p.id) ?? 0,
      }));
    }

    // Fallback: most viewed
    if (photos.length === 0) {
      const { data } = await supabase
        .from("style_photos")
        .select("*")
        .eq("is_public", true)
        .order("view_count", { ascending: false })
        .limit(10);
      photos = await hydrate(data ?? []);
    }
    set({ trending: photos });
  },

  async fetchByShop(shopId, limit = 6) {
    const { data } = await supabase
      .from("style_photos")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    return hydrate(data ?? []);
  },

  async fetchByBarber(barberId) {
    const { data } = await supabase
      .from("style_photos")
      .select("*")
      .eq("barber_id", barberId)
      .order("created_at", { ascending: false });
    return hydrate(data ?? []);
  },

  async getPhoto(id) {
    const { data } = await supabase.from("style_photos").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    const [hydrated] = await hydrate([data]);
    return hydrated;
  },

  async getSimilar(photo, limit = 4) {
    if (!photo.category_id) return [];
    const { data } = await supabase
      .from("style_photos")
      .select("*")
      .eq("category_id", photo.category_id)
      .eq("is_public", true)
      .neq("id", photo.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    return hydrate(data ?? []);
  },

  async search(query) {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({ searchResults: { styles: [], barbers: [], shops: [] } });
      return;
    }
    const q = query.trim();
    const like = `%${q}%`;

    const [stylesRes, barbersRes] = await Promise.all([
      supabase
        .from("style_photos")
        .select("*")
        .eq("is_public", true)
        .or(`style_name.ilike.${like},description.ilike.${like}`)
        .limit(12),
      supabase
        .from("barbers")
        .select("id, name, avatar_url, shop_id")
        .ilike("name", like)
        .limit(8),
    ]);

    const { shops } = await import("@/data/shops");
    const shopHits = shops
      .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 6)
      .map((s) => ({ id: s.id, name: s.name }));

    set({
      searchResults: {
        styles: await hydrate(stylesRes.data ?? []),
        barbers: (barbersRes.data ?? []) as any,
        shops: shopHits,
      },
    });
  },

  pushRecentSearch(q) {
    if (!q.trim()) return;
    const list = [q, ...get().recentSearches.filter((x) => x !== q)].slice(0, 5);
    saveRecent(list);
    set({ recentSearches: list });
  },

  clearRecentSearches() {
    saveRecent([]);
    set({ recentSearches: [] });
  },

  removeRecentSearch(q) {
    const list = get().recentSearches.filter((x) => x !== q);
    saveRecent(list);
    set({ recentSearches: list });
  },

  async saveStyle(photoId) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("saved_styles").insert({ user_id: u.user.id, style_photo_id: photoId });
    const next = new Set(get().savedStyleIds);
    next.add(photoId);
    set({ savedStyleIds: next });
  },

  async unsaveStyle(photoId) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase
      .from("saved_styles")
      .delete()
      .eq("user_id", u.user.id)
      .eq("style_photo_id", photoId);
    const next = new Set(get().savedStyleIds);
    next.delete(photoId);
    set({
      savedStyleIds: next,
      savedPhotos: get().savedPhotos.filter((p) => p.id !== photoId),
    });
  },

  async fetchSaved() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      set({ savedPhotos: [], savedStyleIds: new Set() });
      return;
    }
    const { data } = await supabase
      .from("saved_styles")
      .select("style_photo_id, style_photos(*)")
      .eq("user_id", u.user.id)
      .order("saved_at", { ascending: false });
    const rows = (data ?? []).map((r: any) => r.style_photos).filter(Boolean);
    const hydrated = await hydrate(rows);
    set({
      savedPhotos: hydrated,
      savedStyleIds: new Set(hydrated.map((p) => p.id)),
    });
  },

  async incrementView(photoId) {
    await supabase.rpc("increment_view_count" as any, { photo_id: photoId });
  },

  async uploadStyle(barberId, file, meta) {
    const photoId = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${barberId}/gallery/${photoId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("portfolios")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;

    const { data: signed } = await supabase.storage
      .from("portfolios")
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    const payload = {
      id: photoId,
      barber_id: barberId,
      shop_id: meta.shopId,
      category_id: meta.categoryId,
      service_id: meta.serviceId ?? null,
      storage_path: path,
      public_url: signed?.signedUrl ?? "",
      style_name: meta.styleName,
      description: meta.description ?? null,
      tags: meta.tags ?? [],
      is_public: meta.isPublic ?? true,
    };

    const { data, error } = await supabase
      .from("style_photos")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;

    const [hydrated] = await hydrate([data]);
    return hydrated;
  },
}));
