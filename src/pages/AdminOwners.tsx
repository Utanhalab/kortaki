import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Trash2,
  UserPlus,
  ListOrdered,
  AlertTriangle,
  RefreshCw,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { shops } from "@/data/shops";
import { toast } from "sonner";

type OwnerRow = {
  id: string;
  user_id: string;
  shop_id: number;
  email: string;
  created_at: string;
  account_exists: boolean;
  email_confirmed: boolean;
  is_banned: boolean;
  is_deleted: boolean;
  has_owner_role: boolean;
  last_sign_in_at: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  shop_id: number;
  target_email: string | null;
  actor_email: string | null;
  details: string | null;
  created_at: string;
};

type StatusKey = "ok" | "removed" | "banned" | "unconfirmed" | "no_role";

const STATUS_FILTERS: { key: StatusKey | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "ok", label: "Activa" },
  { key: "banned", label: "Suspensa" },
  { key: "removed", label: "Removida" },
  { key: "no_role", label: "Sem permissão" },
  { key: "unconfirmed", label: "Por confirmar" },
];

function ownerStatus(r: OwnerRow): { key: StatusKey; ok: boolean; label: string; reason: string } {
  if (!r.account_exists || r.is_deleted)
    return { key: "removed", ok: false, label: "Conta removida", reason: "A conta associada já não existe." };
  if (r.is_banned)
    return { key: "banned", ok: false, label: "Conta suspensa", reason: "A conta está suspensa/banida." };
  if (!r.email_confirmed)
    return {
      key: "unconfirmed",
      ok: false,
      label: "Email por confirmar",
      reason: "O utilizador ainda não confirmou o email.",
    };
  if (!r.has_owner_role)
    return {
      key: "no_role",
      ok: false,
      label: "Sem permissão de dono",
      reason: "A conta não tem o papel de dono atribuído.",
    };
  return { key: "ok", ok: true, label: "Conta activa", reason: "Conta válida e com permissões." };
}


export default function AdminOwners() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [email, setEmail] = useState("");
  const [shopId, setShopId] = useState<number>(shops[0]?.id ?? 1);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [revalidating, setRevalidating] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const q = query.trim().toLowerCase();
  const matchesFilter = (r: OwnerRow) => statusFilter === "all" || ownerStatus(r).key === statusFilter;
  const ownersFor = (id: number) => rows.filter((r) => r.shop_id === id && matchesFilter(r));
  const visibleShops = shops.filter((s) => {
    const owners = ownersFor(s.id);
    if (statusFilter !== "all" && owners.length === 0) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || owners.some((r) => r.email.toLowerCase().includes(q));
  });

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
    const { data: entries } = await supabase
      .from("queue_entries")
      .select("shop_id")
      .in("status", ["waiting", "called", "serving"]);
    const c: Record<number, number> = {};
    (entries ?? []).forEach((e) => {
      c[e.shop_id] = (c[e.shop_id] ?? 0) + 1;
    });
    setCounts(c);
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    const { data, error } = await supabase.rpc("admin_list_owner_audit", { _limit: 100 });
    setAuditLoading(false);
    if (error) {
      toast.error("Não foi possível carregar a auditoria", { description: error.message });
      return;
    }
    setAudit((data ?? []) as AuditRow[]);
  };

  useEffect(() => {
    if (isAdmin) {
      load();
      loadAudit();
    }
  }, [isAdmin]);

  const revalidate = async (r: OwnerRow) => {
    setRevalidating(r.id);
    const { data, error } = await supabase.rpc("admin_check_owner_status", { _user_id: r.user_id });
    setRevalidating(null);
    if (error) {
      toast.error("Falha ao revalidar", { description: error.message });
      return;
    }
    const fresh = (data ?? [])[0] as Omit<OwnerRow, "id" | "shop_id" | "created_at"> | undefined;
    if (!fresh) {
      toast.error("Sem resposta do servidor");
      return;
    }
    const updated: OwnerRow = { ...r, ...fresh, email: fresh.email ?? r.email };
    setRows((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    const st = ownerStatus(updated);
    if (st.ok) toast.success(`${updated.email}: ${st.label}`, { description: st.reason });
    else toast.error(`${updated.email}: ${st.label}`, { description: st.reason });
  };

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
      const shopName = shops.find((s) => s.id === shopId)?.name ?? `#${shopId}`;
      toast.error("Não foi possível atribuir este proprietário", {
        description: `${email.trim()} → ${shopName}\nMotivo: ${error.message}`,
        duration: 8000,
      });
      return;
    }
    toast.success("Dono atribuído com sucesso");
    setEmail("");
    load();
    loadAudit();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("shop_owners").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover", { description: error.message });
      return;
    }
    toast.success("Atribuição removida");
    load();
    loadAudit();
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
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">Barbearias ({shops.length})</h2>
            <span className="text-[11px] text-muted-foreground">{rows.length} dono(s) atribuído(s)</span>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar barbearia ou email…"
            className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <div className="space-y-2">
            {visibleShops.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma barbearia encontrada.
              </p>
            )}
            {visibleShops.map((s) => {
              const owners = rows.filter((r) => r.shop_id === s.id);
              const invalid = owners.filter((r) => !ownerStatus(r).ok);
              return (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold leading-tight">{s.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {owners.length === 0 ? "Sem dono atribuído" : `${owners.length} dono(s)`}
                        {invalid.length > 0 && ` · ${invalid.length} inválido(s)`}
                      </p>
                    </div>
                    <Link
                      to={`/dashboard/queue?shop=${s.id}`}
                      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold"
                    >
                      <ListOrdered className="h-3.5 w-3.5" />
                      {counts[s.id] ?? 0} na fila
                    </Link>
                    <button
                      onClick={() => {
                        setShopId(s.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      aria-label={`Atribuir dono a ${s.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-muted text-gold"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>

                  {owners.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                      {owners.map((r) => {
                        const st = ownerStatus(r);
                        return (
                          <li key={r.id} className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">{r.email}</p>
                              <span
                                className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  st.ok
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {st.ok ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3" />
                                )}
                                {st.label}
                              </span>
                            </div>
                            <button
                              onClick={() => remove(r.id)}
                              aria-label={`Remover ${r.email}`}
                              className="grid h-8 w-8 place-items-center rounded-full bg-muted text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
