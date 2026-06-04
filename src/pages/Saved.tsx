import { useShopStore } from "@/store/useStores";
import { shops } from "@/data/shops";
import { ShopCard } from "@/components/ShopCard";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Saved() {
  const { saved } = useShopStore();
  const list = shops.filter((s) => saved.includes(s.id));

  return (
    <div className="flex flex-col">
      <header className="border-b border-border bg-card px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <h1 className="font-display text-2xl font-bold">Guardados</h1>
        <p className="text-xs text-muted-foreground">{list.length} barbearias</p>
      </header>
      <div className="space-y-3 p-4">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-cream text-primary">
              <Heart className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted-foreground">Ainda não guardaste nenhuma barbearia</p>
            <Button asChild className="rounded-full bg-primary text-gold hover:bg-primary/90">
              <Link to="/">Explorar</Link>
            </Button>
          </div>
        ) : (
          list.map((s, i) => <ShopCard key={s.id} shop={s} index={i} />)
        )}
      </div>
    </div>
  );
}
