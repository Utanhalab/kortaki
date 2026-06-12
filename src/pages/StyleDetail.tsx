import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Star, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useGalleryStore, StylePhoto } from "@/store/useGalleryStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function StyleDetail() {
  const { styleId } = useParams<{ styleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getPhoto,
    getSimilar,
    incrementView,
    saveStyle,
    unsaveStyle,
    savedStyleIds,
    fetchSaved,
  } = useGalleryStore();
  const [photo, setPhoto] = useState<StylePhoto | null>(null);
  const [similar, setSimilar] = useState<StylePhoto[]>([]);

  useEffect(() => {
    if (!styleId) return;
    let cancelled = false;
    (async () => {
      const p = await getPhoto(styleId);
      if (cancelled) return;
      setPhoto(p);
      if (p) {
        incrementView(p.id);
        const sim = await getSimilar(p);
        if (!cancelled) setSimilar(sim);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [styleId, getPhoto, getSimilar, incrementView]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  if (!photo) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-sm text-muted-foreground">
        A carregar…
      </div>
    );
  }

  const saved = savedStyleIds.has(photo.id);

  const onSave = async () => {
    if (!user) {
      toast.error("Inicia sessão para guardar estilos");
      navigate("/auth");
      return;
    }
    if (saved) {
      await unsaveStyle(photo.id);
    } else {
      await saveStyle(photo.id);
      toast.success("Adicionado aos guardados");
    }
  };

  const onShare = async () => {
    try {
      await navigator.share?.({
        title: photo.style_name,
        text: `${photo.style_name} — ${photo.barber_name}`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado");
    }
  };

  const bookingUrl = `/shop/${photo.shop_id}/book?barber=${photo.barber_id}&style=${photo.id}${photo.service_id ? `&service=${photo.service_id}` : ""}`;

  return (
    <div className="flex flex-col bg-background pb-8">
      {/* Photo viewer */}
      <div className="relative h-[55vh] bg-black">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex gap-2">
          <button
            onClick={onSave}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur"
          >
            <Heart
              className={saved ? "h-5 w-5 fill-gold text-gold" : "h-5 w-5 text-white"}
            />
          </button>
          <button
            onClick={onShare}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur"
          >
            <Share2 className="h-5 w-5 text-white" />
          </button>
        </div>
        <motion.img
          layoutId={`style-${photo.id}`}
          src={photo.public_url}
          alt={photo.style_name}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Info panel */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="-mt-6 rounded-t-3xl bg-card p-5"
      >
        <h1 className="font-display text-xl font-bold">{photo.style_name}</h1>
        {photo.category_slug && (
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
            {photo.category_slug}
          </span>
        )}
        {photo.description && (
          <p className="mt-3 text-sm text-muted-foreground">{photo.description}</p>
        )}
        {photo.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {photo.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Barber row */}
        <Link
          to={`/barber/${photo.barber_id}`}
          className="mt-5 flex items-center gap-3 rounded-2xl border border-border p-3"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-lg font-bold text-gold">
            {photo.barber_avatar ? (
              <img
                src={photo.barber_avatar}
                alt={photo.barber_name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              photo.barber_name?.charAt(0) ?? "B"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 font-display text-sm font-bold">
              {photo.barber_name}
              <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
            </p>
            <p className="text-xs text-muted-foreground">{photo.shop_name}</p>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Star className="h-3 w-3 fill-gold text-gold" /> Próximo slot disponível
            </div>
          </div>
        </Link>

        {/* CTAs */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            onClick={() => navigate(bookingUrl)}
            className="rounded-full bg-gold font-bold text-primary hover:bg-gold/90"
          >
            Reservar este estilo
          </Button>
          <Button
            onClick={() => navigate(`/barber/${photo.barber_id}`)}
            variant="outline"
            className="rounded-full border-primary text-primary"
          >
            Ver perfil
          </Button>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 font-display text-sm font-bold">Estilos semelhantes</h3>
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
              {similar.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/gallery/style/${s.id}`)}
                  className="w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="aspect-square bg-muted">
                    {s.public_url && (
                      <img src={s.public_url} alt={s.style_name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="line-clamp-1 p-2 text-[10px] font-semibold">{s.style_name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
