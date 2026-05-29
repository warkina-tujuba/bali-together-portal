import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiscoverFilters } from "./FilterBar";

export type ExtraFilters = {
  trip_day?: string | null;
  time_of_day: string[];
  distance_km?: number | null;
  near_hotel: boolean;
  price_band?: number | null; // 0=Free, 1..4
  duration_bucket?: string | null; // <1h, 1-2h, half, full
  traveller: string[];
  environment?: "indoor" | "outdoor" | null;
  accessibility: boolean;
  booking_required: boolean;
  fits_itinerary: boolean;
};

export const EMPTY_EXTRA: ExtraFilters = {
  trip_day: null,
  time_of_day: [],
  distance_km: null,
  near_hotel: false,
  price_band: null,
  duration_bucket: null,
  traveller: [],
  environment: null,
  accessibility: false,
  booking_required: false,
  fits_itinerary: false,
};

export function FilterSheet({
  open, onOpenChange, filters, extras, onApply, days, resultCount,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  filters: DiscoverFilters;
  extras: ExtraFilters;
  onApply: (next: { filters: DiscoverFilters; extras: ExtraFilters }) => void;
  days: { date: string; label: string }[];
  resultCount: number;
}) {
  function update<K extends keyof ExtraFilters>(k: K, v: ExtraFilters[K]) {
    onApply({ filters, extras: { ...extras, [k]: v } });
  }
  function toggleArr<K extends "time_of_day" | "traveller">(k: K, v: string) {
    const cur = extras[k];
    update(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]) as never);
  }
  function toggleCat(id: string) {
    const next = filters.categories.includes(id) ? filters.categories.filter((c) => c !== id) : [...filters.categories, id];
    onApply({ filters: { ...filters, categories: next }, extras });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-md sm:rounded-l-3xl sm:rounded-t-none">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
          <SheetHeader>
            <SheetTitle className="font-display text-xl">Filters</SheetTitle>
          </SheetHeader>
          <button
            onClick={() => onApply({ filters: { ...filters, categories: [], tags: [], max_price: undefined, max_duration_min: undefined }, extras: EMPTY_EXTRA })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <Section label="Trip day">
            <ChipRow
              value={extras.trip_day ?? "any"}
              onChange={(v) => update("trip_day", v === "any" ? null : v)}
              options={[{ id: "any", label: "Any" }, ...days.map((d) => ({ id: d.date, label: d.label }))]}
            />
          </Section>
          <Section label="Time of day">
            <ChipRow multi value={extras.time_of_day} onChange={(v) => toggleArr("time_of_day", v)} options={[
              { id: "morning", label: "Morning" }, { id: "afternoon", label: "Afternoon" }, { id: "evening", label: "Evening" }, { id: "night", label: "Night" },
            ]} />
          </Section>
          <Section label="Distance">
            <ChipRow value={extras.near_hotel ? "hotel" : extras.distance_km ? `k${extras.distance_km}` : "any"} onChange={(v) => {
              if (v === "any") { update("distance_km", null); update("near_hotel", false); }
              else if (v === "hotel") { update("near_hotel", true); update("distance_km", null); }
              else { update("distance_km", Number(v.slice(1))); update("near_hotel", false); }
            }} options={[
              { id: "any", label: "Any" }, { id: "hotel", label: "Near hotel" },
              { id: "k1", label: "1 km" }, { id: "k3", label: "3 km" }, { id: "k5", label: "5 km" }, { id: "k10", label: "10 km" },
            ]} />
          </Section>
          <Section label="Category">
            <ChipRow multi value={filters.categories} onChange={toggleCat} options={[
              { id: "food", label: "Foodie" }, { id: "activity", label: "Adventure" }, { id: "culture", label: "Culture" },
              { id: "nightlife", label: "Nightlife" }, { id: "chill", label: "Chill" },
            ]} />
          </Section>
          <Section label="Price">
            <ChipRow value={extras.price_band == null ? "any" : `p${extras.price_band}`} onChange={(v) => update("price_band", v === "any" ? null : Number(v.slice(1)))} options={[
              { id: "any", label: "Any" }, { id: "p0", label: "Free" }, { id: "p1", label: "Under $25" },
              { id: "p2", label: "$25–75" }, { id: "p3", label: "$75–150" }, { id: "p4", label: "$150+" },
            ]} />
          </Section>
          <Section label="Duration">
            <ChipRow value={extras.duration_bucket ?? "any"} onChange={(v) => update("duration_bucket", v === "any" ? null : v)} options={[
              { id: "any", label: "Any" }, { id: "lt1", label: "Under 1h" }, { id: "1to2", label: "1–2h" },
              { id: "half", label: "Half day" }, { id: "full", label: "Full day" },
            ]} />
          </Section>
          <Section label="Traveller type">
            <ChipRow multi value={extras.traveller} onChange={(v) => toggleArr("traveller", v)} options={[
              { id: "solo", label: "Solo" }, { id: "couples", label: "Couples" }, { id: "friends", label: "Friends" },
              { id: "family", label: "Family" }, { id: "group", label: "Group" },
            ]} />
          </Section>
          <Section label="Setting">
            <ChipRow value={extras.environment ?? "any"} onChange={(v) => update("environment", v === "any" ? null : (v as never))} options={[
              { id: "any", label: "Any" }, { id: "indoor", label: "Indoor" }, { id: "outdoor", label: "Outdoor" },
            ]} />
          </Section>
          <Section label="Other">
            <div className="flex flex-wrap gap-1.5">
              <Toggle on={extras.accessibility} onClick={() => update("accessibility", !extras.accessibility)}>Accessibility</Toggle>
              <Toggle on={extras.booking_required} onClick={() => update("booking_required", !extras.booking_required)}>Booking required</Toggle>
              <Toggle on={extras.fits_itinerary} onClick={() => update("fits_itinerary", !extras.fits_itinerary)}>Fits my itinerary</Toggle>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <Button onClick={() => onOpenChange(false)} className="h-12 w-full rounded-2xl text-base">
            Show {resultCount} {resultCount === 1 ? "result" : "results"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function ChipRow({
  options, value, onChange, multi,
}: {
  options: { id: string; label: string }[];
  value: string | string[];
  onChange: (v: string) => void;
  multi?: boolean;
}) {
  const isActive = (id: string) => (multi ? (value as string[]).includes(id) : value === id);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition",
            isActive(o.id) ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-secondary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition",
        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
