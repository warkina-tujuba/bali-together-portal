import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { MapPin, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchPlacesAutocomplete, getPlaceDetails } from "@/lib/places.functions";

export type PlaceHit = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string;
};

type Suggestion = {
  place_id: string;
  main_text: string;
  secondary_text: string;
  full_text: string;
};

const RECENT_KEY = "tl_recent_places_v3";
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
  const autocompleteFn = useServerFn(searchPlacesAutocomplete);
  const detailsFn = useServerFn(getPlaceDetails);

  const [q, setQ] = useState(value?.name ?? "");
  const [hits, setHits] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<PlaceHit[]>([]);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s_${Date.now()}`,
  );

  useEffect(() => { setRecent(readRecent()); }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (value && q === value.name) return;
    if (q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await autocompleteFn({
          data: {
            input: q,
            sessionToken: sessionTokenRef.current,
            types: ["geocode"],
          },
        });
        if (cancelled) return;
        setHits(res.suggestions ?? []);
        setActive(0);
      } catch (e) {
        if (!cancelled) {
          console.warn("[PlaceAutocomplete] failed", e);
          setHits([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, value, autocompleteFn]);

  // Click outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function pickSuggestion(s: Suggestion) {
    setLoading(true);
    try {
      const res = await detailsFn({ data: { placeId: s.place_id, level: "card" } });
      const d = res.data as { cached_google_address?: string | null; lat?: number | null; lng?: number | null };
      const hit: PlaceHit = {
        name: s.main_text || s.full_text,
        address: d.cached_google_address ?? s.full_text,
        lat: d.lat ?? 0,
        lng: d.lng ?? 0,
        place_id: s.place_id,
      };
      onPick(hit);
      setQ(hit.name);
      setHits([]);
      setOpen(false);
      writeRecent(hit);
      setRecent(readRecent());
      // start a fresh session for the next query
      sessionTokenRef.current = crypto.randomUUID?.() ?? `s_${Date.now()}`;
    } catch (e) {
      console.warn("[PlaceAutocomplete] details failed", e);
    } finally {
      setLoading(false);
    }
  }

  function pickRecent(h: PlaceHit) {
    onPick(h);
    setQ(h.name);
    setHits([]);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    const listLen = hits.length || recent.length;
    if (!open || listLen === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(listLen - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (hits.length) pickSuggestion(hits[active]);
      else if (recent.length) pickRecent(recent[active]);
    }
    if (e.key === "Escape") setOpen(false);
  }

  const showRecent = q.trim().length < 2 && hits.length === 0;

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
      {open && (hits.length > 0 || (showRecent && recent.length > 0)) && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-popover shadow-card">
          {showRecent && (
            <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Recent</div>
          )}
          {(showRecent ? recent : hits).map((item, i) => {
            const main = "main_text" in item ? item.main_text : item.name;
            const sub = "secondary_text" in item ? item.secondary_text : item.address;
            return (
              <button
                key={`${main}-${i}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if ("place_id" in item && "main_text" in item) pickSuggestion(item);
                  else pickRecent(item as PlaceHit);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors",
                  active === i ? "bg-secondary" : "hover:bg-secondary/60",
                )}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">
                  <span className="font-medium">{main}</span>
                  {sub && main !== sub && <span className="text-muted-foreground"> · {sub}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
