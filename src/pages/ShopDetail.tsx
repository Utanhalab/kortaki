import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Phone, CalendarPlus, Navigation, Clock, Crown, Scissors, Sparkles, Wind, Flame, Users, ListOrdered, ChevronRight } from "lucide-react";
import { shops, servicesCatalog, reviews } from "@/data/shops";
import { Stars, StatusBadge } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useShopStore } from "@/store/useStores";
import { Heart } from "lucide-react";
import { JoinQueueSheet } from "@/components/JoinQueueSheet";
import { useQueueStore } from "@/store/useQueueStore";
import { useBarberStore } from "@/store/useBarberStore";

const iconMap = { Scissors, Sparkles, Wind, Flame, Crown };

export default function ShopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shop = shops.find((s) => s.id === Number(id));
  const { saved, toggleSave } = useShopStore();
  const [joinOpen, setJoinOpen] = useState(false);
  const summary = useQueueStore((s) => s.summaries[Number(id)]);
  const loadSummaries = useQueueStore((s) => s.loadSummaries);
  useEffect(() => {
    if (id) {
      loadSummaries([Number(id)]);
      const i = setInterval(() => loadSummaries([Number(id)]), 10000);
      return () => clearInterval(i);
    }
  }, [id, loadSummaries]);
  if (!shop) return <div className="p-6">Barbearia não encontrada</div>;

  const isSaved = saved.includes(shop.id);
  const tierBg = shop.tier === "premium" ? "bg-primary text-gold" : shop.tier === "budget" ? "bg-sage text-primary" : "bg-cream text-primary";
  const queueCount = summary?.count ?? 0;
  const queueWait = summary?.avgWait ?? 0;
  const queueOpen = summary?.isOpen ?? true;
  const queueFull = summary ? summary.count >= summary.maxSize : false;

  const actions = [
    { label: "Reservar", icon: CalendarPlus, onClick: () => navigate(`/shop/${shop.id}/book`) },
    { label: "Fila", icon: ListOrdered, onClick: () => navigate(`/shop/${shop.id}/queue`) },
    { label: "Ligar", icon: Phone, onClick: () => toast("A ligar...") },
    { label: "Direções", icon: Navigation, onClick: () => toast("A abrir mapa...") },
  ];

  return (
    <div className="flex flex-col pb-32">
      {/* Hero */}
      <div className={cn("relative h-56", tierBg)}>
        <div className="absolute inset-0 grid place-items-center opacity-30">
          <Scissors className="h-32 w-32" />
        </div>
        <div className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] flex w-[calc(100%-2rem)] items-center justify-between">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-primary shadow">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { toggleSave(shop.id); toast.success(isSaved ? "Removido" : "Guardado"); }}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-primary shadow"
          >
            <Heart className={cn("h-5 w-5", isSaved && "fill-destructive text-destructive")} />
          </button>
        </div>
        {shop.tier === "premium" && (
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Crown className="h-3 w-3" /> Premium
          </span>
        )}
      </div>

      <div className="space-y-5 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold leading-tight">{shop.name}</h1>
            <StatusBadge status={shop.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{shop.address}</p>
          <div className="mt-2 flex items-center gap-2">
            <Stars rating={shop.rating} />
            <span className="text-sm font-semibold">{shop.rating}</span>
            <span className="text-sm text-muted-foreground">({shop.reviews} avaliações)</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-muted"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-gold">
                <a.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold">{a.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate(`/shop/${shop.id}/queue`)}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors",
            !queueOpen || queueFull
              ? "border-destructive/40 bg-destructive/10"
              : queueCount > 0
                ? "border-gold/40 bg-gold/10"
                : "border-border bg-card hover:bg-muted",
          )}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Users className={cn("h-4 w-4", !queueOpen || queueFull ? "text-destructive" : "text-gold")} />
            {!queueOpen
              ? "Fila em pausa"
              : queueFull
                ? "Fila cheia"
                : `Fila: ${queueCount} em espera · ~${queueWait} min`}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Ver →
          </span>
        </button>

        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
          <Clock className="h-4 w-4 text-gold" />
          <span className="font-medium">{shop.status === "closed" ? shop.closesAt : `Aberto até ${shop.closesAt}`}</span>
        </div>


        {/* Services */}
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Serviços</h2>
          <div className="grid grid-cols-2 gap-2">
            {servicesCatalog.map((s) => {
              const Icon = iconMap[s.icon as keyof typeof iconMap] ?? Scissors;
              return (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15 text-gold">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-2 text-sm font-semibold">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.duration} min</p>
                  <p className="mt-1 font-display font-bold text-primary">{formatKz(s.price)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Barbers */}
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Barbeiros</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {barbers.map((b) => (
              <div key={b.id} className="w-28 shrink-0 rounded-2xl border border-border bg-card p-3 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary font-display text-lg font-bold text-gold">
                  {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <p className="mt-2 text-xs font-semibold">{b.name}</p>
                <p className="text-[10px] text-muted-foreground">{b.specialty}</p>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px]">
                  <Stars rating={b.rating} size={10} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Avaliações</h2>
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-cream font-display text-sm font-bold text-primary">
                    {r.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <div className="flex items-center gap-2">
                      <Stars rating={r.rating} size={11} />
                      <span className="text-[10px] text-muted-foreground">{r.date}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))] left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-primary p-3 pl-4 text-primary-foreground shadow-xl">
          <div className="mr-1">
            <p className="text-[10px] uppercase tracking-wider text-gold/70">Desde</p>
            <p className="font-display text-base font-bold text-gold">{formatKz(shop.price)}</p>
          </div>
          <Button
            onClick={() => setJoinOpen(true)}
            disabled={!queueOpen || queueFull}
            className="h-11 flex-1 rounded-full bg-white/10 px-3 font-display text-sm font-bold text-gold hover:bg-white/15"
          >
            Entrar na Fila
          </Button>
          <Button asChild className="h-11 flex-1 rounded-full bg-gold px-3 font-display text-sm font-bold text-primary hover:bg-gold/90">
            <Link to={`/shop/${shop.id}/book`}>Reservar</Link>
          </Button>
        </div>
      </div>

      <JoinQueueSheet shop={shop} open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}

