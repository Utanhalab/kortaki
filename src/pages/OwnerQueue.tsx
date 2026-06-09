import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BellRing,
  Clock,
  PauseCircle,
  PlayCircle,
  UserMinus,
  Users,
  Check,
} from "lucide-react";
import { shops } from "@/data/shops";
import { useQueueStore, QueueEntry } from "@/store/useQueueStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { initials } from "@/lib/clientId";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export default function OwnerQueue() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const shopId = Number(params.get("shop") ?? shops[0].id);
  const shop = shops.find((s) => s.id === shopId) ?? shops[0];

  const {
    entries,
    settings,
    loadShop,
    subscribeShop,
    callNext,
    removeEntry,
    setQueueOpen,
    updateSettings,
  } = useQueueStore();

  const [removing, setRemoving] = useState<QueueEntry | null>(null);
  const [reason, setReason] = useState("no-show");
  const [draftMax, setDraftMax] = useState(15);
  const [draftAvg, setDraftAvg] = useState(20);

  useEffect(() => {
    loadShop(shopId);
    const off = subscribeShop(shopId);
    return off;
  }, [shopId, loadShop, subscribeShop]);

  useEffect(() => {
    if (settings) {
      setDraftMax(settings.max_size);
      setDraftAvg(settings.avg_cut_minutes);
    }
  }, [settings]);

  const queue = useMemo(
    () => entries.filter((e) => e.status === "waiting" || e.status === "called").sort((a, b) => a.position - b.position),
    [entries],
  );
  const next = queue[0];
  const totalWaiting = queue.length;
  const avgWait = (settings?.avg_cut_minutes ?? 20);
  const isOpen = settings?.is_open ?? true;

  return (
    <div className="flex flex-col pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fila Ao Vivo</p>
            <p className="font-display text-base font-bold leading-tight">{shop.name}</p>
          </div>
          <Switch checked={isOpen} onCheckedChange={(v) => setQueueOpen(shopId, v).then(() => toast(v ? "Fila aberta" : "Fila em pausa"))} />
        </div>

        {shops.length > 1 && (
          <div className="mt-3">
            <Select value={String(shopId)} onValueChange={(v) => setParams({ shop: v })}>
              <SelectTrigger className="h-9 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip label={isOpen ? "Fila aberta" : "Fila em pausa"} tone={isOpen ? "success" : "warning"} />
          <Chip label={`${totalWaiting} em espera`} />
          <Chip label={`Média ${avgWait} min`} />
          <Chip label={`Máx ${settings?.max_size ?? 15}`} />
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Call next banner */}
        {next ? (
          <div className="rounded-3xl border-2 border-gold bg-primary p-4 text-gold">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gold/70">Próximo a chamar</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gold font-display text-base font-bold text-primary">
                {initials(next.customer_name)}
              </div>
              <div className="flex-1">
                <p className="font-display text-lg font-bold">{next.customer_name}</p>
                <p className="text-xs text-gold/70">
                  {next.service_name} · esperou{" "}
                  {Math.max(1, Math.round((Date.now() - new Date(next.joined_at).getTime()) / 60000))} min
                </p>
              </div>
            </div>
            <Button
              onClick={async () => {
                await callNext(shopId);
                toast.success(`${next.customer_name} foi chamado(a)`);
              }}
              className="mt-3 h-12 w-full rounded-full bg-gold font-display text-base font-bold text-primary hover:bg-gold/90"
            >
              <BellRing className="mr-2 h-5 w-5" /> Chamar Próximo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <Users className="h-7 w-7 text-muted-foreground" />
            <p className="font-display font-bold">Sem clientes na fila</p>
            <p className="text-xs text-muted-foreground">Os clientes aparecerão aqui em tempo real</p>
          </div>
        )}

        {/* Queue list */}
        {queue.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Fila completa
            </h2>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {queue.map((e, i) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <div
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full font-display text-sm font-bold",
                        i === 0 ? "bg-gold text-primary" : "bg-cream text-primary",
                      )}
                    >
                      {e.position}
                    </div>
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-[11px] font-bold text-gold">
                      {initials(e.customer_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{e.customer_name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {e.service_name} · {e.barber_name ?? "qualquer"}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <Clock className="ml-auto h-3 w-3 text-gold" />
                      {Math.max(1, Math.round((Date.now() - new Date(e.joined_at).getTime()) / 60000))}m
                    </div>
                    <button
                      onClick={() => { setRemoving(e); setReason("no-show"); }}
                      className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                      aria-label="Remover"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Controls */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-sm font-bold">Controlos</h2>

          <Button
            variant="outline"
            onClick={() => setQueueOpen(shopId, !isOpen)}
            className="mb-3 w-full rounded-full"
          >
            {isOpen ? <><PauseCircle className="mr-2 h-4 w-4" /> Pausar Fila</> : <><PlayCircle className="mr-2 h-4 w-4" /> Reabrir Fila</>}
          </Button>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold">Tamanho máximo da fila</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={draftMax}
                onChange={(e) => setDraftMax(Number(e.target.value))}
                onBlur={() => updateSettings(shopId, { max_size: draftMax })}
                className="mt-1 h-9 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Tempo médio de corte: {draftAvg} min</label>
              <Slider
                value={[draftAvg]}
                min={10}
                max={60}
                step={5}
                onValueChange={(v) => setDraftAvg(v[0])}
                onValueCommit={(v) => updateSettings(shopId, { avg_cut_minutes: v[0] })}
                className="mt-2"
              />
            </div>
          </div>
        </section>
      </div>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {removing?.customer_name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no-show">Não compareceu</SelectItem>
              <SelectItem value="left">Saiu</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (removing) {
                  await removeEntry(removing.id, reason);
                  toast("Cliente removido");
                  setRemoving(null);
                }
              }}
            >
              <Check className="mr-2 h-4 w-4" /> Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone?: "success" | "warning" }) {
  const t = tone === "success"
    ? "bg-success/15 text-success"
    : tone === "warning"
      ? "bg-warning/20 text-warning"
      : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", t)}>{label}</span>;
}
