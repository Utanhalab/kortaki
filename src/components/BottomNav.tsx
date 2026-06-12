import { NavLink, useLocation } from "react-router-dom";
import { Compass, MapPinned, CalendarCheck, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/store/useQueueStore";

const items = [
  { to: "/", label: "Explorar", icon: Compass, exact: true, badgeKey: "queue" as const },
  { to: "/gallery", label: "Galeria", icon: Sparkles },
  { to: "/map", label: "Mapa", icon: MapPinned },
  { to: "/bookings", label: "Reservas", icon: CalendarCheck, badgeKey: "queue" as const },
  { to: "/profile", label: "Perfil", icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const inQueue = useQueueStore((s) => s.myEntries.length > 0);
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <ul className="grid grid-cols-5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map(({ to, label, icon: Icon, exact, badgeKey }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          const showBadge = badgeKey === "queue" && inQueue;
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-gold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
                  {showBadge && (
                    <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-card" />
                  )}
                </span>
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

