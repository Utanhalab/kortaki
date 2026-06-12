import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";
import { Input } from "@/components/ui/input";

export default function GallerySearch() {
  const navigate = useNavigate();
  const {
    categories,
    fetchCategories,
    search,
    searchQuery,
    searchResults,
    recentSearches,
    pushRecentSearch,
    clearRecentSearches,
    removeRecentSearch,
    setActiveCategory,
  } = useGalleryStore();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCategories();
    inputRef.current?.focus();
  }, [fetchCategories]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      search(q);
    }, 250);
  }, [q, search]);

  const submitSearch = (term: string) => {
    pushRecentSearch(term);
    setQ(term);
  };

  const pickCategory = (slug: string) => {
    setActiveCategory(slug);
    navigate("/gallery");
  };

  return (
    <div className="flex flex-col pb-6">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && q.trim() && submitSearch(q.trim())}
            placeholder="Pesquisar estilos, barbeiros..."
            className="h-10 rounded-full bg-muted pl-9 pr-9 text-sm"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full hover:bg-muted-foreground/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {!q && (
        <>
          {recentSearches.length > 0 && (
            <section className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pesquisas recentes
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-[10px] font-semibold text-gold underline"
                >
                  Limpar histórico
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs"
                  >
                    <button onClick={() => submitSearch(r)}>{r}</button>
                    <button onClick={() => removeRecentSearch(r)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Categorias
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickCategory(c.slug)}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-left"
                >
                  <span className="text-xl">{c.icon}</span>
                  <span className="font-display text-sm font-bold">{c.name_pt}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {q && (
        <div className="space-y-6 p-4">
          {searchResults.styles.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Estilos
              </h3>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
                {searchResults.styles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/gallery/style/${p.id}`)}
                    className="w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <div className="aspect-square bg-muted">
                      {p.public_url && (
                        <img src={p.public_url} alt={p.style_name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="line-clamp-1 p-2 text-[10px] font-semibold">{p.style_name}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {searchResults.barbers.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Barbeiros
              </h3>
              <div className="space-y-2">
                {searchResults.barbers.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/barber/${b.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-gold">
                      {b.avatar_url ? (
                        <img src={b.avatar_url} alt={b.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        b.name.charAt(0)
                      )}
                    </div>
                    <span className="font-display text-sm font-bold">{b.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {searchResults.shops.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Barbearias
              </h3>
              <div className="space-y-2">
                {searchResults.shops.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/shop/${s.id}`)}
                    className="w-full rounded-2xl border border-border bg-card p-3 text-left text-sm font-bold"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {!searchResults.styles.length &&
            !searchResults.barbers.length &&
            !searchResults.shops.length &&
            searchQuery && (
              <p className="text-center text-sm text-muted-foreground">Sem resultados</p>
            )}
        </div>
      )}
    </div>
  );
}
