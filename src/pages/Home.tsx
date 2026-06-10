import { useEffect, useMemo, useState } from "react";
import { useQueueStore } from "@/store/useQueueStore";
import { motion } from "framer-motion";
import { Bell, Crown, Filter, LayoutGrid, MapPin, MapPinned, Phone, RefreshCw, Scissors, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ShopCard } from "@/components/ShopCard";
import { Stars } from "@/components/bits";
import { useShopStore, FilterKey, SortKey } from "@/store/useStores";
import { formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Abertos" },
  { key: "top", label: "Top Avaliados" },
  { key: "nearby", label: "Perto de mim" },
  { key: "budget", label: "Económico" },
  { key: "premium", label: "Premium" },
];

export default function Home() {
  const { shops, filter, setFilter, search, setSearch, sort, setSort, view, setView } = useShopStore();
  const navigate = useNavigate();
  const [maxPrice, setMaxPrice] = useState(10000);
  const loadSummaries = useQueueStore((s) => s.loadSummaries);

  useEffect(() => {
    const ids = shops.map((s) => s.id);
    loadSummaries(ids);
    const i = setInterval(() => loadSummaries(ids), 20000);
    return () => clearInterval(i);
  }, [shops, loadSummaries]);

  const filtered = useMemo(() => {
    let list = shops.filter((s) => s.price <= maxPrice);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
    }
    if (filter === "open") list = list.filter((s) => s.status === "open");
    if (filter === "top") list = list.filter((s) => s.rating >= 4.6);
    if (filter === "nearby") list = list.filter((s) => s.dist <= 1.5);
    if (filter === "budget") list = list.filter((s) => s.tier === "budget" || s.price < 3000);
    if (filter === "premium") list = list.filter((s) => s.tier === "premium");

    list = [...list].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price") return a.price - b.price;
      return a.dist - b.dist;
    });
    return list;
  }, [shops, filter, search, sort, maxPrice]);

  const featured = shops.find((s) => s.tier === "premium" && s.status === "open") ?? shops[0];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15">
              <Scissors className="h-5 w-5 text-gold" />
            </div>
            <span className="font-display text-xl font-bold text-gold">CutNear</span>
          </div>
          <div className="flex items-center gap-1">
            <BellButton />
            <Button onClick={() => navigate("/profile")} variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gold hover:bg-white/10 hover:text-gold">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Hero */}
        <div className="px-4 pb-5">
          <p className="mb-2 text-xs font-semibold text-gold">📍 Perto de ti</p>
          <h1 className="font-display text-3xl font-bold leading-tight text-white">
            Encontra a tua<br />Barbearia Perfeita
          </h1>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar barbearias, serviços..."
                className="h-11 rounded-full border-0 bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" className="h-11 w-11 shrink-0 rounded-full bg-gold text-primary hover:bg-gold/90">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="font-display">Filtros</SheetTitle>
                </SheetHeader>
                <div className="space-y-5 py-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Preço máximo</p>
                    <Slider value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} min={1000} max={10000} step={500} />
                    <p className="mt-2 text-xs text-muted-foreground">Até {formatKz(maxPrice)}</p>
                  </div>
                  <Button onClick={() => toast.success("Filtros aplicados")} className="w-full rounded-full bg-primary text-gold hover:bg-primary/90">
                    Aplicar
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <button className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-gold backdrop-blur">
            <MapPinned className="h-3.5 w-3.5" />
            Luanda, Ingombota · GPS
            <RefreshCw className="ml-1 h-3 w-3" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-background">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                filter === t.key
                  ? "border-primary bg-primary text-gold"
                  : "border-border bg-white text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">
          <span className="font-bold text-foreground">{filtered.length}</span> barbearias encontradas
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border bg-card p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn("rounded-full p-1.5", view === "list" ? "bg-primary text-gold" : "text-muted-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setView("map"); navigate("/map"); }}
              className={cn("rounded-full p-1.5", view === "map" ? "bg-primary text-gold" : "text-muted-foreground")}
            >
              <MapPinned className="h-3.5 w-3.5" />
            </button>
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-8 w-[110px] rounded-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Distância</SelectItem>
              <SelectItem value="rating">Avaliação</SelectItem>
              <SelectItem value="price">Preço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Featured */}
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10" />
          <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-gold/10" />
          <div className="relative">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
              <Crown className="h-3 w-3" /> Premium
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-white">{featured.name}</h2>
            <div className="mt-2 flex items-center gap-3 text-xs text-white/80">
              <span className="inline-flex items-center gap-1">
                <Stars rating={featured.rating} size={12} />
                <span className="ml-1">{featured.rating} · {featured.reviews} avaliações</span>
              </span>
              <span className="text-gold">Fecha {featured.closesAt}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate(`/shop/${featured.id}/book`)} className="rounded-full bg-gold text-primary hover:bg-gold/90">
                Reservar Agora
              </Button>
              <Button variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10 hover:text-white">
                <Phone className="mr-1.5 h-4 w-4" /> Ligar
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 p-4">
        {filtered.map((s, i) => (
          <ShopCard key={s.id} shop={s} index={i} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma barbearia encontrada
          </div>
        )}
      </div>
    </div>
  );
}

function BellButton() {
  const navigate = useNavigate();
  const unread = useUnreadCount();
  return (
    <Button onClick={() => navigate("/notifications")} variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-gold hover:bg-white/10 hover:text-gold">
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Button>
  );
}
