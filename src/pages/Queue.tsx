import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  Clock,
  LogIn,
  LogOut,
  PauseCircle,
  RefreshCw,
  User2,
  UserMinus,
  Users,
} from "lucide-react";
import { shops } from "@/data/shops";
import { useQueueStore } from "@/store/useQueueStore";
import { getClientId, initials } from "@/lib/clientId";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Queue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shopId = Number(id);
  const shop = shops.find((s) => s.id === shopId);
  const { entries, settings, activity, loadShop, subscribeShop, leaveQueue } = useQueueStore();
  const [notifyOn, setNotifyOn] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    loadShop(shopId);
    const off = subscribeShop(shopId);
    return off;
  }, [shopId, loadShop, subscribeShop]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const clientId = getClientId();
  const mine = useMemo(
    () => entries.find((e) => e.client_id === clientId && (e.status === "waiting" || e.status === "called")),
    [entries, clientId],
  );
  const waitingCount = entries.filter((e) => e.status === "waiting" || e.status === "called").length;
  const avg = settings?.avg_cut_minutes ?? 20;
  const ahead = mine ? Math.max(0, mine.position - 1) : 0;
  const estWait = ahead * avg;
  const readyAt = useMemo(() => {
    const d = new Date(Date.now() + estWait * 60000);
    return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  }, [estWait]);

  if (!shop) return <div className="p-6">Barbearia não encontrada</div>;

  const myStatus: "waiting" | "almost" | "turn" | "none" = !mine
    ? "none"
    : mine.status === "called"
      ? "turn"
      : mine.position <= 2
        ? "almost"
        : "waiting";

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="font-display text-base font-bold leading-tight">{shop.name}</p>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Fila Ao Vivo
          </p>
        </div>
        <button
          onClick={() => loadShop(shopId)}
          className="grid h-9 w-9 place-items-center rounded-full bg-muted"
          aria-label="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-4 p-4">
        {settings && !settings.is_open && (
          <div className="flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <PauseCircle className="h-4 w-4 text-warning" />
            <span className="font-semibold text-warning">Fila em pausa · Por favor aguarde</span>
          </div>
        )}

        {!mine ? (
          <NotInQueue shopId={shopId} waiting={waitingCount} />
        ) : (
          <LiveCard
            position={mine.position}
            ahead={ahead}
            estWait={estWait}
            status={myStatus === "none" ? "waiting" : myStatus}
            totalWaiting={waitingCount}
          />
        )}

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <Metric icon={Users} label="Na fila" value={String(waitingCount)} />
          <Metric icon={Clock} label="Corte médio" value={`${avg} min`} />
          <Metric icon={Check} label="Pronto às" value={mine ? readyAt : "—"} />
        </div>

        {/* Your spot */}
        {mine && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              O teu lugar
            </p>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary font-display text-base font-bold text-gold">
                {initials(mine.customer_name)}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{mine.customer_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {mine.service_name} · {mine.service_duration_minutes} min
                </p>
              </div>
              <StatusPill status={myStatus} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Cell icon={User2} label="Barbeiro" v={mine.barber_name ?? "Qualquer"} />
              <Cell
                icon={Clock}
                label="Entrou às"
                v={new Date(mine.joined_at).toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sair da Fila
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sair da fila?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vais perder o teu lugar #{mine.position}. Esta ação não pode ser revertida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        await leaveQueue(mine.id);
                        toast("Saíste da fila");
                      }}
                    >
                      Sim, sair
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                onClick={() => {
                  setNotifyOn((v) => !v);
                  toast.success(notifyOn ? "Notificações desligadas" : "Avisar-te-emos quando estiveres a 2 lugares");
                }}
                className={cn(
                  "flex-1 rounded-full",
                  notifyOn && "border-gold/60 bg-gold/10 text-gold hover:bg-gold/20",
                )}
              >
                {notifyOn ? <BellRing className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
                {notifyOn ? "Avisar-me" : "Ativar aviso"}
              </Button>
            </div>
          </div>
        )}

        {/* Activity */}
        <section>
          <h2 className="mb-2 font-display text-base font-bold">Atividade</h2>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {activity.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                  Sem atividade ainda
                </p>
              )}
              {activity.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <ActivityIcon kind={a.kind} />
                  <div className="flex-1 text-xs">
                    <p className="font-medium">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground">{relTime(a.created_at, tick)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}

function NotInQueue({ shopId, waiting }: { shopId: number; waiting: number }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-cream text-primary">
        <Users className="h-7 w-7" />
      </div>
      <p className="font-display text-lg font-bold">Não estás nesta fila</p>
      <p className="text-xs text-muted-foreground">{waiting} pessoa(s) atualmente em espera</p>
      <Button asChild className="rounded-full bg-primary text-gold hover:bg-primary/90">
        <Link to={`/shop/${shopId}`}>
          <LogIn className="mr-2 h-4 w-4" /> Voltar à barbearia
        </Link>
      </Button>
    </div>
  );
}

