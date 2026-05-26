import { Star, Clock, MapPin, DollarSign } from "lucide-react";
import { Heart } from "lucide-react";
import type { SeedCard } from "@/lib/discover.functions";

export function ActivityCard({
  seed, onOpen, onAdd,
}: { seed: SeedCard; onOpen: () => void; onAdd: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {seed.image_url ? (
          <img src={seed.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
          {seed.category}
        </span>
        {seed.distance_km != null && (
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-medium">
            {seed.distance_km < 1 ? `${Math.round(seed.distance_km * 1000)} m` : `${seed.distance_km} km`}
          </span>
        )}
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-110"
          aria-label="Save to plan"
        >
          <Heart className="h-4 w-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display text-lg leading-tight">{seed.title}</h3>
        {seed.description && <p className="line-clamp-2 text-xs text-muted-foreground">{seed.description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
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
          {seed.est_cost_usd != null && (
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {seed.est_cost_usd === 0 ? "Free" : `~$${seed.est_cost_usd}`}</span>
          )}
          {seed.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2 py-0.5">#{t}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
