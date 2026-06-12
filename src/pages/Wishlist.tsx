import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function Wishlist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { savedPhotos, fetchSaved, unsaveStyle } = useGalleryStore();

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  return (
    <div className="flex flex-col pb-6">
      <header className="flex items-center gap-2 bg-primary px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground">
        <button
          onClick={() => navigate(-1)}
          className="grid h-9 w-9 place-items-center rounded-full text-gold hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-gold">
          Estilos Guardados <span className="text-xs text-gold/70">({savedPhotos.length})</span>
        </h1>
      </header>

      {!user ? (
        <div className="m-4 rounded-2xl border border-dashed border-border p-8 text-center">
          <Heart className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm">Inicia sessão para guardar estilos</p>
          <Button onClick={() => navigate("/auth")} className="mt-3 rounded-full bg-primary text-gold">
            Entrar
          </Button>
        </div>
      ) : savedPhotos.length === 0 ? (
        <div className="m-4 rounded-2xl border border-dashed border-border p-8 text-center">
          <Heart className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm">Ainda não guardaste nenhum estilo</p>
          <Button asChild className="mt-3 rounded-full bg-gold text-primary hover:bg-gold/90">
            <Link to="/gallery">Explorar galeria</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {savedPhotos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Link to={`/gallery/style/${p.id}`}>
                <div className="aspect-square bg-muted">
                  {p.public_url && (
                    <img src={p.public_url} alt={p.style_name} className="h-full w-full object-cover" />
                  )}
                </div>
              </Link>
              <div className="flex items-center justify-between p-2">
                <p className="line-clamp-1 text-xs font-bold">{p.style_name}</p>
                <button
                  onClick={() => unsaveStyle(p.id)}
                  className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
                >
                  <Heart className="h-3.5 w-3.5 fill-gold text-gold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
