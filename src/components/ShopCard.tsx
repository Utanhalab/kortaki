import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Crown, Scissors, MapPin, Clock, Users } from "lucide-react";
import { Shop } from "@/data/shops";
import { Button } from "@/components/ui/button";
import { Stars, StatusBadge } from "./bits";
import { formatDist, formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/store/useQueueStore";

const tierBlock = {
  premium: "bg-primary text-gold",
  default: "bg-cream text-primary",
  budget: "bg-sage text-primary",
} as const;

const tierLabel = {
  premium: "Premium",
  default: "Standard",
  budget: "Económico",
} as const;

export function ShopCard({ shop, index = 0 }: { shop: Shop; index?: number }) {
  const summary = useQueueStore((s) => s.summaries[shop.id]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
    >
      <Link
        to={`/shop/${shop.id}`}
        className="flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      >
        <div className={cn("flex w-[100px] shrink-0 flex-col items-center justify-center gap-1.5", tierBlock[shop.tier])}>
          {shop.tier === "premium" ? <Crown className="h-7 w-7" /> : <Scissors className="h-7 w-7" />}
          <span className="text-[10px] font-semibold uppercase tracking-wider">{tierLabel[shop.tier]}</span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-bold leading-tight">{shop.name}</h3>
            <StatusBadge status={shop.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-gold" /> {formatDist(shop.dist)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-gold" /> {shop.closesAt}</span>
            {summary && summary.count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                <Users className="h-3 w-3" /> {summary.count} na fila
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Stars rating={shop.rating} />
            <span className="text-xs font-semibold">{shop.rating}</span>
            <span className="text-xs text-muted-foreground">({shop.reviews})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {shop.services.slice(0, 3).map((s) => (
              <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-display font-bold text-primary">{formatKz(shop.price)}</span>
            </div>
            <Button asChild size="sm" className="h-8 rounded-full bg-primary px-4 text-xs font-bold text-gold hover:bg-primary/90">
              <span>Reservar</span>
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
