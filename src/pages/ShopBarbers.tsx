import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useBarberStore } from "@/store/useBarberStore";
import { shops } from "@/data/shops";
import { Stars } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { specialtyEmoji } from "@/data/specialties";
import { cn } from "@/lib/utils";

type Sort = "rating" | "available" | "fast";

export default function ShopBarbers() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const shop = shops.find((s) => s.id === Number(id));
  const { barbersByShop, fetchShopBarbers } = useBarberStore();
  const [sort, setSort] = useState<Sort>("rating");

  useEffect(() => {
    if (id) fetchShopBarbers(Number(id));
  }, [id, fetchShopBarbers]);

  if (!shop) return <div className="p-6 text-sm">Barbearia não encontrada</div>;

  const list = (barbersByShop[shop.id] ?? []).slice().sort((a, b) => {
    if (sort === "rating") return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
    if (sort === "fast") return (a.experience_years ?? 0) - (b.experience_years ?? 0);
    return Number(b.is_active) - Number(a.is_active);
  });

  return (
    <div className="flex flex-col pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equipa</p>
          <h1 className="font-display text-base font-bold leading-tight">{shop.name}</h1>
        </div>
      </header>

      <div className="px-4 pt-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {[
            { k: "rating", l: "Melhor avaliação" },
            { k: "available", l: "Disponível agora" },
            { k: "fast", l: "Mais rápido" },
          ].map((s) => (
            <button
              key={s.k}
              onClick={() => setSort(s.k as Sort)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold",
                sort === s.k ? "border-primary bg-primary text-gold" : "border-border bg-card text-muted-foreground",
              )}
            >
              {s.l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-gold" />
            Nenhum barbeiro disponível
          </div>
        )}
        {list.map((b) => {
          const initials = b.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
          return (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex gap-3">
                <div className="relative">
                  <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-primary font-display text-xl font-bold text-gold">
                    {b.avatar_url ? <img src={b.avatar_url} alt={b.name} className="h-full w-full rounded-full object-cover" /> : initials}
                  </div>
                  {b.is_verified && (
                    <span className="absolute -bottom-1 right-0 grid h-5 w-5 place-items-center rounded-full bg-gold text-primary shadow">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold">{b.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{b.tagline ?? "—"}</p>
                    </div>
                    <span className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      b.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", b.is_active ? "bg-success" : "bg-muted-foreground")} />
                      {b.is_active ? "Disponível" : "Folga"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Stars rating={b.rating_avg} size={11} />
                    <span className="text-[11px] font-semibold">{b.rating_avg ? b.rating_avg.toFixed(1) : "—"}</span>
                    <span className="text-[10px] text-muted-foreground">({b.rating_count})</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {b.specialties.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {specialtyEmoji(s)} {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 rounded-full">
                  <Link to={`/barber/${b.id}`}>Ver Perfil</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 rounded-full bg-primary text-gold hover:bg-primary/90">
                  <Link to={`/shop/${shop.id}/book?barber=${encodeURIComponent(b.name)}`}>Reservar</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
