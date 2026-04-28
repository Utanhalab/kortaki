import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ============================================================
// 🔑 REPLACE THIS WITH YOUR GOOGLE API KEY
// Note: Google Places API does NOT support direct browser calls (CORS).
// Use a backend proxy, a CORS-enabled gateway, or run via a serverless
// function that forwards requests to maps.googleapis.com.
// ============================================================
const GOOGLE_API_KEY = "YOUR_API_KEY_HERE";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=70";

// ---------- Helpers ----------
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(km, units) {
  if (units === "mi") {
    const mi = km * 0.621371;
    return `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
  }
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function todaysHours(openingHours) {
  if (!openingHours?.weekday_text) return null;
  const idx = (new Date().getDay() + 6) % 7; // Google: Monday=0
  return openingHours.weekday_text[idx];
}

function photoUrl(ref, maxwidth = 400) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${GOOGLE_API_KEY}`;
}

// ---------- Component ----------
export default function Index() {
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(true);
  const [locError, setLocError] = useState(null);
  const [manualAddr, setManualAddr] = useState("");

  const [places, setPlaces] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [radius, setRadius] = useState(2000);
  const [search, setSearch] = useState("");
  const [units, setUnits] = useState("km");
  const [view, setView] = useState("list"); // list | map (mobile)
  const [sortBy, setSortBy] = useState("nearest");
  const [filters, setFilters] = useState({
    openNow: false,
    topRated: false,
    within1km: false,
    mostReviews: false,
  });

  // ---------- Geolocation ----------
  const detectLocation = useCallback(() => {
    setLocating(true);
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported by your browser.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocError(err.message || "Permission denied.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const geocodeManual = useCallback(async () => {
    if (!manualAddr.trim()) return;
    setLocating(true);
    setLocError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          manualAddr
        )}&format=json&limit=1`
      );
      const data = await res.json();
      if (!data.length) throw new Error("Address not found.");
      setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    } catch (e) {
      setLocError(e.message);
    } finally {
      setLocating(false);
    }
  }, [manualAddr]);

  // ---------- Fetch barbershops ----------
  const fetchPlaces = useCallback(async () => {
    if (!coords) return;
    setFetching(true);
    setApiError(null);
    try {
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=${radius}&type=hair_care&keyword=barbershop&key=${GOOGLE_API_KEY}`;
      const r = await fetch(nearbyUrl);
      if (!r.ok) throw new Error(`Places API error: ${r.status}`);
      const data = await r.json();
      if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(data.error_message || data.status);
      }
      const results = data.results || [];

      // Fetch details in parallel (limit a bit)
      const detailed = await Promise.all(
        results.slice(0, 20).map(async (p) => {
          try {
            const dUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=name,formatted_address,formatted_phone_number,opening_hours,rating,user_ratings_total,photos,website,geometry,url&key=${GOOGLE_API_KEY}`;
            const dr = await fetch(dUrl);
            const dj = await dr.json();
            return { ...p, ...(dj.result || {}) };
          } catch {
            return p;
          }
        })
      );
      setPlaces(detailed);
    } catch (e) {
      setApiError(e.message || "Failed to fetch barbershops.");
      setPlaces([]);
    } finally {
      setFetching(false);
    }
  }, [coords, radius]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // ---------- Derived list ----------
  const enriched = useMemo(() => {
    if (!coords) return [];
    return places.map((p) => {
      const lat = p.geometry?.location?.lat;
      const lng = p.geometry?.location?.lng;
      const distKm =
        lat != null && lng != null
          ? haversine(coords.lat, coords.lng, lat, lng)
          : Infinity;
      return { ...p, _distKm: distKm };
    });
  }, [places, coords]);

  const filtered = useMemo(() => {
    let arr = enriched.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.name || ""} ${p.formatted_address || p.vicinity || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.openNow && !(p.opening_hours?.open_now)) return false;
      if (filters.topRated && !(p.rating >= 4)) return false;
      if (filters.within1km && !(p._distKm <= 1)) return false;
      if (filters.mostReviews && !((p.user_ratings_total || 0) >= 100)) return false;
      return true;
    });

    if (sortBy === "nearest") arr.sort((a, b) => a._distKm - b._distKm);
    if (sortBy === "rating") arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === "reviews")
      arr.sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0));
    return arr;
  }, [enriched, search, filters, sortBy]);

  const toggleFilter = (k) =>
    setFilters((f) => ({ ...f, [k]: !f[k] }));

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F0E8] font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        @keyframes pulseRing {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pulse-ring {
          animation: pulseRing 2s cubic-bezier(0.215,0.61,0.355,1) infinite;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-in { animation: cardIn 0.5s ease-out both; }
        .card-photo { transition: transform 0.6s ease; }
        .card:hover .card-photo { transform: scale(1.08); }
        .card { transition: box-shadow 0.3s ease, border-color 0.3s ease; }
        .card:hover { box-shadow: 0 0 30px rgba(200,134,58,0.25); border-color: #C8863A; }
        .chip-active { background: #C8863A; color: #0D0D0D; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          height: 18px; width: 18px; border-radius: 50%;
          background: #C8863A; cursor: pointer; border: 2px solid #0D0D0D;
        }
        input[type=range] { -webkit-appearance: none; height: 4px; background: #2a2a2a; border-radius: 4px; }
      `}</style>

      {/* ===== Loading screen ===== */}
      {locating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0D0D0D]">
          <div className="relative h-32 w-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#C8863A] pulse-ring" />
            <div className="absolute inset-0 rounded-full border-2 border-[#C8863A] pulse-ring" style={{ animationDelay: "0.6s" }} />
            <div className="absolute inset-0 rounded-full border-2 border-[#C8863A] pulse-ring" style={{ animationDelay: "1.2s" }} />
            <div className="h-3 w-3 rounded-full bg-[#C8863A]" />
          </div>
          <h2 className="font-display text-3xl mt-8">Finding your location</h2>
          <p className="text-sm opacity-60 mt-2">Sharpening the clippers…</p>
        </div>
      )}

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[#0D0D0D]/90 border-b border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#C8863A] flex items-center justify-center text-[#0D0D0D] font-display text-xl">B</div>
            <div>
              <h1 className="font-display text-2xl leading-none">FADE FINDER</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-60">Nearby Barbershops</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnits(units === "km" ? "mi" : "km")}
              className="text-xs uppercase tracking-wider border border-[#2a2a2a] px-3 py-1.5 rounded hover:border-[#C8863A]"
            >
              {units}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Location error banner / manual input */}
        {locError && !locating && (
          <div className="mb-6 rounded-lg border border-[#C8863A]/40 bg-[#1A1A1A] p-4">
            <p className="text-sm mb-3">
              <span className="text-[#C8863A] font-bold">Location unavailable:</span>{" "}
              {locError} Enter a city or address instead.
            </p>
            <div className="flex gap-2">
              <input
                value={manualAddr}
                onChange={(e) => setManualAddr(e.target.value)}
                placeholder="e.g. Brooklyn, NY"
                className="flex-1 bg-[#0D0D0D] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#C8863A]"
                onKeyDown={(e) => e.key === "Enter" && geocodeManual()}
              />
              <button
                onClick={geocodeManual}
                className="bg-[#C8863A] text-[#0D0D0D] px-4 py-2 rounded text-sm font-bold uppercase tracking-wider"
              >
                Search
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        {coords && (
          <section className="mb-6 space-y-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or address…"
              className="w-full bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C8863A]"
            />

            <div className="flex flex-wrap gap-2">
              {[
                ["openNow", "Open Now"],
                ["topRated", "Top Rated 4★+"],
                ["within1km", "Within 1km"],
                ["mostReviews", "Most Reviews"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => toggleFilter(k)}
                  className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border border-[#2a2a2a] hover:border-[#C8863A] ${
                    filters[k] ? "chip-active border-[#C8863A]" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider opacity-70 mb-2">
                  <span>Radius</span>
                  <span className="text-[#C8863A] font-bold">
                    {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={500}
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider opacity-70">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#1A1A1A] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#C8863A]"
                >
                  <option value="nearest">Nearest</option>
                  <option value="rating">Highest Rated</option>
                  <option value="reviews">Most Reviewed</option>
                </select>
              </div>
            </div>

            {/* Mobile view toggle */}
            <div className="flex md:hidden gap-2">
              {["list", "map"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex-1 py-2 text-xs uppercase tracking-wider rounded border border-[#2a2a2a] ${
                    view === v ? "chip-active" : ""
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Layout: list + map */}
        {coords && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* List */}
            <section
              className={`md:w-3/5 ${view === "map" ? "hidden md:block" : "block"}`}
            >
              {fetching && (
                <div className="text-center py-12 opacity-70 text-sm uppercase tracking-wider">
                  Fetching nearby barbershops…
                </div>
              )}
              {apiError && !fetching && (
                <div className="rounded-lg border border-red-500/40 bg-[#1A1A1A] p-6 text-center">
                  <p className="text-sm mb-3">
                    <span className="text-red-400 font-bold">Error:</span> {apiError}
                  </p>
                  <p className="text-xs opacity-60 mb-4">
                    Note: Google Places API requires a backend proxy due to browser CORS restrictions.
                  </p>
                  <button
                    onClick={fetchPlaces}
                    className="bg-[#C8863A] text-[#0D0D0D] px-4 py-2 rounded text-sm font-bold uppercase tracking-wider"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!fetching && !apiError && enriched.length === 0 && (
                <div className="text-center py-12 opacity-70 text-sm">
                  No barbershops found nearby. Try increasing the radius.
                </div>
              )}
              {!fetching && !apiError && enriched.length > 0 && filtered.length === 0 && (
                <div className="text-center py-12 opacity-70 text-sm">
                  No results match your filters.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {filtered.map((p, i) => (
                  <ShopCard
                    key={p.place_id || i}
                    shop={p}
                    units={units}
                    delay={i * 50}
                  />
                ))}
              </div>
            </section>

            {/* Map */}
            <aside
              className={`md:w-2/5 ${view === "list" ? "hidden md:block" : "block"}`}
            >
              <div className="md:sticky md:top-24 rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#1A1A1A] h-[60vh] md:h-[calc(100vh-8rem)]">
                <iframe
                  title="Map of nearby barbershops"
                  className="w-full h-full"
                  style={{ border: 0, filter: "grayscale(0.2) contrast(1.05)" }}
                  loading="lazy"
                  src={`https://www.google.com/maps/embed/v1/search?q=barbershop&center=${coords.lat},${coords.lng}&zoom=14&key=${GOOGLE_API_KEY}`}
                />
              </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-[10px] uppercase tracking-widest opacity-40">
        Powered by Google Places · Built for the cut
      </footer>
    </div>
  );
}

// ---------- Card ----------
function ShopCard({ shop, units, delay }) {
  const [imgErr, setImgErr] = useState(false);
  const photoRef = shop.photos?.[0]?.photo_reference;
  const img = !imgErr && photoRef ? photoUrl(photoRef) : PLACEHOLDER_IMG;
  const open = shop.opening_hours?.open_now;
  const today = todaysHours(shop.opening_hours);
  const lat = shop.geometry?.location?.lat;
  const lng = shop.geometry?.location?.lng;

  return (
    <article
      className="card card-in bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg overflow-hidden flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative h-44 overflow-hidden bg-[#0D0D0D]">
        <img
          src={img}
          onError={() => setImgErr(true)}
          alt={shop.name}
          className="card-photo w-full h-full object-cover"
          loading="lazy"
        />
        {open != null && (
          <span
            className={`absolute top-3 left-3 text-[10px] uppercase tracking-widest px-2 py-1 rounded ${
              open ? "bg-[#C8863A] text-[#0D0D0D]" : "bg-[#0D0D0D]/80 text-[#F5F0E8] border border-[#2a2a2a]"
            }`}
          >
            {open ? "Open Now" : "Closed"}
          </span>
        )}
        {shop._distKm !== Infinity && (
          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-[#0D0D0D]/80 border border-[#2a2a2a]">
            {formatDistance(shop._distKm, units)}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-display text-2xl leading-tight">{shop.name}</h3>
        <p className="text-xs opacity-70 mt-1 line-clamp-2">
          {shop.formatted_address || shop.vicinity}
        </p>

        <div className="flex items-center gap-3 mt-3 text-sm">
          {shop.rating != null && (
            <span className="flex items-center gap-1">
              <span className="text-[#C8863A]">★</span>
              <span className="font-bold">{shop.rating.toFixed(1)}</span>
              <span className="opacity-50 text-xs">
                ({shop.user_ratings_total || 0})
              </span>
            </span>
          )}
        </div>

        {today && (
          <p className="text-xs opacity-60 mt-2 truncate">{today}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {shop.formatted_phone_number && (
            <a
              href={`tel:${shop.formatted_phone_number}`}
              className="text-center text-xs uppercase tracking-wider border border-[#2a2a2a] hover:border-[#C8863A] py-2 rounded"
            >
              Call
            </a>
          )}
          {lat != null && lng != null && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs uppercase tracking-wider bg-[#C8863A] text-[#0D0D0D] font-bold py-2 rounded"
            >
              Directions
            </a>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest opacity-60">
          {shop.url ? (
            <a href={shop.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#C8863A]">
              View on Maps ↗
            </a>
          ) : <span />}
          {shop.website && (
            <a href={shop.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#C8863A]">
              Website ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
