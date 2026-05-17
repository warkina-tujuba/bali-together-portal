import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { BALI_CATALOGUE } from "@/data/bali-activities";

export type EventPayload = {
  day_date: string;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  category?: "food" | "activity" | "culture" | "nightlife" | "chill" | "transit" | "other";
  image_url?: string;
  lat?: number | null;
  lng?: number | null;
};

const CATEGORIES = [
  { id: "activity", label: "Activity", emoji: "🎯" },
  { id: "food", label: "Food", emoji: "🍴" },
  { id: "culture", label: "Culture", emoji: "🛕" },
  { id: "nightlife", label: "Nightlife", emoji: "🍹" },
  { id: "chill", label: "Chill", emoji: "🧘" },
  { id: "transit", label: "Transit", emoji: "🚐" },
] as const;

type GeoFn = (input: { data: { q: string } }) => Promise<{
  results: Array<{ place_id: string; name: string; address: string; lat: number; lng: number }>;
}>;

export function EventBuilder({ dayDate, geocode, onAdd, onClose }: {
  dayDate: string;
  geocode?: GeoFn;
  onAdd: (p: EventPayload) => Promise<void>;
  onClose?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventPayload["category"]>("activity");
  const [imageUrl, setImageUrl] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // Filter catalogue suggestions by title typed
  const suggestions = title.length >= 2
    ? BALI_CATALOGUE
        .filter((e) => e.title.toLowerCase().includes(title.toLowerCase()) || e.location.toLowerCase().includes(title.toLowerCase()))
        .slice(0, 5)
    : [];

  async function resolveLocation() {
    if (!location.trim() || !geocode) return;
    setResolving(true);
    try {
      const r = await geocode({ data: { q: location } });
      if (r.results[0]) setCoords({ lat: r.results[0].lat, lng: r.results[0].lng });
    } finally { setResolving(false); }
  }

  function pickSuggestion(entry: typeof BALI_CATALOGUE[number]) {
    setTitle(entry.title);
    setDescription(entry.description);
    setLocation(entry.location);
    setCoords({ lat: entry.lat, lng: entry.lng });
    setCategory(entry.category as EventPayload["category"]);
    setImageUrl(entry.image_url);
    setSuggestionsOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        day_date: dayDate,
        title: title.trim(),
        start_time: time || undefined,
        end_time: endTime || undefined,
        location: location || undefined,
        description: description || undefined,
        category,
        image_url: imageUrl || undefined,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      setTitle(""); setTime(""); setEndTime(""); setLocation(""); setDescription(""); setImageUrl(""); setCoords(null);
      onClose?.();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg">Add event</p>
        {onClose && (
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSuggestionsOpen(true); }}
          onFocus={() => setSuggestionsOpen(true)}
          placeholder="Sunset at Single Fin"
          className="mt-1.5 h-10 rounded-lg"
        />
        {suggestionsOpen && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
                >
                  <img src={s.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.location}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id as EventPayload["category"])}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`}
            >
              <span className="mr-1">{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Start</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1.5 h-10 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">End</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5 h-10 rounded-lg" />
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Where</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            value={location}
            onChange={(e) => { setLocation(e.target.value); setCoords(null); }}
            onBlur={resolveLocation}
            placeholder="Address or place"
            className="h-10 rounded-lg"
          />
        </div>
        {coords && <p className="mt-1 text-xs text-muted-foreground">📍 Pinned at {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
        {resolving && <p className="mt-1 text-xs text-muted-foreground">Finding pin…</p>}
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bring cash, dress code is smart casual…" className="mt-1.5 min-h-[60px] rounded-lg" />
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Image URL (optional)</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="mt-1.5 h-10 rounded-lg" />
        {imageUrl && <img src={imageUrl} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />}
      </div>

      <Button type="submit" disabled={!title.trim() || saving} className="h-11 w-full rounded-xl">
        <Plus className="mr-1.5 h-4 w-4" />{saving ? "Adding…" : "Add to plan"}
      </Button>
    </form>
  );
}
