import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const { user, signInWithPassword, signUpWithPassword, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (mode: "signin" | "signup") => {
    setBusy(true);
    const { error } = mode === "signin"
      ? await signInWithPassword(email, password)
      : await signUpWithPassword(email, password, name);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "signin" ? "Bem-vindo!" : "Conta criada!");
    navigate("/");
  };

  const google = async () => {
    setBusy(true);
    try { await signInWithGoogle(); }
    catch (e: any) { toast.error(e?.message ?? "Falhou"); setBusy(false); }
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 px-6 pb-10">
        <div className="mt-2 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary"><Scissors className="h-5 w-5 text-gold" /></div>
          <span className="font-display text-2xl font-bold text-primary">CutNear</span>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold leading-tight">Entrar na sua conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Para reservar, juntar-se a filas e receber notificações.</p>

        <Button onClick={google} disabled={busy} variant="outline" className="mt-6 h-12 w-full rounded-2xl">
          Continuar com Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> OU <span className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted">
            <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-gold">Entrar</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-gold">Criar Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-5 space-y-3">
            <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" /></Field>
            <Field label="Palavra-passe"><Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" /></Field>
            <Button onClick={() => submit("signin")} disabled={busy} className="h-12 w-full rounded-2xl bg-primary text-gold hover:bg-primary/90">
              Entrar
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="mt-5 space-y-3">
            <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" /></Field>
            <Field label="Palavra-passe (mín. 6)"><Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" /></Field>
            <Button onClick={() => submit("signup")} disabled={busy} className="h-12 w-full rounded-2xl bg-primary text-gold hover:bg-primary/90">
              Criar Conta
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
