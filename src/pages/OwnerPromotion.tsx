import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shops } from "@/data/shops";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN = `https://${PROJECT_ID}.supabase.co/functions/v1/send-promotion`;

export default function OwnerPromotion() {
  const navigate = useNavigate();
  const [shopId, setShopId] = useState<number>(shops[0].id);
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"saved" | "all" | "recent_30">("all");
  const [sending, setSending] = useState(false);
  const shop = shops.find((s) => s.id === shopId)!;

  const send = async () => {
    if (!message.trim()) return toast.error("Escreva uma mensagem");
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Inicie sessão como dono"); setSending(false); return; }
      const r = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ shop_id: shopId, shop_name: shop.name, message, audience }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.toString() ?? "Falhou");
      toast.success(`Notificação enviada a ${j.recipients ?? 0} clientes`);
      setMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "Falhou");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold">Enviar Promoção</h1>
      </header>

      <div className="space-y-4 p-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Barbearia</label>
          <Select value={String(shopId)} onValueChange={(v) => setShopId(Number(v))}>
            <SelectTrigger className="mt-1 h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {shops.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagem</label>
            <span className="text-[10px] text-muted-foreground">{message.length}/120</span>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 120))}
            placeholder="Ex.: Esta semana, 20% de desconto em todos os fades!"
            className="mt-1 min-h-[100px] rounded-2xl"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audiência</label>
          <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
            <SelectTrigger className="mt-1 h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="saved">Clientes guardados</SelectItem>
              <SelectItem value="all">Todos que já visitaram</SelectItem>
              <SelectItem value="recent_30">Visitaram nos últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização</p>
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary">
                <Scissors className="h-5 w-5 text-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-muted-foreground">CutNear · agora</p>
                <p className="truncate text-sm font-bold">🎉 Oferta em {shop.name}</p>
                <p className="line-clamp-2 text-[12px] text-muted-foreground">{message || "A sua mensagem aparecerá aqui..."}</p>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={send} disabled={sending || !message.trim()} className="h-14 w-full rounded-2xl bg-primary text-gold hover:bg-primary/90">
          <Megaphone className="mr-2 h-5 w-5" /> {sending ? "A enviar..." : "Enviar Promoção"}
        </Button>
      </div>
    </div>
  );
}
