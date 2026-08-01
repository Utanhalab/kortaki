import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, Loader2, RefreshCw, X } from "lucide-react";
import { shops, servicesCatalog, shopDaySlots, isOvernight } from "@/data/shops";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookingStore, type BusyRange } from "@/store/useStores";
import { useBarberStore } from "@/store/useBarberStore";
import { formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StepHeading, StepHint, StepSection, firstMissing, type StepRequirement } from "@/components/StepGate";


function next7Days() {
  const days: { key: string; name: string; num: string }[] = [];
  const names = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({ key: d.toISOString().slice(0,10), name: i === 0 ? "Hoje" : names[d.getDay()], num: String(d.getDate()) });
  }
  return days;
}

export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const shop = shops.find((s) => s.id === Number(id));
  const { selectedService, selectedBarber, selectedDate, selectedTime, setService, setBarber, setDate, setTime, addBooking, reset } = useBookingStore();
  const barbersByShop = useBarberStore((s) => s.barbersByShop);
  const fetchShopBarbers = useBarberStore((s) => s.fetchShopBarbers);
  const barbers = shop ? (barbersByShop[shop.id] ?? []) : [];

  useEffect(() => { if (shop) fetchShopBarbers(shop.id); }, [shop, fetchShopBarbers]);

  // Prefill from query string (from BarberProfile)
  useEffect(() => {
    const b = params.get("barber"); if (b) setBarber(b);
    const d = params.get("date"); if (d) setDate(d);
    const t = params.get("time"); if (t) setTime(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busy ranges for the selected day (+ the overnight tail into the next day)
  const fetchShopBusyRanges = useBookingStore((s) => s.fetchShopBusyRanges);
  const myBookings = useBookingStore((s) => s.bookings);
  const fetchBookings = useBookingStore((s) => s.fetchBookings);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);
  const [busy, setBusy] = useState<BusyRange[]>([]);
  const [busyLoading, setBusyLoading] = useState(false);
  const [busyError, setBusyError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const shopId = shop?.id;

  const loadBusy = useCallback(async () => {
    if (!shopId || !selectedDate) { setBusy([]); setBusyError(null); return; }
    setBusyLoading(true);
    setBusyError(null);
    const from = new Date(`${selectedDate}T00:00:00`);
    const to = new Date(from.getTime() + 48 * 60 * 60 * 1000);
    const res = await fetchShopBusyRanges(shopId, from.toISOString(), to.toISOString());
    if (res.error) setBusyError(res.error);
    else setBusy(res.ranges);
    setBusyLoading(false);
  }, [shopId, selectedDate, fetchShopBusyRanges]);

  useEffect(() => { loadBusy(); }, [loadBusy]);
  useEffect(() => { fetchBookings(); }, [fetchBookings]);



  if (!shop) return null;
  const days = next7Days();
  const svc = servicesCatalog.find((s) => s.id === selectedService);
  const canConfirm = !!(selectedService && selectedBarber && selectedDate && selectedTime);
  const requirements: StepRequirement[] = [
    { key: "service", message: "Selecciona um serviço", done: !!selectedService },
    { key: "barber", message: "Selecciona um barbeiro", done: !!selectedBarber },
    { key: "date", message: "Selecciona uma data", done: !!selectedDate },
    { key: "time", message: "Selecciona uma hora", done: !!selectedTime },
  ];
  const missing = firstMissing(requirements);

  const slots = shopDaySlots(shop);
  const todayKey = days[0].key;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isPastTime = (t: string, nextDay: boolean) => {
    if (nextDay) return false; // belongs to the following calendar day
    if (selectedDate !== todayKey) return false;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m <= nowMinutes;
  };
  const addDay = (key: string) => {
    const d = new Date(`${key}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const isNextDaySlot = (t: string) => slots.find((s) => s.time === t)?.nextDay ?? false;
  const effectiveDate = selectedDate && isNextDaySlot(selectedTime ?? "") ? addDay(selectedDate) : selectedDate;

  /** Absolute start of a slot, resolving overnight (+1 day) slots. */
  const slotStart = (t: string, nextDay: boolean) => {
    if (!selectedDate) return null;
    const day = nextDay ? addDay(selectedDate) : selectedDate;
    return new Date(`${day}T${t}:00`).getTime();
  };
  const duration = (svc?.duration ?? 30) * 60000;
  /** A slot conflicts when its [start, start+duration) window overlaps an existing booking. */
  const isTaken = (t: string, nextDay: boolean) => {
    const start = slotStart(t, nextDay);
    if (start === null) return false;
    const end = start + duration;
    return busy.some((r) => start < r.end && end > r.start);
  };
  /** The overlapping busy range for a slot, if any. */
  const busyAt = (t: string, nextDay: boolean) => {
    const start = slotStart(t, nextDay);
    if (start === null) return null;
    const end = start + duration;
    return busy.find((r) => start < r.end && end > r.start) ?? null;
  };
  /** The current user's own booking overlapping this slot (cancellable). */
  const myBookingAt = (t: string, nextDay: boolean) => {
    const start = slotStart(t, nextDay);
    if (start === null) return null;
    const end = start + duration;
    return (
      myBookings.find((b) => {
        if (b.shopId !== shop!.id || b.status === "cancelled") return false;
        const bs = new Date(`${b.date}T${b.time}:00`).getTime();
        const be = bs + b.durationMinutes * 60000;
        return start < be && end > bs;
      }) ?? null
    );
  };
  const cancelMine = async (bookingId: string) => {
    setCancelling(bookingId);
    const res = await cancelBooking(bookingId);
    setCancelling(null);
    if (res.error) { toast.error("Não foi possível cancelar"); return; }
    toast.success("Reserva cancelada — slot libertado");
    await loadBusy();
  };



  const confirm = async () => {
    if (!canConfirm || !svc) return;
    const res = await addBooking({
      shopId: shop.id,
      shopName: shop.name,
      service: svc.name,
      barber: selectedBarber!,
      date: effectiveDate!,
      time: selectedTime!,
      price: svc.price,
      durationMinutes: svc.duration,
    });
    if (res.error === "auth") {
      toast.error("Inicia sessão para reservar");
      navigate("/auth");
      return;
    }
    if (res.error === "conflict") {
      toast.error("Esse horário já foi reservado. Escolhe outro.");
      setTime("");
      await loadBusy();
      return;
    }
    if (res.error) {
      toast.error("Não foi possível confirmar a reserva");
      return;
    }
    toast.success("Reserva confirmada!");
    reset();
    navigate("/bookings");
  };



  return (
    <div className="flex flex-col pb-32">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-base font-bold">Reservar</h1>
          <p className="text-[11px] text-muted-foreground">{shop.name} · {shop.address}</p>
        </div>
      </header>

      <div className="space-y-6 p-4">
        {/* Service */}
        <StepSection active={missing?.key === "service"}>
          <StepHeading index={1} title="Serviço" active={missing?.key === "service"} done={!!selectedService} />
          {missing?.key === "service" && <StepHint message="Selecciona um serviço" className="mb-2" />}
          <div className="space-y-2">
            {servicesCatalog.map((s) => (
              <button
                key={s.id}
                onClick={() => setService(s.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-all",
                  selectedService === s.id ? "border-gold ring-2 ring-gold/30" : "border-border",
                )}
              >
                <div className={cn("grid h-5 w-5 place-items-center rounded-full border-2", selectedService === s.id ? "border-gold bg-gold" : "border-border")}>
                  {selectedService === s.id && <Check className="h-3 w-3 text-primary" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.duration} min</p>
                </div>
                <p className="font-display font-bold text-primary">{formatKz(s.price)}</p>
              </button>
            ))}
          </div>
        </StepSection>

        {/* Barber */}
        <StepSection active={missing?.key === "barber"}>
          <StepHeading index={2} title="Barbeiro" active={missing?.key === "barber"} done={!!selectedBarber} />
          {missing?.key === "barber" && <StepHint message="Selecciona um barbeiro" className="mb-2" />}
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            <button
              onClick={() => setBarber("Qualquer disponível")}
              className={cn(
                "w-28 shrink-0 rounded-2xl border bg-card p-3 text-center transition-all",
                selectedBarber === "Qualquer disponível" ? "border-gold ring-2 ring-gold/30" : "border-border",
              )}
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream font-display text-xs font-bold text-primary">
                Auto
              </div>
              <p className="mt-2 text-xs font-semibold">Qualquer</p>
              <p className="text-[10px] text-muted-foreground">Menor espera</p>
            </button>
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarber(b.name)}
                className={cn(
                  "w-28 shrink-0 rounded-2xl border bg-card p-3 text-center transition-all",
                  selectedBarber === b.name ? "border-gold ring-2 ring-gold/30" : "border-border",
                )}
              >
                <div className="relative mx-auto h-14 w-14">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-primary font-display text-lg font-bold text-gold">
                    {b.avatar_url
                      ? <img src={b.avatar_url} alt={b.name} className="h-full w-full rounded-full object-cover" />
                      : b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card", b.is_active ? "bg-success" : "bg-muted-foreground")} />
                </div>
                <p className="mt-2 text-xs font-semibold">{b.name.split(" ")[0]}</p>
                <p className="truncate text-[10px] text-muted-foreground">{b.specialties[0] ?? "—"}</p>
              </button>
            ))}
          </div>
        </StepSection>

        {/* Date */}
        <StepSection active={missing?.key === "date"}>
          <StepHeading index={3} title="Data" active={missing?.key === "date"} done={!!selectedDate} />
          {missing?.key === "date" && <StepHint message="Selecciona uma data" className="mb-2" />}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {days.map((d) => (
              <button
                key={d.key}
                onClick={() => {
                  setDate(d.key);
                  if (d.key === todayKey && selectedTime) {
                    const [h, m] = selectedTime.split(":").map(Number);
                    if (h * 60 + m <= nowMinutes) setTime("");
                  }
                }}
                className={cn(
                  "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 transition-all",
                  selectedDate === d.key ? "border-gold bg-primary text-gold" : "border-border bg-card text-foreground",
                )}
              >
                <span className="text-[10px] font-semibold uppercase">{d.name}</span>
                <span className="font-display text-xl font-bold">{d.num}</span>
              </button>
            ))}
          </div>
        </StepSection>

        {/* Time */}
        <StepSection active={missing?.key === "time"}>
          <StepHeading index={4} title="Hora" active={missing?.key === "time"} done={!!selectedTime} />
          {missing?.key === "time" && <StepHint message="Selecciona uma hora" className="mb-2" />}
          <div className="mb-2 text-[11px] text-muted-foreground">
            Horário de funcionamento: {shop.opensAt} – {shop.closingTime}
            {isOvernight(shop) && " (fecha no dia seguinte)"}
          </div>
          {busyLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : busyError ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-xs text-muted-foreground">Não foi possível carregar a disponibilidade.</p>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => loadBusy()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(({ time: t, working, nextDay }) => {
                const past = isPastTime(t, nextDay);
                const booked = working && !past && isTaken(t, nextDay);
                const taken = !working || booked || past;
                const sel = selectedTime === t;
                const mine = booked ? myBookingAt(t, nextDay) : null;
                const range = booked ? busyAt(t, nextDay) : null;
                const cls = cn(
                  "relative w-full rounded-xl border py-2.5 text-sm font-semibold transition-all",
                  taken && "border-border bg-muted text-muted-foreground line-through opacity-50",
                  booked && "cursor-pointer opacity-70 line-through",
                  !taken && sel && "border-gold bg-primary text-gold",
                  !taken && !sel && "border-border bg-card hover:bg-muted",
                );
                const label = (
                  <>
                    {t}
                    {nextDay && working && <span className="ml-1 align-super text-[9px]">+1</span>}
                  </>
                );

                if (booked && range) {
                  return (
                    <Popover key={t}>
                      <PopoverTrigger asChild>
                        <button type="button" className={cls} title="Já reservado — ver detalhes">{label}</button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60 rounded-2xl p-3 text-xs" align="center">
                        <p className="font-display text-sm font-bold">Slot reservado</p>
                        <div className="mt-2 space-y-1">
                          <Row k="Horário" v={`${fmtTime(range.start)} – ${fmtTime(range.end)}`} />
                          <Row k="Barbeiro" v={range.barber ?? "Qualquer disponível"} />
                          {mine && <Row k="Serviço" v={mine.service} />}
                          <Row k="Reserva" v={mine ? "Tua reserva" : "De outro cliente"} />
                        </div>
                        {mine && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={cancelling === mine.id}
                            onClick={() => cancelMine(mine.id)}
                            className="mt-3 w-full rounded-full border-destructive/40 text-destructive"
                          >
                            {cancelling === mine.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />}
                            Cancelar e libertar slot
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  );
                }

                return (
                  <button
                    key={t}
                    disabled={taken}
                    title={!working ? "Fora do horário de funcionamento" : past ? "Horário já passou" : nextDay ? "Dia seguinte" : undefined}
                    onClick={() => setTime(t)}
                    className={cls}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </StepSection>

        {/* Summary */}
        {canConfirm && svc && (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
            <h3 className="mb-2 font-display text-sm font-bold">Resumo</h3>
            <div className="space-y-1 text-xs">
              <Row k="Barbearia" v={shop.name} />
              <Row k="Serviço" v={svc.name} />
              <Row k="Barbeiro" v={selectedBarber!} />
              <Row k="Data" v={effectiveDate!} />
              <Row k="Hora" v={selectedTime!} />
              <div className="mt-2 flex justify-between border-t border-gold/30 pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-display text-lg font-bold text-primary">{formatKz(svc.price)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))] left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4">
        <StepHint message={missing?.message} className="mb-2 shadow-lg" />
        <Button
          onClick={confirm}
          disabled={!canConfirm}
          className="h-14 w-full rounded-2xl bg-primary font-display text-base font-bold text-gold shadow-xl hover:bg-primary/90 disabled:opacity-50"
        >
          {missing ? missing.message : "Confirmar Reserva"}
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}
