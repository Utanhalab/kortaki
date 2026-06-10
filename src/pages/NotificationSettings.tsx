import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications, sendNotification } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Prefs = {
  reminder_24h: boolean;
  reminder_60: boolean;
  reminder_15: boolean;
  queue_alerts: boolean;
  promotions: boolean;
  booking_confirmed: boolean;
  booking_cancelled: boolean;
};

const DEFAULTS: Prefs = {
  reminder_24h: true, reminder_60: true, reminder_15: true,
  queue_alerts: true, promotions: true, booking_confirmed: true, booking_cancelled: true,
};

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const push = usePushNotifications();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [confirmOff, setConfirmOff] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setPrefs(data as any);
    })();
  }, [user]);

  const update = async (patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    if (!user) return;
    await supabase.from("notification_preferences").upsert({ user_id: user.id, ...prefs, ...patch });
  };

  const disableAll = async () => {
    const off = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, false])) as Prefs;
    setPrefs(off);
    if (user) await supabase.from("notification_preferences").upsert({ user_id: user.id, ...off });
    await push.unsubscribe();
    toast("Notificações desativadas");
  };

  const test = async () => {
    if (!user) return toast.error("Inicie sessão primeiro");
    if (!push.subscribed) {
      try { await push.subscribe(); } catch (e: any) { return toast.error(e?.message ?? "Falhou"); }
    }
    await sendNotification({
      user_id: user.id,
      title: "✂️ Notificação de teste",
      body: "Está tudo a funcionar! Vai receber alertas em tempo real.",
      type: "test",
      url: "/notifications",
    });
    toast.success("Enviada — verifique a notificação");
  };

  return (
    <div className="flex flex-col pb-8">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold">Notificações</h1>
      </header>

      <div className="space-y-4 p-4">
        {!user && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-sm">
            <p className="text-muted-foreground">Inicie sessão para gerir as suas notificações</p>
            <Button onClick={() => navigate("/auth")} className="mt-3 rounded-full bg-primary text-gold">Entrar</Button>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-bold">Permissão do dispositivo</p>
              <p className="text-xs text-muted-foreground">
                {push.status === "granted" && push.subscribed ? "Ativadas neste dispositivo" :
                  push.status === "denied" ? "Bloqueadas no navegador" :
                  push.status === "unsupported" ? "Não suportado" : "Por ativar"}
              </p>
            </div>
            {push.status === "granted" && push.subscribed ? (
              <Button variant="outline" size="sm" onClick={push.unsubscribe} className="rounded-full">
                <BellOff className="mr-1 h-3.5 w-3.5" /> Desativar
              </Button>
            ) : (
              <Button size="sm" onClick={() => push.subscribe().catch((e) => toast.error(e?.message ?? "Falhou"))}
                disabled={!user || push.status === "unsupported" || push.status === "denied"}
                className="rounded-full bg-primary text-gold">
                <Bell className="mr-1 h-3.5 w-3.5" /> Ativar
              </Button>
            )}
          </div>
          {push.status === "denied" && (
            <p className="mt-3 rounded-xl bg-muted p-3 text-[11px] text-muted-foreground">
              As notificações estão bloqueadas. Vá às definições do site no seu navegador e permita notificações para reactivar.
            </p>
          )}
        </div>

        <Section title="Lembretes de reserva">
          <Row label="24h antes" checked={prefs.reminder_24h} onChange={(v) => update({ reminder_24h: v })} />
          <Row label="1h antes" checked={prefs.reminder_60} onChange={(v) => update({ reminder_60: v })} />
          <Row label="15 min antes" checked={prefs.reminder_15} onChange={(v) => update({ reminder_15: v })} />
        </Section>

        <Section title="Tempo real">
          <Row label="É a sua vez! (fila)" checked={prefs.queue_alerts} onChange={(v) => update({ queue_alerts: v })} />
          <Row label="Reserva confirmada" checked={prefs.booking_confirmed} onChange={(v) => update({ booking_confirmed: v })} />
          <Row label="Reserva cancelada" checked={prefs.booking_cancelled} onChange={(v) => update({ booking_cancelled: v })} />
        </Section>

        <Section title="Marketing">
          <Row label="Promoções e ofertas" sub="Recebe ofertas das barbearias guardadas" checked={prefs.promotions} onChange={(v) => update({ promotions: v })} />
        </Section>

        <div className="space-y-2">
          <Button variant="outline" onClick={test} className="w-full rounded-full">Testar notificação</Button>
          <Button variant="ghost" onClick={() => setConfirmOff(true)} className="w-full rounded-full text-destructive hover:text-destructive">
            Desativar tudo
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar todas as notificações?</AlertDialogTitle>
            <AlertDialogDescription>Não vai receber lembretes nem alertas de fila. Pode reactivar a qualquer momento.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={disableAll} className="bg-destructive text-destructive-foreground">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </section>
  );
}

function Row({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
