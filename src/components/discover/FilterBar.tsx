import { cn } from "@/lib/utils";
import { Search, MapPin, Sparkles, Utensils, Mountain, Landmark, Music, Heart, Sun, Waves } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export type DiscoverFilters = {
  categories: string[];
  tags: string[];
  max_price?: number;
  max_duration_min?: number;
  near_me: boolean;
  query: string;
};

export const CATEGORY_PRESETS = [
  { id: "food", label: "Foodie", icon: Utensils },
  { id: "activity", label: "Adventure", icon: Mountain },
  { id: "culture", label: "Culture", icon: Landmark },
  { id: "nightlife", label: "Nightlife", icon: Music },
  { id: "chill", label: "Chill", icon: Sun },
] as const;

export const TAG_PRESETS = [
  { id: "beach", label: "Beach", icon: Waves },
  { id: "surf", label: "Surf" },
  { id: "yoga", label: "Yoga" },
  { id: "waterfall", label: "Waterfall" },
  { id: "temple", label: "Temple" },
  { id: "sunset", label: "Sunset" },
  { id: "hike", label: "Hike" },
  { id: "diving", label: "Diving" },
  { id: "spa", label: "Spa" },
] as const;

export function FilterBar({
  filters, onChange,
}: { filters: DiscoverFilters; onChange: (f: DiscoverFilters) => void }) {
  const toggle = <K extends "categories" | "tags">(k: K, id: string) => {
    const cur = filters[k];
    onChange({ ...filters, [k]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activities…"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            className="h-10 rounded-full pl-9"
          />
        </div>
        <button
          onClick={() => onChange({ ...filters, near_me: !filters.near_me })}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition",
            filters.near_me ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
          )}
        >
          <MapPin className="h-3.5 w-3.5" /> Near me
        </button>
        <button
          onClick={() => onChange({
            categories: ["activity", "culture", "food"], tags: [], max_price: undefined,
            max_duration_min: undefined, near_me: filters.near_me, query: "",
          })}
          className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3.5 py-2 text-xs font-medium text-accent-foreground transition hover:bg-accent/25"
        >
          <Sparkles className="h-3.5 w-3.5" /> Must do
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_PRESETS.map((c) => {
          const active = filters.categories.includes(c.id);
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => toggle("categories", c.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-secondary",
              )}
            >
              <Icon className="h-3 w-3" /> {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TAG_PRESETS.map((t) => {
          const active = filters.tags.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle("tags", t.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition",
                active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl bg-card p-3 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Max price</span>
            <span className="text-muted-foreground">{filters.max_price ? "$".repeat(filters.max_price) : "Any"}</span>
          </div>
          <Slider min={1} max={4} step={1} value={[filters.max_price ?? 4]} onValueChange={([v]) => onChange({ ...filters, max_price: v === 4 ? undefined : v })} className="mt-2" />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Max duration</span>
            <span className="text-muted-foreground">{filters.max_duration_min ? `${Math.round(filters.max_duration_min / 60)}h` : "Any"}</span>
          </div>
          <Slider min={60} max={480} step={30} value={[filters.max_duration_min ?? 480]} onValueChange={([v]) => onChange({ ...filters, max_duration_min: v === 480 ? undefined : v })} className="mt-2" />
        </div>
      </div>
    </div>
  );
}

export const EMPTY_FILTERS: DiscoverFilters = {
  categories: [], tags: [], max_price: undefined, max_duration_min: undefined, near_me: false, query: "",
};
