import { Star, Clock, MapPin, Heart, Plus } from "lucide-react";
import type { SeedCard } from "@/lib/discover.functions";
import { cn } from "@/lib/utils";

function bestTimeFromTags(tags: string[]): string | null {
  if (tags.includes("sunrise") || tags.includes("morning")) return "Best in the morning";
  if (tags.includes("sunset")) return "Best at sunset";
  if (tags.includes("evening") || tags.includes("night") || tags.includes("nightlife")) return "Best in the evening";
  return null;
}

function priceLabel(seed: SeedCard): string {
  if (seed.est_cost_usd === 0) return "Free";
  if (seed.est_cost_usd != null) return `From ~$${seed.est_cost_usd}`;
  return ["", "Under $25", "$25–75", "$75–150", "$150+"][seed.price_band] ?? "";
}

export function ActivityCard({
  seed, saved, hovered, onOpen, onAdd, onSave, onHover,
}: {
  seed: SeedCard;
  saved?: boolean;
  hovered?: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onSave: () => void;
  onHover?: (id: string | null) => void;
}) {
  const best = bestTimeFromTags(seed.tags);
  return (
    <article
      onMouseEnter={() => onHover?.(seed.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-soft transition",
        hovered ? "border-foreground/30 shadow-card" : "hover:-translate-y-0.5 hover:shadow-card",
      )}
    >
      <button onClick={onOpen} className="relative block aspect-[4/5] w-full overflow-hidden bg-muted text-left">
        {seed.image_url ? (
          <img src={seed.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">{seed.category}</span>
        {seed.distance_km != null && (
          <span className="absolute right-14 top-3 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-medium">
            {seed.distance_km < 1 ? `${Math.round(seed.distance_km * 1000)} m` : `${seed.distance_km} km`}
          </span>
        )}
        <span
          role="button"
          aria-label="Save"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSave(); }}
          className={cn(
            "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition",
            saved ? "bg-primary text-primary-foreground" : "bg-background/90 text-foreground hover:scale-110",
          )}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display text-lg leading-tight">{seed.title}</h3>
        {seed.description && <p className="line-clamp-2 text-xs text-muted-foreground">{seed.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {seed.rating != null && (
            <span className="flex items-center gap-1 text-foreground">
              <Star className="h-3 w-3 fill-current text-yellow-500" />
              {seed.rating.toFixed(1)}
              <span className="text-muted-foreground">({seed.review_count})</span>
            </span>
          )}
          {seed.est_duration_min != null && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {seed.est_duration_min < 60 ? `${seed.est_duration_min}m` : `${Math.round(seed.est_duration_min / 60)}h`}</span>
          )}
          <span className="font-medium text-foreground">{priceLabel(seed)}</span>
        </div>
        {(best || seed.distance_km != null) && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {seed.distance_km != null && <><MapPin className="h-3 w-3" /> {seed.distance_km} km away</>}
            {best && seed.distance_km != null && <span>·</span>}
            {best && <span>{best}</span>}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            onClick={onAdd}
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Add to itinerary
          </button>
          <button
            onClick={onOpen}
            className="rounded-full border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-secondary"
          >
            View details
          </button>
        </div>
      </div>
    </article>
  );
}
