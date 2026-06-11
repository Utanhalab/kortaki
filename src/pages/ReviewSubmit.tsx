import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useBarberStore } from "@/store/useBarberStore";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { shops } from "@/data/shops";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ConfettiPiece = { id: number; left: number; delay: number; color: string };

export default function ReviewSubmit() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const barberId = params.get("barber") ?? "";
  const serviceName = params.get("service") ?? "";

  const { barbers, fetchBarber, submitReview } = useBarberStore();
  const barber = barbers[barberId];

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (barberId) fetchBarber(barberId); }, [barberId, fetchBarber]);
  useEffect(() => {
    if (!loading && !user) navigate(`/auth?redirect=/bookings/${id}/review?barber=${barberId}`);
  }, [loading, user, id, barberId, navigate]);

  if (!barber) return <div className="grid h-64 place-items-center text-sm text-muted-foreground">A carregar…</div>;
  const shop = shops.find((s) => s.id === barber.shop_id);

  async function submit() {
    if (!user) return;
    setBusy(true);
    try {
      await submitReview({
        barberId,
        bookingId: id,
        rating,
        comment,
        photo,
        serviceName,
        customerName: (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "Cliente",
      });
      setDone(true);
      toast.success("Obrigado pelo feedback!");
      setTimeout(() => {
        if (rating >= 4) {
          const msg = `Adorei o corte com ${barber.name} na ${shop?.name ?? "barbearia"}! ⭐`;
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
        }
        navigate(`/barber/${barberId}`);
      }, 1800);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao submeter");
    } finally {
      setBusy(false);
    }
  }

  const confetti: ConfettiPiece[] = done
    ? Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: ["#c8952a", "#2e2b26", "#fff", "#e94560"][i % 4],
      }))
    : [];

  return (
    <div className="flex flex-col pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-base font-bold">Deixe uma avaliação</h1>
      </header>

      {confetti.map((c) => (
        <motion.span
          key={c.id}
          initial={{ y: -20, opacity: 1 }}
          animate={{ y: 700, opacity: 0, rotate: 360 }}
          transition={{ duration: 2, delay: c.delay }}
          className="pointer-events-none fixed top-0 z-50 h-2 w-2 rounded-sm"
          style={{ left: `${c.left}%`, background: c.color }}
        />
      ))}

      <div className="space-y-5 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary font-display text-lg font-bold text-gold">
            {barber.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="font-display text-base font-bold">{barber.name}</p>
            <p className="text-[11px] text-muted-foreground">{shop?.name}</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 py-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 1.3 }}
              onClick={() => setRating(n)}
            >
              <Star className={cn("h-10 w-10 transition-colors", n <= rating ? "fill-gold text-gold" : "text-muted")} />
            </motion.button>
          ))}
        </div>

        <div>
          <Label className="text-xs">Como foi a experiência? (opcional)</Label>
          <Textarea
            value={comment} onChange={(e) => setComment(e.target.value.slice(0, 300))}
            placeholder="Conta-nos…"
            className="mt-1 min-h-[100px] rounded-2xl"
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{comment.length}/300</p>
        </div>

        <div>
          <Label className="text-xs">Adicionar foto do resultado (opcional)</Label>
          <label className="mt-1 flex h-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            {photo ? (
              <span className="text-xs">{photo.name}</span>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Camera className="h-4 w-4" /> Tocar para escolher
              </span>
            )}
          </label>
        </div>

        {serviceName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
            Serviço: {serviceName}
          </span>
        )}

        <Button
          onClick={submit} disabled={busy || done}
          className="h-12 w-full rounded-full bg-primary font-display text-base font-bold text-gold hover:bg-primary/90"
        >
          {done ? "Obrigado!" : busy ? "A enviar…" : "Enviar Avaliação"}
        </Button>
      </div>
    </div>
  );
}
