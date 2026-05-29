import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Star, Clock, MapPin } from "lucide-react";
import type { SeedCard } from "@/lib/discover.functions";

export function MapPinPreviewSheet({
  seed, open, onOpenChange, onView, onAdd,
}: {
  seed: SeedCard | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onView: () => void;
  onAdd: () => void;
}) {
  if (!seed) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:max-w-md">
        <div className="flex gap-3">
          <div className="aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
            {seed.image_url && <img src={seed.image_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{seed.category}</p>
            <h3 className="line-clamp-2 font-display text-base leading-tight">{seed.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {seed.rating != null && (
                <span className="flex items-center gap-1 text-foreground"><Star className="h-3 w-3 fill-current text-yellow-500" />{seed.rating.toFixed(1)}</span>
              )}
              {seed.est_duration_min != null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{seed.est_duration_min < 60 ? `${seed.est_duration_min}m` : `${Math.round(seed.est_duration_min / 60)}h`}</span>}
              {seed.est_cost_usd != null && <span>~${seed.est_cost_usd}</span>}
              {seed.distance_km != null && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{seed.distance_km} km</span>}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onView} className="flex-1 rounded-full border border-border px-3 py-2.5 text-xs font-medium hover:bg-secondary">View details</button>
          <button onClick={onAdd} className="flex-1 rounded-full bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground">Add to itinerary</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
