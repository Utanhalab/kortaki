import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import type { PortfolioPhoto } from "@/store/useBarberStore";

export function PhotoViewer({
  photos,
  startIndex,
  open,
  onClose,
  onBook,
}: {
  photos: PortfolioPhoto[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  onBook?: (photo: PortfolioPhoto) => void;
}) {
  const [i, setI] = useState(startIndex);
  useEffect(() => { if (open) setI(startIndex); }, [open, startIndex]);
  if (!open || !photos[i]) return null;
  const p = photos[i];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black"
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur">
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center justify-center">
          <motion.img
            key={p.id}
            src={p.public_url}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="max-h-[80vh] max-w-full object-contain"
          />
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="absolute left-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"><ChevronLeft /></button>
          )}
          {i < photos.length - 1 && (
            <button onClick={() => setI(i + 1)} className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"><ChevronRight /></button>
          )}
        </div>
        <div className="border-t border-white/10 bg-black/90 p-4 text-white">
          <p className="font-display text-base font-bold">{p.style_label ?? "Estilo"}</p>
          {p.description && <p className="mt-1 text-xs text-white/70">{p.description}</p>}
          {onBook && (
            <Button onClick={() => onBook(p)} className="mt-3 w-full rounded-full bg-gold font-display font-bold text-primary hover:bg-gold/90">
              Reservar este estilo
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
