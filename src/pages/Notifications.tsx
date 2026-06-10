import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, Clock, Gift, Scissors, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type N = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  sent_at: string;
  shop_id: number | null;
};

const TYPE_META: Record<string, { icon: any; tone: string }> = {
  promotion: { icon: Gift, tone: "bg-amber-100 text-amber-700" },
  booking_confirmed: { icon: CheckCheck, tone: "bg-emerald-100 text-emerald-700" },
  booking_cancelled: { icon: X, tone: "bg-red-100 text-red-700" },
  barber_ready: { icon: Scissors, tone: "bg-gold/20 text-gold" },
  queue_position: { icon: Clock, tone: "bg-gold/20 text-gold" },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function bucket(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Hoje";
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (sameDay(d, y)) return "Ontem";
  const w = new Date(); w.setDate(w.getDate() - 7);
  if (d > w) return "Esta semana";
  return "Mais antigas";
}

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(100);
      if (!active) return;
      setItems((data ?? []) as N[]);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => setItems((prev) => [p.new as N, ...prev]))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const markAll = async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };

  const open = async (n: N) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    if (n.data?.url) navigate(n.data.url);
  };

  const groups: Record<string, N[]> = {};
  items.forEach((n) => { const k = bucket(n.sent_at); (groups[k] ||= []).push(n); });

  return (
    <div className="flex flex-col pb-8">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold">Notificações</h1>
        {items.some((n) => !n.read) && (
          <button onClick={markAll} className="text-xs font-semibold text-gold">Marcar todas</button>
        )}
      </header>

      {!user ? (
        <Empty
          title="Inicie sessão"
          subtitle="Entre na sua conta para ver as suas notificações"
          cta={<Button onClick={() => navigate("/auth")} className="rounded-full bg-primary text-gold">Entrar</Button>}
        />
      ) : loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">A carregar…</div>
      ) : items.length === 0 ? (
        <Empty title="Sem notificações" subtitle="Ative as notificações para não perder nada" />
      ) : (
        <div className="px-3 pt-2">
          {Object.entries(groups).map(([label, list]) => (
            <section key={label} className="mt-4">
              <h2 className="px-2 pb-2 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</h2>
              <ul className="space-y-1.5">
                {list.map((n) => {
                  const meta = TYPE_META[n.type] ?? { icon: Bell, tone: "bg-muted text-foreground" };
                  const Icon = meta.icon;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => open(n)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition-colors",
                          n.read ? "border-border" : "border-gold/30 bg-gold/5",
                        )}
                      >
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", meta.tone)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{n.title}</p>
                          <p className="line-clamp-2 text-[12px] text-muted-foreground">{n.body}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.sent_at)}</p>
                        </div>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ title, subtitle, cta }: { title: string; subtitle: string; cta?: React.ReactNode }) {
  return (
    <div className="m-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted"><Bell className="h-7 w-7 text-muted-foreground" /></div>
      <div>
        <p className="font-display text-lg font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {cta}
    </div>
  );
}

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) { setCount(0); return; }
    let active = true;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (active) setCount(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`unread-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);
  return count;
}
