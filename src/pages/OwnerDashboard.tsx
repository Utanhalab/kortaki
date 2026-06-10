import { Link } from "react-router-dom";
import { shops } from "@/data/shops";
import { useEffect } from "react";
import { useQueueStore } from "@/store/useQueueStore";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ListOrdered,
  Settings2,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { summaries, loadSummaries } = useQueueStore();
  const shopIds = shops.map((s) => s.id);

  useEffect(() => {
    loadSummaries(shopIds);
    const i = setInterval(() => loadSummaries(shopIds), 15000);
    return () => clearInterval(i);
  }, []); // eslint-disable-line

  const totalWaiting = shopIds.reduce((acc, id) => acc + (summaries[id]?.count ?? 0), 0);
  const openShops = shopIds.filter((id) => summaries[id]?.isOpen !== false).length;

  return (
    <div className="flex flex-col pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <button onClick={() => navigate("/")} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Painel do Dono</p>
          <h1 className="font-display text-lg font-bold leading-tight">CutNear Business</h1>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={Users} label="Total em fila" value={String(totalWaiting)} />
          <Stat icon={ListOrdered} label="Lojas abertas" value={`${openShops}/${shops.length}`} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Tile to="/dashboard/queue" icon={ListOrdered} title="Gerir Fila" subtitle="Próximo cliente, remover, pausar" highlight />
          <Tile to="#" icon={Calendar} title="Reservas" subtitle="Em breve" disabled />
          <Tile to="#" icon={BarChart3} title="Estatísticas" subtitle="Em breve" disabled />
          <Tile to="#" icon={Settings2} title="Definições" subtitle="Em breve" disabled />
        </div>

        <div>
          <h2 className="mb-2 font-display text-base font-bold">As minhas lojas</h2>
          <div className="space-y-2">
            {shops.map((s) => {
              const sum = summaries[s.id];
              return (
                <Link
                  to={`/dashboard/queue?shop=${s.id}`}
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-3"
                >
                  <div>
                    <p className="font-semibold leading-tight">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-gold">{sum?.count ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">na fila</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-gold" />
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Tile({
  to,
  icon: Icon,
  title,
  subtitle,
  highlight,
  disabled,
}: {
  to: string;
  icon: any;
  title: string;
  subtitle: string;
  highlight?: boolean;
  disabled?: boolean;
}) {
  const cls = `flex flex-col gap-2 rounded-2xl border p-4 transition-colors ${
    highlight ? "border-gold bg-primary text-gold" : "border-border bg-card"
  } ${disabled ? "opacity-50 pointer-events-none" : ""}`;
  return (
    <Link to={to} className={cls}>
      <div className={`grid h-9 w-9 place-items-center rounded-full ${highlight ? "bg-gold text-primary" : "bg-cream text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-display text-sm font-bold">{title}</p>
        <p className={`text-[10px] ${highlight ? "text-gold/70" : "text-muted-foreground"}`}>{subtitle}</p>
      </div>
    </Link>
  );
}
