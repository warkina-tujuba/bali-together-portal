import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type StayPayload = {
  name: string; address: string; lat?: number | null; lng?: number | null; place_id?: string;
  check_in?: string; check_out?: string; booking_source?: string; booking_url?: string;
};

type GeoFn = (input: { data: { q: string } }) => Promise<{
  results: Array<{ place_id: string; name: string; address: string; lat: number; lng: number }>;
}>;

export function StaySearchForm({ geocode, destinationHint, onSave }: {
  geocode: GeoFn; destinationHint?: string | null; onSave: (s: StayPayload) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ place_id: string; name: string; address: string; lat: number; lng: number }>>([]);
  const [picked, setPicked] = useState<{ place_id: string; name: string; address: string; lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await geocode({ data: { q: destinationHint ? `${q} ${destinationHint}` : q } });
        setResults(r.results);
      } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, [q, geocode, destinationHint]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Type a hotel, villa, or address — pick the match for the map pin.</p>
      <Input value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} placeholder="e.g. Bambu Indah Ubud" className="h-11 rounded-xl" />
      {!picked && results.length > 0 && (
        <ul className="max-h-64 overflow-auto rounded-2xl border border-border bg-card">
          {results.map((r) => (
            <li key={r.place_id}>
              <button onClick={() => { setPicked(r); setResults([]); setQ(r.name); }} className="w-full px-4 py-3 text-left hover:bg-secondary">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.address}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && (
        <div className="rounded-2xl bg-secondary p-4">
          <p className="font-medium">{picked.name}</p>
          <p className="text-xs text-muted-foreground">{picked.address}</p>
        </div>
      )}
      <Button
        className="h-12 w-full rounded-xl text-base"
        disabled={!picked || saving}
        onClick={async () => {
          if (!picked) return;
          setSaving(true);
          try { await onSave({ name: picked.name, address: picked.address, lat: picked.lat, lng: picked.lng, place_id: picked.place_id }); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          finally { setSaving(false); }
        }}
      >{saving ? "Saving…" : "Continue"}</Button>
    </div>
  );
}
