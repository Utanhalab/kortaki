import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Trash2, UserPlus, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { shops } from "@/data/shops";
import { toast } from "sonner";

type OwnerRow = { id: string; user_id: string; shop_id: number; email: string; created_at: string };

export default function AdminOwners() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [email, setEmail] = useState("");
  const [shopId, setShopId] = useState<number>(shops[0]?.id ?? 1);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?redirect=/dashboard/admin");
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("is_platform_admin");
      setIsAdmin(Boolean(data));
    })();
  }, [user, loading, navigate]);

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_list_shop_owners");
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as OwnerRow[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.shop_id))];
    if (ids.length) {
      const { data: entries } = await supabase
        .from("queue_entries")
        .select("shop_id")
        .in("shop_id", ids)
        .in("status", ["waiting", "called", "serving"]);
      const c: Record<number, number> = {};
      (entries ?? []).forEach((e) => {
        c[e.shop_id] = (c[e.shop_id] ?? 0) + 1;
      });
      setCounts(c);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_assign_shop_owner", {
      _email: email.trim(),
      _shop_id: shopId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dono atribuído com sucesso");
    setEmail("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("shop_owners").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Atribuição removida");
    load();
  };

  if (loading || isAdmin === null) {
    return <div className="p-6 text-sm text-muted-foreground">A carregar…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        <h1 className="font-display text-lg font-bold">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta área é apenas para administradores da plataforma.
        </p>
        <Link to="/dashboard" className="mt-2 rounded-full bg-primary px-4 py-2 text-sm text-gold">
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <button onClick={() => navigate("/dashboard")} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Administração</p>
          <h1 className="font-display text-lg font-bold leading-tight">Donos de barbearia</h1>
        </div>
      </header>

      <div className="space-y-5 p-4">
        <form onSubmit={assign} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="font-display text-sm font-bold">Atribuir papel de dono</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email do utilizador"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <select
            value={shopId}
            onChange={(e) => setShopId(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-gold disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {busy ? "A atribuir…" : "Atribuir dono"}
          </button>
        </form>

        <div>
          <h2 className="mb-2 font-display text-base font-bold">Atribuições ativas ({rows.length})</h2>
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Ainda não há donos atribuídos.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => {
                const shop = shops.find((s) => s.id === r.shop_id);
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold leading-tight">{r.email}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{shop?.name ?? `Loja #${r.shop_id}`}</p>
                    </div>
                    <Link
                      to={`/dashboard/queue?shop=${r.shop_id}`}
                      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold"
                    >
                      <ListOrdered className="h-3.5 w-3.5" />
                      {counts[r.shop_id] ?? 0} na fila
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      aria-label="Remover atribuição"
                      className="grid h-8 w-8 place-items-center rounded-full bg-muted text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
