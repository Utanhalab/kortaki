import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookingStore } from "@/store/useStores";
import { useQueueStore } from "@/store/useQueueStore";
import { Button } from "@/components/ui/button";
import { Scissors, CalendarDays, User2, Clock, Users, LogOut } from "lucide-react";
import { formatKz } from "@/lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { shops } from "@/data/shops";

export default function Bookings() {
  const { bookings, cancelBooking } = useBookingStore();
  const { myEntries, leaveQueue } = useQueueStore();
  const upcoming = bookings.filter((b) => b.status === "upcoming");
  const past = bookings.filter((b) => b.status === "past");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  return (
    <div className="flex flex-col">
      <header className="border-b border-border bg-card px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <h1 className="font-display text-2xl font-bold">As Minhas Reservas</h1>
      </header>

      <Tabs defaultValue="upcoming" className="p-4">
        <TabsList className="grid w-full grid-cols-3 rounded-full bg-muted">
          <TabsTrigger value="upcoming" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-gold">Próximas</TabsTrigger>
          <TabsTrigger value="past" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-gold">Passadas</TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-gold">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 ? <Empty /> : upcoming.map((b) => (
            <BookingCard key={b.id} b={b} onCancel={() => { cancelBooking(b.id); toast("Reserva cancelada"); }} />
          ))}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 ? <Empty /> : past.map((b) => <BookingCard key={b.id} b={b} variant="past" />)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length === 0 ? <Empty /> : cancelled.map((b) => <BookingCard key={b.id} b={b} variant="cancelled" />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-cream text-primary">
        <Scissors className="h-8 w-8" />
      </div>
      <div>
        <p className="font-display text-lg font-bold">Sem reservas ainda</p>
        <p className="text-xs text-muted-foreground">Explora barbearias perto de ti</p>
      </div>
      <Button asChild className="rounded-full bg-primary text-gold hover:bg-primary/90">
        <Link to="/">Explorar Barbearias</Link>
      </Button>
    </div>
  );
}

function BookingCard({ b, onCancel, variant = "upcoming" }: { b: any; onCancel?: () => void; variant?: "upcoming" | "past" | "cancelled" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-bold">{b.shopName}</h3>
          <p className="text-xs text-muted-foreground">{b.service}</p>
        </div>
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{formatKz(b.price)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5"><User2 className="h-3.5 w-3.5 text-gold" /> {b.barber}</div>
        <div className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-gold" /> {b.date}</div>
        <div className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-gold" /> {b.time}</div>
      </div>
      <div className="mt-3 flex gap-2">
        {variant === "upcoming" && (
          <Button onClick={onCancel} size="sm" variant="outline" className="flex-1 rounded-full">Cancelar</Button>
        )}
        {variant === "past" && (
          <>
            <Button size="sm" variant="outline" className="flex-1 rounded-full">Rebookar</Button>
            <Button size="sm" className="flex-1 rounded-full bg-primary text-gold hover:bg-primary/90">Avaliar</Button>
          </>
        )}
        {variant === "cancelled" && (
          <Button size="sm" className="flex-1 rounded-full bg-primary text-gold hover:bg-primary/90">Rebookar</Button>
        )}
      </div>
    </div>
  );
}
