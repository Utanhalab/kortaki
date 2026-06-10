import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DbBooking = {
  id: string;
  user_id: string;
  shop_id: number;
  shop_name: string;
  service_name: string;
  barber_name: string | null;
  appointment_at: string;
  price: number;
  status: "confirmed" | "completed" | "cancelled";
  created_at: string;
};

export function useBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setBookings([]); setLoading(false); return; }
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("appointment_at", { ascending: false });
    setBookings((data ?? []) as DbBooking[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`bookings-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const cancel = async (id: string) => {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    refresh();
  };

  return { bookings, loading, refresh, cancel };
}
