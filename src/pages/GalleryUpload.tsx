import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, ImageIcon, Upload } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StepHint } from "@/components/StepGate";

const TAG_OPTIONS = [
  "Cabelo curto",
  "Cabelo médio",
  "Cabelo longo",
  "Cabelo crespo",
  "Cabelo liso",
  "Pele clara",
  "Pele escura",
  "Manutenção fácil",
  "Manutenção intensa",
];

export default function GalleryUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, fetchCategories, uploadStyle } = useGalleryStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [styleName, setStyleName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [isPublic, setIsPublic] = useState(true);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [shopId, setShopId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("barbers")
        .select("id, shop_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setBarberId(data.id);
        setShopId(data.shop_id);
      }
    })();
  }, [user]);

  const onFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const publish = async () => {
    if (!file || !categoryId || !styleName || !barberId || !shopId) {
      toast.error("Preenche todos os campos");
      return;
    }
    setUploading(true);
    try {
      await uploadStyle(barberId, file, {
        categoryId,
        styleName,
        description,
        tags,
        serviceId: serviceId || undefined,
        shopId,
        isPublic,
      });
      toast.success("Estilo publicado! Começa a receber reservas.");
      navigate("/gallery");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao publicar");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm">Inicia sessão como barbeiro para publicar</p>
        <Button onClick={() => navigate("/auth")} className="mt-3">
          Entrar
        </Button>
      </div>
    );
  }

  if (!barberId) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Não tens perfil de barbeiro associado.
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      <header className="flex items-center gap-2 bg-primary px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full text-gold">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-gold">Adicionar ao Portfólio</h1>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-2 p-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              s <= step ? "bg-gold" : "bg-muted",
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="space-y-4 p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {preview ? (
            <div className="overflow-hidden rounded-2xl border border-border">
              <img src={preview} alt="preview" className="aspect-square w-full object-cover" />
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="font-display text-sm font-bold">Toca para adicionar foto</p>
              <div className="flex gap-3 text-muted-foreground">
                <Camera className="h-4 w-4" />
                <ImageIcon className="h-4 w-4" />
              </div>
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            📸 Usa boa iluminação para mais reservas
          </p>
          <StepHint message={!file ? "Selecciona uma foto" : null} />
          <Button
            disabled={!file}
            onClick={() => setStep(2)}
            className="w-full rounded-full bg-primary text-gold disabled:opacity-50"
          >
            {!file ? "Selecciona uma foto" : "Continuar"}
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 p-4">
          <div>
            <label className={cn("mb-2 block text-xs font-bold uppercase", !categoryId ? "text-primary" : "text-muted-foreground")}>
              Categoria *
            </label>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.slug !== "trending")
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold",
                      categoryId === c.id
                        ? "border-primary bg-primary text-gold"
                        : "border-border bg-card",
                    )}
                  >
                    {c.icon} {c.name_pt}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className={cn("mb-1 block text-xs font-bold uppercase", categoryId && !styleName ? "text-primary" : "text-muted-foreground")}>
              Nome do estilo *
            </label>
            <Input
              maxLength={50}
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              placeholder="Fade Alto com Risca"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
              Descrição (opcional)
            </label>
            <Textarea
              maxLength={150}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do corte..."
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-semibold",
                    tags.includes(t)
                      ? "border-gold bg-gold/15 text-primary"
                      : "border-border bg-card",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
              Serviço associado (opcional)
            </label>
            <Input
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              placeholder="Ex: Fade, Barba, Tranças"
            />
          </div>

          <StepHint message={!categoryId ? "Selecciona uma categoria" : !styleName ? "Indica o nome do estilo" : null} />
          <div className="flex gap-2">
            <Button onClick={() => setStep(1)} variant="outline" className="flex-1 rounded-full">
              Voltar
            </Button>
            <Button
              disabled={!categoryId || !styleName}
              onClick={() => setStep(3)}
              className="flex-1 rounded-full bg-primary text-gold disabled:opacity-50"
            >
              {!categoryId ? "Selecciona uma categoria" : !styleName ? "Nome do estilo" : "Pré-visualizar"}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 p-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {preview && (
              <div className="relative aspect-square bg-muted">
                <img src={preview} alt="preview" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
                  <p className="font-bold text-white">{styleName}</p>
                </div>
              </div>
            )}
            {description && (
              <p className="p-3 text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <span className="text-sm font-medium">Visível na galeria pública</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setStep(2)} variant="outline" className="flex-1 rounded-full">
              Voltar
            </Button>
            <Button
              disabled={uploading}
              onClick={publish}
              className="flex-1 rounded-full bg-gold font-bold text-primary hover:bg-gold/90"
            >
              {uploading ? "A publicar…" : "Publicar Estilo"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
