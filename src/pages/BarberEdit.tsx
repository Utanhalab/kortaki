import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Camera, Plus, Trash2, GripVertical } from "lucide-react";
import { useBarberStore, type Barber, type BarberHours } from "@/store/useBarberStore";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SPECIALTIES, LANGUAGE_FLAGS } from "@/data/specialties";
import { servicesCatalog, shops } from "@/data/shops";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function BarberEdit() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const overrideId = params.get("id");
  const store = useBarberStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [barberId, setBarberId] = useState<string | null>(overrideId);
  const [form, setForm] = useState<Partial<Barber>>({});
  const [hours, setHours] = useState<Omit<BarberHours, "id" | "barber_id">[]>([]);
  const [photoLabel, setPhotoLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth?redirect=/dashboard/barber/profile"); return; }
    (async () => {
      let id = overrideId;
      if (!id) {
        const { data } = await (supabase as any).from("barbers").select("id").eq("user_id", user.id).maybeSingle();
        id = data?.id ?? null;
      }
      if (id) {
        setBarberId(id);
        const b = await store.fetchBarber(id);
        if (b) setForm(b);
        const h = await store.fetchHours(id);
        const filled = Array.from({ length: 7 }, (_, dow) => {
          const found = h.find((x) => x.day_of_week === dow);
          return found
            ? { day_of_week: dow, is_working: found.is_working, start_time: found.start_time.slice(0, 5), end_time: found.end_time.slice(0, 5), break_start: found.break_start?.slice(0, 5) ?? null, break_end: found.break_end?.slice(0, 5) ?? null }
            : { day_of_week: dow, is_working: dow !== 0, start_time: "09:00", end_time: "20:00", break_start: "13:00", break_end: "14:00" };
        });
        setHours(filled);
        await store.fetchPortfolio(id);
      }
    })();
  }, [loading, user, overrideId, navigate]); // eslint-disable-line

  if (loading) return null;

  if (!barberId) {
    return (
      <div className="flex flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <button onClick={() => navigate("/dashboard")} className="grid h-9 w-9 place-items-center rounded-full bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="font-display text-base font-bold">Perfil do Barbeiro</h1>
        </header>
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Não tens um perfil de barbeiro associado a esta conta. Pede ao dono da loja para te adicionar à equipa, ou escolhe um barbeiro abaixo (modo demo).
          </p>
          <DemoPicker onPick={setBarberId} />
        </div>
      </div>
    );
  }

  const photos = store.portfolios[barberId] ?? [];

  function set<K extends keyof Barber>(k: K, v: Barber[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleSpec(s: string) {
    const cur = form.specialties ?? [];
    set("specialties", cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  }

  function toggleLang(l: string) {
    const cur = form.languages ?? [];
    set("languages", cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]);
  }

  function setDay(dow: number, patch: Partial<typeof hours[number]>) {
    setHours((arr) => arr.map((h) => (h.day_of_week === dow ? { ...h, ...patch } : h)));
  }

  function applyToAll() {
    const ref = hours.find((h) => h.is_working);
    if (!ref) return;
    setHours((arr) => arr.map((h) => h.is_working ? { ...h, start_time: ref.start_time, end_time: ref.end_time, break_start: ref.break_start, break_end: ref.break_end } : h));
    toast.success("Aplicado a toda a semana");
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !barberId) return;
    try {
      await store.uploadPortfolioPhoto(barberId, f, photoLabel);
      setPhotoLabel("");
      toast.success("Foto adicionada");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao carregar");
    }
    e.target.value = "";
  }

  async function save() {
    if (!barberId) return;
    setBusy(true);
    try {
      await store.updateProfile(barberId, {
        name: form.name,
        tagline: form.tagline ?? null,
        bio: form.bio ?? null,
        experience_years: form.experience_years ?? 1,
        languages: form.languages ?? [],
        specialties: form.specialties ?? [],
      });
      await store.saveHours(barberId, hours.map((h) => ({
        day_of_week: h.day_of_week,
        is_working: h.is_working,
        start_time: h.start_time,
        end_time: h.end_time,
        break_start: h.break_start || null,
        break_end: h.break_end || null,
      })));
      toast.success("Perfil guardado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro a guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col pb-32">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <button onClick={() => navigate("/dashboard")} className="grid h-9 w-9 place-items-center rounded-full bg-muted"><ArrowLeft className="h-4 w-4" /></button>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Editar</p>
          <h1 className="font-display text-base font-bold leading-tight">{form.name ?? "Perfil"}</h1>
        </div>
        {barberId && (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to={`/barber/${barberId}`}>Ver</Link>
          </Button>
        )}
      </header>

      <div className="space-y-6 p-4">
        {/* 1 — Basic Info */}
        <Section title="1. Informação">
          <div className="flex items-center gap-3">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary font-display text-2xl font-bold text-gold">
              {(form.name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          </div>
          <FormRow label="Nome">
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </FormRow>
          <FormRow label="Tagline (max 60)">
            <Input
              value={form.tagline ?? ""}
              maxLength={60}
              placeholder="ex: Especialista em Fades & Degradês"
              onChange={(e) => set("tagline", e.target.value)}
            />
          </FormRow>
          <FormRow label={`Bio (${(form.bio?.length ?? 0)}/200)`}>
            <Textarea
              value={form.bio ?? ""} maxLength={200}
              onChange={(e) => set("bio", e.target.value)}
              className="min-h-[80px]"
            />
          </FormRow>
          <FormRow label="Anos de experiência">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9 w-9 rounded-full"
                onClick={() => set("experience_years", Math.max(1, (form.experience_years ?? 1) - 1))}>−</Button>
              <span className="w-10 text-center font-display text-lg font-bold">{form.experience_years ?? 1}</span>
              <Button type="button" variant="outline" size="sm" className="h-9 w-9 rounded-full"
                onClick={() => set("experience_years", Math.min(40, (form.experience_years ?? 1) + 1))}>+</Button>
            </div>
          </FormRow>
          <FormRow label="Idiomas">
            <div className="flex flex-wrap gap-2">
              {["Português", "English", "Français", "Other"].map((l) => {
                const on = (form.languages ?? []).includes(l);
                return (
                  <button key={l} type="button" onClick={() => toggleLang(l)}
                    className={cn("rounded-full border px-3 py-1 text-xs",
                      on ? "border-gold bg-gold/15 text-primary" : "border-border bg-card text-muted-foreground")}>
                    {LANGUAGE_FLAGS[l] ?? "🌐"} {l}
                  </button>
                );
              })}
            </div>
          </FormRow>
        </Section>

        {/* 2 — Specialties */}
        <Section title="2. Especialidades">
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map((s) => {
              const on = (form.specialties ?? []).includes(s.key);
              return (
                <button key={s.key} type="button" onClick={() => toggleSpec(s.key)}
                  className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-semibold",
                    on ? "border-gold bg-gold/10" : "border-border bg-card")}>
                  <span>{s.emoji}</span> {s.key}
                  {on && <span className="ml-auto text-[10px] text-gold">✓</span>}
                </button>
              );
            })}
          </div>
        </Section>

        {/* 3 — Portfolio */}
        <Section title="3. Portfólio">
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                <img src={p.public_url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => store.deletePortfolioPhoto(p.id)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                {p.style_label && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 text-[9px] font-semibold text-white">
                    {p.style_label}
                  </span>
                )}
              </div>
            ))}
            {photos.length < 30 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-border bg-card text-muted-foreground hover:border-gold hover:text-gold"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
          <Input
            placeholder="Etiqueta do próximo upload (ex: Fade Médio)"
            value={photoLabel}
            onChange={(e) => setPhotoLabel(e.target.value)}
            className="mt-2"
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
        </Section>

        {/* 4 — Hours */}
        <Section title="4. Horário Semanal" action={
          <button onClick={applyToAll} className="text-[11px] font-semibold text-gold">Aplicar a toda a semana</button>
        }>
          <div className="space-y-2">
            {hours.map((h) => (
              <div key={h.day_of_week} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold">{DAYS[h.day_of_week]}</span>
                  <Switch checked={h.is_working} onCheckedChange={(v) => setDay(h.day_of_week, { is_working: v })} />
                </div>
                {h.is_working && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <TimeField label="Início" value={h.start_time} onChange={(v) => setDay(h.day_of_week, { start_time: v })} />
                    <TimeField label="Fim" value={h.end_time} onChange={(v) => setDay(h.day_of_week, { end_time: v })} />
                    <TimeField label="Pausa início" value={h.break_start ?? ""} onChange={(v) => setDay(h.day_of_week, { break_start: v || null })} />
                    <TimeField label="Pausa fim" value={h.break_end ?? ""} onChange={(v) => setDay(h.day_of_week, { break_end: v || null })} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* 5 — Services note */}
        <Section title="5. Serviços oferecidos">
          <p className="text-xs text-muted-foreground">
            Para a versão de demo, são usados os serviços da barbearia.
          </p>
          <div className="mt-2 space-y-1">
            {servicesCatalog.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
                <span>{s.name} · {s.duration} min</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background p-3">
        <Button onClick={save} disabled={busy} className="h-12 w-full rounded-full bg-primary font-display text-base font-bold text-gold hover:bg-primary/90">
          {busy ? "A guardar…" : "Guardar Perfil"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
      />
    </label>
  );
}

function DemoPicker({ onPick }: { onPick: (id: string) => void }) {
  const [list, setList] = useState<{ id: string; name: string; shop_id: number }[]>([]);
  useEffect(() => {
    (supabase as any).from("barbers").select("id,name,shop_id").order("name").limit(20).then(({ data }: any) => setList(data ?? []));
  }, []);
  return (
    <div className="mt-4 space-y-2 text-left">
      {list.map((b) => {
        const s = shops.find((x) => x.id === b.shop_id);
        return (
          <button key={b.id} onClick={() => onPick(b.id)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm">
            <span>{b.name}</span>
            <span className="text-[10px] text-muted-foreground">{s?.name}</span>
          </button>
        );
      })}
    </div>
  );
}
