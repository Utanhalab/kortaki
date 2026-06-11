import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Scissors, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifica o teu email.");
        navigate(redirect);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirect);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro de autenticação");
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com Google");
        return;
      }
      if (result.redirected) return;
      navigate(redirect);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-primary text-primary-foreground">
      <header className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-gold">
          <ArrowLeft className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gold/15">
            <Scissors className="h-6 w-6 text-gold" />
          </div>
          <span className="font-display text-2xl font-bold text-gold">CutNear</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-white">
          {mode === "signin" ? "Bem-vindo de volta" : "Cria a tua conta"}
        </h1>
        <p className="mt-1 text-sm text-gold/80">
          {mode === "signin" ? "Entra para reservar e guardar barbeiros" : "Para reservar e avaliar barbeiros"}
        </p>

        <Button
          type="button"
          onClick={withGoogle}
          disabled={busy}
          className="mt-6 h-12 w-full rounded-full bg-white font-display font-bold text-primary hover:bg-white/90"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.7 35.6 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
          Continuar com Google
        </Button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-[10px] uppercase tracking-wider text-gold/60">ou</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        <form onSubmit={withEmail} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label className="text-xs text-gold/80">Nome</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="O teu nome"
                className="mt-1 h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
              />
            </div>
          )}
          <div>
            <Label className="text-xs text-gold/80">Email</Label>
            <Input
              required type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="mt-1 h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <Label className="text-xs text-gold/80">Palavra-passe</Label>
            <Input
              required type="password" minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <Button
            type="submit" disabled={busy}
            className="h-12 w-full rounded-full bg-gold font-display font-bold text-primary hover:bg-gold/90"
          >
            {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-center text-sm text-gold/80"
        >
          {mode === "signin" ? (
            <>Não tens conta? <span className="font-bold text-gold underline">Criar agora</span></>
          ) : (
            <>Já tens conta? <span className="font-bold text-gold underline">Entrar</span></>
          )}
        </button>
      </div>
    </div>
  );
}
