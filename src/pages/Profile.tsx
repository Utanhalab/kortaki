import { Bell, MapPin, Languages, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { useBookingStore, useShopStore } from "@/store/useStores";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { shops } from "@/data/shops";
import { Link } from "react-router-dom";

export default function Profile() {
  const { bookings } = useBookingStore();
  const { saved } = useShopStore();
  const [lang, setLang] = useState(true);

  const settings = [
    { icon: Bell, label: "Notificações", right: <Switch defaultChecked /> },
    { icon: MapPin, label: "Localização", right: <Switch defaultChecked /> },
    { icon: Languages, label: "Idioma", right: <span className="text-xs font-semibold text-gold">{lang ? "PT" : "EN"}</span>, onClick: () => setLang(!lang) },
    { icon: HelpCircle, label: "Ajuda", right: <ChevronRight className="h-4 w-4 text-muted-foreground" /> },
    { icon: LogOut, label: "Terminar Sessão", right: <ChevronRight className="h-4 w-4 text-muted-foreground" />, danger: true },
  ];

  const stats = [
    { label: "Reservas", value: bookings.length },
    { label: "Guardadas", value: saved.length },
    { label: "Avaliações", value: 0 },
  ];

  return (
    <div className="flex flex-col">
      <header className="bg-primary px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gold font-display text-2xl font-bold text-primary">
            JD
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">João Domingos</h1>
            <p className="text-xs text-gold/80">joao.d@cutnear.ao</p>
          </div>
        </div>
      </header>

      <div className="-mt-5 px-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-xl font-bold text-primary">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="px-4 pt-4">
        <Link
          to="/dashboard"
          className="flex items-center justify-between rounded-2xl border-2 border-gold bg-primary p-4 text-gold"
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gold/70">Para barbeiros</p>
            <p className="font-display text-base font-bold">Painel do Dono</p>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </section>

      <section className="p-4">
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Definições</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {settings.map((s, i) => (
            <button
              key={s.label}
              onClick={s.onClick}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${i > 0 ? "border-t border-border" : ""} ${s.danger ? "text-destructive" : ""}`}
            >
              <div className="flex items-center gap-3">
                <s.icon className={`h-4 w-4 ${s.danger ? "text-destructive" : "text-gold"}`} />
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {s.right}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 pb-6">
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Barbearias Guardadas</h2>
        {saved.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            Nenhuma barbearia guardada
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {shops.filter((s) => saved.includes(s.id)).map((s) => (
              <Link key={s.id} to={`/shop/${s.id}`} className="rounded-2xl border border-border bg-card p-3">
                <p className="font-display text-sm font-bold">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.address}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
