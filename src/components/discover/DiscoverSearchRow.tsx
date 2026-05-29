import { Search, MapPin, SlidersHorizontal, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DiscoverSearchRow({
  query,
  onQueryChange,
  nearMe,
  onToggleNear,
  onOpenFilters,
  onToggleMap,
  mapActive,
  filterCount,
}: {
  query: string;
  onQueryChange: (s: string) => void;
  nearMe: boolean;
  onToggleNear: () => void;
  onOpenFilters: () => void;
  onToggleMap: () => void;
  mapActive: boolean;
  filterCount: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search activities…"
          className="h-11 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-foreground/30"
        />
      </div>
      <IconBtn active={nearMe} onClick={onToggleNear} label="Near me">
        <MapPin className="h-4 w-4" />
      </IconBtn>
      <IconBtn onClick={onOpenFilters} label="Filters" badge={filterCount}>
        <SlidersHorizontal className="h-4 w-4" />
      </IconBtn>
      <IconBtn active={mapActive} onClick={onToggleMap} label="Map">
        <MapIcon className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  children, onClick, active, label, badge,
}: { children: React.ReactNode; onClick: () => void; active?: boolean; label: string; badge?: number }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-secondary",
      )}
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
