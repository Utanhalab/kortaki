import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Share2, Heart, Scissors, MapPin, Sparkles, MessageSquare, Send, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useBarberStore } from "@/store/useBarberStore";
import { useAuth } from "@/lib/auth";
import { Stars } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { shops } from "@/data/shops";
import { specialtyEmoji, LANGUAGE_FLAGS } from "@/data/specialties";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PhotoViewer } from "@/components/PhotoViewer";

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function next7Days() {
  const out: { key: string; name: string; num: string; dow: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      key: d.toISOString().slice(0, 10),
      name: i === 0 ? "Hoje" : DAYS_PT[d.getDay()],
      num: String(d.getDate()),
      dow: d.getDay(),
    });
  }
  return out;
}

export default function BarberProfile() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const {
    barbers, fetchBarber,
    portfolios, fetchPortfolio,
    reviews, fetchReviews,
    availability, fetchAvailability,
    savedBarbers, loadSaved, toggleSave,
    replyToReview,
  } = useBarberStore();

  const barber = barbers[id];
  const days = useMemo(next7Days, []);
  const [selectedDate, setSelectedDate] = useState(days[0].key);
  const [filter, setFilter] = useState<"all" | "5" | "photo" | "recent">("all");
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    fetchBarber(id);
    fetchPortfolio(id);
    fetchReviews(id);
    loadSaved();
  }, [id, fetchBarber, fetchPortfolio, fetchReviews, loadSaved]);

  useEffect(() => {
    if (id && selectedDate) fetchAvailability(id, selectedDate);
  }, [id, selectedDate, fetchAvailability]);

  if (!barber) {
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">A carregar…</div>;
  }

  const shop = shops.find((s) => s.id === barber.shop_id);
  const isOwner = user?.id === barber.user_id;
  const isSaved = savedBarbers.includes(id);
  const photos = portfolios[id] ?? [];
  const allReviews = reviews[id] ?? [];
  const slots = availability[`${id}-${selectedDate}`] ?? [];
  const nextSlot = slots.find((s) => s.available);

  const filteredReviews = allReviews.filter((r) => {
    if (filter === "5") return r.rating === 5;
    if (filter === "photo") return !!r.photo_url;
    if (filter === "recent") return new Date(r.created_at).getTime() > Date.now() - 30 * 86400000;
    return true;
  });

  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: allReviews.filter((r) => r.rating === star).length,
  }));
  const ratingMax = Math.max(1, ...ratingBuckets.map((b) => b.count));

  const status = barber.is_active ? "online" : "off";
  const statusBadge = status === "online"
    ? { dot: "bg-success", text: "Disponível hoje", cls: "text-success" }
    : { dot: "bg-muted-foreground", text: "Folga hoje", cls: "text-muted-foreground" };

  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, 9);
  const initials = barber.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  function share() {
    const url = `${window.location.origin}/barber/${id}`;
    if (navigator.share) navigator.share({ title: barber.name, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Link copiado"); }
  }

  function bookAt(time?: string, styleLabel?: string) {
    if (!shop) return;
    const qs = new URLSearchParams({ barber: barber.name });
    if (time) qs.set("time", time);
    if (selectedDate) qs.set("date", selectedDate);
    if (styleLabel) qs.set("style", styleLabel);
    navigate(`/shop/${shop.id}/book?${qs.toString()}`);
  }

  async function sendReply(reviewId: string) {
    if (!replyText.trim()) return;
    await replyToReview(reviewId, replyText.trim());
    setReplyOpen(null);
    setReplyText("");
    toast.success("Resposta enviada");
  }

  return (
    <div className="flex flex-col pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={share} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={async () => {
              try { await toggleSave(id); toast.success(isSaved ? "Removido" : "Guardado"); }
              catch (e: any) { toast.error(e.message); navigate(`/auth?redirect=/barber/${id}`); }
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted"
          >
            <motion.span whileTap={{ scale: 1.4 }}>
              <Heart className={cn("h-4 w-4", isSaved && "fill-destructive text-destructive")} />
            </motion.span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary px-4 pb-6 pt-5 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="grid h-[120px] w-[120px] place-items-center rounded-full bg-gold/15 font-display text-4xl font-bold text-gold ring-4 ring-primary">
              {barber.avatar_url ? <img src={barber.avatar_url} alt={barber.name} className="h-full w-full rounded-full object-cover" /> : initials}
            </div>
            {barber.is_verified && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -bottom-1 right-0 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-1 text-[10px] font-bold text-primary shadow-lg"
              >
                <Scissors className="h-3 w-3" /> Verificado
              </motion.span>
            )}
          </div>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">{barber.name}</h1>
        {shop && (
          <Link to={`/shop/${shop.id}`} className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-gold">
            <MapPin className="h-3 w-3" /> {shop.name}
          </Link>
        )}
        {barber.tagline && <p className="mt-2 text-sm text-gold/80">{barber.tagline}</p>}
        <p className={cn("mt-2 inline-flex items-center gap-1.5 text-xs font-semibold", statusBadge.cls)}>
          <span className={cn("h-2 w-2 rounded-full", statusBadge.dot)} /> {statusBadge.text}
        </p>
      </section>

      {/* Stats */}
      <div className="-mt-4 px-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <Stat label="Avaliação" value={barber.rating_avg ? barber.rating_avg.toFixed(1) : "—"} sub={`${barber.rating_count} ★`} />
          <Stat label="Cortes" value={String(barber.total_cuts || allReviews.length)} sub="feitos" />
          <Stat label="Experiência" value={String(barber.experience_years)} sub="anos" />
        </div>
      </div>

      {/* About */}
      {barber.bio && (
        <section className="px-4 pt-4">
          <p className="text-sm leading-relaxed text-foreground/80">{barber.bio}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {barber.languages.map((l) => (
              <span key={l} className="rounded-full bg-muted px-2 py-1 text-[11px]">
                {LANGUAGE_FLAGS[l] ?? "🌐"} {l}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Specialties */}
      {barber.specialties.length > 0 && (
        <section className="px-4 pt-5">
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Especialidades</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {barber.specialties.map((s) => (
              <span key={s} className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-primary">
                {specialtyEmoji(s)} {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      <section className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Portfólio</h2>
          {photos.length > 9 && !showAllPhotos && (
            <button onClick={() => setShowAllPhotos(true)} className="text-xs font-semibold text-gold">Ver todos ({photos.length})</button>
          )}
        </div>
        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            <Sparkles className="mx-auto mb-1 h-5 w-5 text-gold" />
            Ainda sem fotos no portfólio
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {visiblePhotos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setViewerStart(i)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={p.public_url}
                  alt={p.style_label ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {p.style_label && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-left text-[10px] font-semibold text-white">
                    {p.style_label}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Availability */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 font-display text-lg font-bold">Disponibilidade</h2>
        <div className="relative no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {days.map((d) => {
            const sel = d.key === selectedDate;
            return (
              <button
                key={d.key}
                onClick={() => setSelectedDate(d.key)}
                className={cn(
                  "relative flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2.5",
                  sel ? "border-gold bg-primary text-gold" : "border-border bg-card",
                )}
              >
                <span className="text-[10px] font-semibold uppercase">{d.name}</span>
                <span className="font-display text-lg font-bold">{d.num}</span>
                {sel && (
                  <motion.span layoutId="day-underline" className="absolute -bottom-1 h-1 w-6 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {slots.length === 0 ? (
            <div className="col-span-4 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              Sem horários disponíveis neste dia
            </div>
          ) : (
            slots.map((s) => (
              <button
                key={s.time}
                disabled={!s.available}
                onClick={() => bookAt(s.time)}
                className={cn(
                  "rounded-xl border py-2 text-xs font-semibold",
                  !s.available && "border-border bg-muted text-muted-foreground line-through",
                  s.available && "border-border bg-card hover:border-gold hover:bg-gold/10",
                )}
              >
                {s.time}
              </button>
            ))
          )}
        </div>
      </section>

      {/* Reviews */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 font-display text-lg font-bold">Avaliações</h2>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {barber.rating_avg ? barber.rating_avg.toFixed(1) : "—"}
              </p>
              <Stars rating={barber.rating_avg} size={12} />
              <p className="mt-1 text-[10px] text-muted-foreground">{barber.rating_count} avaliações</p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingBuckets.map((b) => (
                <div key={b.star} className="flex items-center gap-2 text-[11px]">
                  <span className="w-3 text-muted-foreground">{b.star}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${(b.count / ratingMax) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {[
            { k: "all", l: "Todos" },
            { k: "5", l: "5★" },
            { k: "photo", l: "Com foto" },
            { k: "recent", l: "Recentes" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k as any)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold",
                filter === f.k ? "border-primary bg-primary text-gold" : "border-border bg-card text-muted-foreground",
              )}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {filteredReviews.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              Sem avaliações ainda
            </p>
          )}
          {filteredReviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-cream font-display text-sm font-bold text-primary">
                  {r.customer_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{r.customer_name}</p>
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} size={11} />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                </div>
                {r.service_name && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{r.service_name}</span>
                )}
              </div>
              {r.comment && <p className="mt-2 text-xs text-muted-foreground">{r.comment}</p>}
              {r.photo_url && (
                <img src={r.photo_url} alt="" className="mt-2 h-32 w-32 rounded-xl object-cover" />
              )}

              {r.barber_reply && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 rounded-xl border-l-2 border-gold bg-gold/5 px-3 py-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
                    Resposta do barbeiro
                  </p>
                  <p className="mt-1 text-xs text-foreground/80">{r.barber_reply}</p>
                </motion.div>
              )}

              {isOwner && !r.barber_reply && (
                <div className="mt-2">
                  {replyOpen === r.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={replyText} onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escreve a tua resposta..."
                        className="min-h-[60px] rounded-xl text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setReplyOpen(null)} className="flex-1 rounded-full">Cancelar</Button>
                        <Button size="sm" onClick={() => sendReply(r.id)} className="flex-1 rounded-full bg-primary text-gold hover:bg-primary/90">
                          <Send className="mr-1 h-3 w-3" /> Enviar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setReplyOpen(r.id); setReplyText(""); }}
                      className="text-[11px] font-semibold text-gold"
                    >
                      <MessageSquare className="mr-1 inline h-3 w-3" /> Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))] left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-primary p-3 pl-4 text-primary-foreground shadow-xl">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-gold/70">Próximo</p>
            <p className="font-display text-sm font-bold text-gold">
              {nextSlot ? `${selectedDate === days[0].key ? "hoje" : "em breve"} às ${nextSlot.time}` : "Sem horários hoje"}
            </p>
          </div>
          <Button
            onClick={() => bookAt()}
            className="h-11 rounded-full bg-gold px-5 font-display text-sm font-bold text-primary hover:bg-gold/90"
          >
            <Calendar className="mr-1.5 h-4 w-4" /> Reservar com {barber.name.split(" ")[0]}
          </Button>
        </div>
      </div>

      <PhotoViewer
        photos={photos}
        startIndex={viewerStart ?? 0}
        open={viewerStart !== null}
        onClose={() => setViewerStart(null)}
        onBook={(p) => { setViewerStart(null); bookAt(undefined, p.style_label ?? undefined); }}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-bold text-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[10px] text-gold">{sub}</p>
    </div>
  );
}
