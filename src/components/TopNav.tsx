import { NavLink, useLocation } from "react-router-dom";
import { Compass, MapPinned, CalendarCheck, Sparkles, User, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueueStore } from "@/store/useQueueStore";

const items = [
  { to: "/", label: "Explorar", icon: Compass, exact: true },
  { to: "/gallery", label: "Galeria", icon: Sparkles },
  { to: "/map", label: "Mapa", icon: MapPinned },
  { to: "/bookings", label: "Reservas", icon: CalendarCheck, badge: true },
  { to: "/profile", label: "Perfil", icon: User },
];

export function TopNav() {
  const { pathname } = useLocation();
  const inQueue = useQueueStore((s) => s.myEntries.length > 0);
  return (
    <nav className="sticky top-0 z-50 hidden border-b border-border bg-card/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-gold">
            <Scissors className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">CutNear</span>
        </NavLink>
        <ul className="flex items-center gap-1">
          {items.map(({ to, label, icon: Icon, exact, badge }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            const showBadge = badge && inQueue;
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary text-gold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {showBadge && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
