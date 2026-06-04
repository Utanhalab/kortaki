import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { shops } from "@/data/shops";
import { Stars } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { formatDist, formatKz } from "@/lib/format";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const goldIcon = (active = false) =>
  L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${active ? "#2e2b26" : "#c8952a"};border:2px solid ${active ? "#c8952a" : "#2e2b26"};box-shadow:0 4px 10px rgba(0,0,0,.25);"></div>
        <div style="position:absolute;top:7px;left:0;right:0;text-align:center;color:${active ? "#c8952a" : "#2e2b26"};font-weight:800;font-family:Syne,sans-serif;font-size:14px;">✂</div>
      </div>`,
  });

function Fly({ center }: { center: [number, number] }) {
  const map = useMap();
  map.flyTo(center, 14, { duration: 0.6 });
  return null;
}

export default function MapPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const sel = shops.find((s) => s.id === selected);

  return (
    <div className="relative h-[calc(100vh-4rem)] sm:h-[calc(860px-4rem)]">
      <MapContainer center={[-8.8383, 13.2344]} zoom={13} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {shops.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={goldIcon(selected === s.id)}
            eventHandlers={{ click: () => setSelected(s.id) }}
          />
        ))}
        {sel && <Fly center={[sel.lat, sel.lng]} />}
      </MapContainer>

      {/* Bottom scroll cards */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500]">
        <div className="no-scrollbar pointer-events-auto flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
          {shops.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={cn(
                "w-[260px] shrink-0 snap-start rounded-2xl border bg-card p-3 text-left shadow-lg transition-all",
                selected === s.id ? "border-gold ring-2 ring-gold/30" : "border-border",
              )}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-display text-sm font-bold leading-tight">{s.name}</h3>
                <span className="text-[10px] font-semibold text-gold">{formatDist(s.dist)}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Stars rating={s.rating} size={10} />
                <span className="text-[10px] font-semibold">{s.rating}</span>
                <span className="text-[10px] text-muted-foreground">({s.reviews})</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-display text-sm font-bold text-primary">{formatKz(s.price)}</span>
                <Button asChild size="sm" className="h-7 rounded-full bg-primary px-3 text-[10px] font-bold text-gold">
                  <Link to={`/shop/${s.id}/book`}>Reservar</Link>
                </Button>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {sel && (
            <div className="space-y-3">
              <div>
                <h3 className="font-display text-lg font-bold">{sel.name}</h3>
                <p className="text-xs text-muted-foreground">{sel.address}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Stars rating={sel.rating} size={12} />
                <span className="font-semibold">{sel.rating}</span>
                <span className="text-muted-foreground">· {formatDist(sel.dist)}</span>
              </div>
              <div className="flex gap-2">
                <Button asChild className="flex-1 rounded-full bg-primary text-gold hover:bg-primary/90">
                  <Link to={`/shop/${sel.id}`}>Ver Detalhes</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to={`/shop/${sel.id}/book`}>Reservar</Link>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
