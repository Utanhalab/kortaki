import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={cn(i <= Math.round(rating) ? "fill-gold text-gold" : "text-muted")}
        />
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: "open" | "busy" | "closed" }) {
  const map = {
    open: { label: "Aberto", cls: "bg-success/15 text-success" },
    busy: { label: "Ocupado", cls: "bg-warning/20 text-warning" },
    closed: { label: "Fechado", cls: "bg-destructive/15 text-destructive" },
  } as const;
  const v = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", v.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {v.label}
    </span>
  );
}