function LiveCard({
  position,
  ahead,
  estWait,
  status,
  totalWaiting,
}: {
  position: number;
  ahead: number;
  estWait: number;
  status: "waiting" | "almost" | "turn";
  totalWaiting: number;
}) {
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const pct = totalWaiting ? Math.min(1, (totalWaiting - ahead) / totalWaiting) : 0;
  const offset = circ * (1 - pct);

  const bg =
    status === "turn"
      ? "bg-success/20 border-success/50"
      : status === "almost"
        ? "bg-gold/15 border-gold/60 animate-[pulse_2s_ease-in-out_infinite]"
        : "bg-primary border-primary";
  const fg = status === "waiting" ? "text-gold" : "text-foreground";

  return (
    <div className={cn("rounded-3xl border p-6 text-center", bg, status === "waiting" && "text-primary-foreground")}>
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", fg, "opacity-70")}>
        Posição na fila
      </p>

      <div className="relative mx-auto mt-3 h-44 w-44">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={radius} className="fill-none stroke-white/15" strokeWidth="10" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            className={cn("fill-none transition-all duration-700", status === "turn" ? "stroke-success" : "stroke-gold")}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={position}
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className={cn("font-display text-6xl font-bold", fg)}
            >
              #{position}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className={cn("mt-2 text-sm", fg, "opacity-80")}>
        {status === "turn"
          ? "Dirige-te à barbearia agora!"
          : ahead === 0
            ? "És o(a) próximo(a)"
            : `${ahead} pessoa(s) à tua frente`}
      </p>
      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-bold text-primary">
        <Clock className="h-3 w-3" /> ~{estWait} min
      </span>
      <p className={cn("mt-2 inline-flex items-center gap-1 text-[10px]", fg, "opacity-60")}>
        <RefreshCw className="h-3 w-3" /> Atualizado agora
      </p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-gold" />
      <p className="mt-1 font-display text-base font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Cell({ icon: Icon, label, v }: { icon: any; label: string; v: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2">
      <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3 text-gold" /> {label}
      </p>
      <p className="text-sm font-semibold">{v}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "waiting" | "almost" | "turn" | "none" }) {
  const map = {
    waiting: { l: "Na fila", c: "bg-warning/20 text-warning" },
    almost: { l: "Quase a tua vez", c: "bg-gold/20 text-gold animate-pulse" },
    turn: { l: "A tua vez!", c: "bg-success/20 text-success" },
    none: { l: "—", c: "bg-muted text-muted-foreground" },
  } as const;
  const v = map[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", v.c)}>{v.l}</span>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const cls = "grid h-7 w-7 place-items-center rounded-full";
  if (kind === "joined") return <div className={cn(cls, "bg-success/15 text-success")}><LogIn className="h-3.5 w-3.5" /></div>;
  if (kind === "finished") return <div className={cn(cls, "bg-cream text-primary")}><Check className="h-3.5 w-3.5" /></div>;
  if (kind === "left") return <div className={cn(cls, "bg-muted text-muted-foreground")}><LogOut className="h-3.5 w-3.5" /></div>;
  if (kind === "called") return <div className={cn(cls, "bg-gold/20 text-gold")}><BellRing className="h-3.5 w-3.5" /></div>;
  if (kind === "removed") return <div className={cn(cls, "bg-destructive/15 text-destructive")}><UserMinus className="h-3.5 w-3.5" /></div>;
  return <div className={cn(cls, "bg-muted text-muted-foreground")}><PauseCircle className="h-3.5 w-3.5" /></div>;
}

function relTime(iso: string, _tick: number) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 30) return "agora mesmo";
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleString("pt-PT");
}
