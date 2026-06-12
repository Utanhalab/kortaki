import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUp, Heart, Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGalleryStore, StylePhoto } from "@/store/useGalleryStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const HERO_SLIDES = [
  { title: "Fade nítido", subtitle: "O mais reservado em Luanda" },
  { title: "Tranças clássicas", subtitle: "Estilos que duram" },
  { title: "Design criativo", subtitle: "Linhas únicas, só tuas" },
];

export default function Gallery() {
  const {
    categories,
    photos,
    trending,
    activeCategory,
    isLoading,
    hasMore,
    page,
    savedStyleIds,
    setActiveCategory,
    fetchCategories,
    fetchPhotos,
    fetchTrending,
    fetchSaved,
    saveStyle,
    unsaveStyle,
  } = useGalleryStore();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const shopFilter = params.get("shop_id");
  const [scrollTop, setScrollTop] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchSaved();
  }, [fetchCategories, fetchSaved]);

  useEffect(() => {
    if (categories.length) {
      fetchPhotos(activeCategory, 0);
      if (activeCategory === "trending") fetchTrending();
    }
  }, [activeCategory, categories.length, fetchPhotos, fetchTrending]);

  useEffect(() => {
    const onScroll = () => setScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    heroTimer.current = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => {
      if (heroTimer.current) clearInterval(heroTimer.current);
    };
  }, []);

  const visiblePhotos = shopFilter
    ? photos.filter((p) => String(p.shop_id) === shopFilter)
    : photos;

  const onSaveToggle = async (p: StylePhoto) => {
    if (!user) {
      toast.error("Inicia sessão para guardar estilos");
      navigate("/auth");
      return;
    }
    if (savedStyleIds.has(p.id)) {
      await unsaveStyle(p.id);
    } else {
      await saveStyle(p.id);
      toast.success("Estilo guardado");
    }
  };

  return (
    <div className="flex flex-col pb-6">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-primary-foreground">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gold">Galeria de Estilos</h1>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/gallery/search")}
              className="h-9 w-9 rounded-full text-gold hover:bg-white/10 hover:text-gold"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/profile/wishlist")}
              className="h-9 w-9 rounded-full text-gold hover:bg-white/10 hover:text-gold"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Hero */}
        <div className="relative mt-3 overflow-hidden rounded-2xl bg-black/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Encontra o teu próximo look
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={heroIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mt-1"
            >
              <h2 className="font-display text-lg font-bold text-white">
                {HERO_SLIDES[heroIdx].title}
              </h2>
              <p className="text-xs text-white/70">{HERO_SLIDES[heroIdx].subtitle}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-3 flex gap-1.5">
            {HERO_SLIDES.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === heroIdx ? "w-5 bg-gold" : "w-1.5 bg-white/30",
                )}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+148px)] z-20 border-b border-border bg-background">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
          {categories.map((cat) => {
            const active = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                  active
                    ? "border-primary bg-primary text-gold"
                    : "border-border bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {cat.icon} {cat.name_pt}
              </button>
            );
          })}
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
              activeCategory === "all"
                ? "border-primary bg-primary text-gold"
                : "border-border bg-white text-muted-foreground hover:text-foreground",
            )}
          >
            📋 Todos
          </button>
        </div>
      </div>

      {/* Trending strip */}
      {activeCategory === "trending" && trending.length > 0 && (
        <section className="px-4 pt-4">
          <h3 className="mb-2 font-display text-sm font-bold">🔥 Esta semana em Luanda</h3>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {trending.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                to={`/gallery/style/${p.id}`}
                className="w-40 shrink-0 overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-square bg-muted">
                  {p.public_url && (
                    <img
                      src={p.public_url}
                      alt={p.style_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="line-clamp-1 text-xs font-bold text-white">{p.style_name}</p>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-semibold text-primary">
                    🔥 {p.weekly_bookings ?? p.booking_count} reservas
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Photo grid (masonry) */}
      <section className="px-4 pt-4">
        {visiblePhotos.length === 0 && !isLoading ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-display text-base font-bold">Nenhum estilo encontrado</p>
            <button
              onClick={() => setActiveCategory("trending")}
              className="mt-2 text-xs font-semibold text-gold underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="columns-2 gap-3 [column-fill:_balance]"
          >
            {visiblePhotos.map((p, i) => (
              <PhotoTile
                key={p.id}
                photo={p}
                saved={savedStyleIds.has(p.id)}
                tall={i % 3 === 1}
                onSave={() => onSaveToggle(p)}
                onClick={() => navigate(`/gallery/style/${p.id}`)}
              />
            ))}
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`s${i}`}
                  className={cn(
                    "mb-3 break-inside-avoid animate-pulse rounded-2xl bg-muted",
                    i % 2 === 0 ? "h-48" : "h-64",
                  )}
                />
              ))}
          </motion.div>
        )}

        {hasMore && !isLoading && visiblePhotos.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => fetchPhotos(activeCategory, page + 1)}
              variant="outline"
              className="rounded-full"
            >
              Carregar mais
            </Button>
          </div>
        )}
      </section>

      {/* Scroll-to-top FAB */}
      <AnimatePresence>
        {scrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-gold text-primary shadow-lg"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhotoTile({
  photo,
  saved,
  tall,
  onSave,
  onClick,
}: {
  photo: StylePhoto;
  saved: boolean;
  tall: boolean;
  onSave: () => void;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card"
      onClick={onClick}
      role="button"
    >
      <div className={cn("relative bg-muted", tall ? "aspect-[3/4]" : "aspect-square")}>
        {photo.public_url ? (
          <img
            src={photo.public_url}
            alt={photo.style_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <motion.button
          whileTap={{ scale: 1.4 }}
          transition={{ type: "spring", stiffness: 400 }}
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/40 backdrop-blur"
        >
          <Heart
            className={cn("h-4 w-4", saved ? "fill-gold text-gold" : "text-white")}
            strokeWidth={2}
          />
        </motion.button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2">
          <p className="line-clamp-1 text-xs font-bold text-white">{photo.style_name}</p>
          <p className="line-clamp-1 text-[10px] text-white/70">
            {photo.barber_name} · {photo.shop_name}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
