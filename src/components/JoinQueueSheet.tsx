import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Scissors, Sparkles, Wind, Flame, Crown, User2, Check } from "lucide-react";
import { Shop, barbers, servicesCatalog } from "@/data/shops";
import { useQueueStore } from "@/store/useQueueStore";
import { formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getClientName, setClientName } from "@/lib/clientId";

const iconMap = { Scissors, Sparkles, Wind, Flame, Crown };

export function JoinQueueSheet({
  shop,
  open,
  onOpenChange,
}: {
  shop: Shop;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(servicesCatalog[0].id);
  const [barberName, setBarberName] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { joinQueue, summaries, loadSummaries, settings, loadShop } = useQueueStore();

  useEffect(() => {
    if (open) {
      setStep(0);
      setServiceId(servicesCatalog[0].id);
      setBarberName(null);
      setNotify(true);
      setName(getClientName() === "Convidado" ? "" : getClientName());
      loadSummaries([shop.id]);
      loadShop(shop.id);
    }
  }, [open, shop.id, loadSummaries, loadShop]);

  const service = useMemo(() => servicesCatalog.find((s) => s.id === serviceId)!, [serviceId]);
  const summary = summaries[shop.id];
  const isOpen = settings?.is_open ?? summary?.isOpen ?? true;
  const queueCount = summary?.count ?? 0;
  const myPosition = queueCount + 1;
  const avg = settings?.avg_cut_minutes ?? 20;
  const estWait = queueCount * avg;

  async function handleJoin() {
    if (!name.trim()) {
      toast.error("Indique o seu nome");
      return;
    }
    setBusy(true);
    try {
      setClientName(name.trim());
      const entry = await joinQueue({
        shopId: shop.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        barberName,
        notify,
        customerName: name.trim(),
      });
      if (entry) {
        toast.success(`Entrou na fila · Posição #${entry.position}`);
        onOpenChange(false);
        navigate(`/shop/${shop.id}/queue`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível entrar na fila");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-[430px] rounded-t-3xl border-border bg-background p-0"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-display text-lg">Entrar na Fila · {shop.name}</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-1 px-4 pt-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-gold" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Escolhe o serviço
              </p>
              {servicesCatalog.map((s) => {
                const Icon = iconMap[s.icon as keyof typeof iconMap] ?? Scissors;
                const active = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                      active ? "border-gold bg-gold/10" : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-gold">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.duration} min</p>
                    </div>
                    <span className="font-display font-bold text-primary">{formatKz(s.price)}</span>
                    {active && <Check className="h-4 w-4 text-gold" />}
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Barbeiro (opcional)
              </p>
              <button
                onClick={() => setBarberName(null)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  barberName === null ? "border-gold bg-gold/10" : "border-border bg-card",
                )}
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-cream text-primary">
                  <User2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Qualquer barbeiro disponível</p>
                  <p className="text-[11px] text-muted-foreground">Recomendado · menor espera</p>
                </div>
                {barberName === null && <Check className="h-4 w-4 text-gold" />}
              </button>

              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {barbers.map((b) => {
                  const active = barberName === b.name;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBarberName(b.name)}
                      className={cn(
                        "w-28 shrink-0 rounded-2xl border p-3 text-center transition-colors",
                        active ? "border-gold bg-gold/10" : "border-border bg-card",
                      )}
                    >
                      <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary font-display text-lg font-bold text-gold">
                        {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                            b.available ? "bg-success" : "bg-warning",
                          )}
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold">{b.name.split(" ")[0]}</p>
                      <p className="text-[10px] text-muted-foreground">{b.specialty}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Revê e confirma
              </p>
              <Input
                placeholder="O teu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
              />
              <div className="rounded-2xl border border-border bg-card p-4">
                <Row k="Barbearia" v={shop.name} />
                <Row k="Serviço" v={`${service.name} · ${service.duration} min`} />
                <Row k="Barbeiro" v={barberName ?? "Qualquer disponível"} />
                <Row k="Posição prevista" v={`#${myPosition}`} />
                <Row k="Tempo estimado" v={`~${estWait} min`} />
                <Row k="Preço" v={formatKz(service.price)} last />
              </div>
              <label className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm">
                <span>Avisar quando for o #2 na fila</span>
                <Switch checked={notify} onCheckedChange={setNotify} />
              </label>
              {!isOpen && (
                <p className="rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
                  A fila está em pausa. Tenta novamente mais tarde.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border bg-background p-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          {step < 2 ? (
            <Button
              className="flex-1 rounded-full bg-primary text-gold hover:bg-primary/90"
              onClick={() => setStep(step + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              disabled={busy || !isOpen}
              onClick={handleJoin}
              className="flex-1 rounded-full bg-primary font-display font-bold text-gold hover:bg-primary/90"
            >
              {busy ? "A entrar..." : "Entrar na Fila"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 text-sm",
        !last && "border-b border-border/60",
      )}
    >
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
