import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { shops, servicesCatalog } from "@/data/shops";
import { Button } from "@/components/ui/button";
import { useBookingStore } from "@/store/useStores";
import { useBarberStore } from "@/store/useBarberStore";
import { formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TIMES = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
const TAKEN = new Set(["10:00","11:30","15:00","17:30"]);

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

  if (!shop) return null;
  const days = next7Days();
  const svc = servicesCatalog.find((s) => s.id === selectedService);
  const canConfirm = !!(selectedService && selectedBarber && selectedDate && selectedTime);

  const confirm = () => {
    if (!canConfirm || !svc) return;
    addBooking({
      id: crypto.randomUUID(),
      shopId: shop.id,
      shopName: shop.name,
      service: svc.name,
      barber: selectedBarber!,
      date: selectedDate!,
      time: selectedTime!,
      price: svc.price,
      status: "upcoming",
    });
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
        <section>
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">1. Serviço</h2>
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
        </section>

        {/* Barber */}
        <section>
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">2. Barbeiro</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
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
                    {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card", b.available ? "bg-success" : "bg-destructive")} />
                </div>
                <p className="mt-2 text-xs font-semibold">{b.name.split(" ")[0]}</p>
                <p className="text-[10px] text-muted-foreground">{b.specialty}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Date */}
        <section>
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">3. Data</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {days.map((d) => (
              <button
                key={d.key}
                onClick={() => setDate(d.key)}
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
        </section>

        {/* Time */}
        <section>
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">4. Hora</h2>
          <div className="grid grid-cols-3 gap-2">
            {TIMES.map((t) => {
              const taken = TAKEN.has(t);
              const sel = selectedTime === t;
              return (
                <button
                  key={t}
                  disabled={taken}
                  onClick={() => setTime(t)}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-semibold transition-all",
                    taken && "border-border bg-muted text-muted-foreground line-through opacity-50",
                    !taken && sel && "border-gold bg-primary text-gold",
                    !taken && !sel && "border-border bg-card hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </section>

        {/* Summary */}
        {canConfirm && svc && (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
            <h3 className="mb-2 font-display text-sm font-bold">Resumo</h3>
            <div className="space-y-1 text-xs">
              <Row k="Barbearia" v={shop.name} />
              <Row k="Serviço" v={svc.name} />
              <Row k="Barbeiro" v={selectedBarber!} />
              <Row k="Data" v={selectedDate!} />
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
        <Button
          onClick={confirm}
          disabled={!canConfirm}
          className="h-14 w-full rounded-2xl bg-primary font-display text-base font-bold text-gold shadow-xl hover:bg-primary/90 disabled:opacity-50"
        >
          Confirmar Reserva
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
