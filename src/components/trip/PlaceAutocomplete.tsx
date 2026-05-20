import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Check, Loader2 } from "lucide-react";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { cn } from "@/lib/utils";

export type PlaceHit = { name: string; address: string; lat: number; lng: number };

type MapboxFeature = {
  place_name: string;
  text: string;
  center: [number, number];
};

const RECENT_KEY = "tl_recent_places_v1";
function readRecent(): PlaceHit[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function writeRecent(p: PlaceHit) {
  const list = readRecent().filter((x) => x.name !== p.name);
  list.unshift(p);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
}

export function PlaceAutocomplete({
  value,
  onPick,
  placeholder = "Start typing a city, country, area…",
  className,
  autoFocus,
}: {
  value: PlaceHit | null;
  onPick: (hit: PlaceHit | null) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(value?.name ?? "");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<PlaceHit[]>([]);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setRecent(readRecent()); }, []);

  // Debounced search
  useEffect(() => {
    if (value && q === value.name) return;
    if (q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
        );
        url.searchParams.set("access_token", MAPBOX_TOKEN);
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set("limit", "6");
        url.searchParams.set("types", "place,locality,neighborhood,region,country,district");
        const res = await fetch(url, { signal: ctl.signal });
        const json = (await res.json()) as { features: MapboxFeature[] };
        setHits((json.features ?? []).map((f) => ({
          name: f.place_name,
          address: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        })));
        setActive(0);
      } catch (e) { if ((e as Error).name !== "AbortError") setHits([]); }
      finally { setLoading(false); }
    }, 150);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, value]);

  // Click outside to close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(h: PlaceHit) {
    onPick(h);
    setQ(h.name);
    setHits([]);
    setOpen(false);
    writeRecent(h);
    setRecent(readRecent());
  }

  function onKey(e: React.KeyboardEvent) {
    const list = hits.length ? hits : recent;
    if (!open || list.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(list.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter") { e.preventDefault(); pick(list[active]); }
    if (e.key === "Escape") setOpen(false);
  }

  const list = hits.length ? hits : (q.trim().length < 2 ? recent : []);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); onPick(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="h-14 rounded-2xl border-2 pl-11 pr-11 text-base shadow-soft transition-colors focus-visible:border-primary"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {value && !loading && (
          <Check className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        )}
      </div>
      {open && list.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-popover shadow-card">
          {hits.length === 0 && (
            <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Recent</div>
          )}
          {list.map((h, i) => (
            <button
              key={`${h.lat}-${h.lng}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(h); }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors",
                active === i ? "bg-secondary" : "hover:bg-secondary/60",
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{h.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
