import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Star, Clock, DollarSign, MapPin, ExternalLink, Plus, Inbox, Users } from "lucide-react";
import { useState } from "react";
import type { SeedCard } from "@/lib/discover.functions";

export function SeedDetailDrawer({
  seed, open, onOpenChange, days, onAdd,
}: {
  seed: SeedCard | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  days: string[];
  onAdd: (args: { day_date: string | null; scope: "personal" | "shared" }) => Promise<void>;
}) {
  const [day, setDay] = useState<string | "park">("park");
  const [scope, setScope] = useState<"personal" | "shared">("personal");
  const [saving, setSaving] = useState(false);

  if (!seed) return null;

  async function add() {
    setSaving(true);
    try { await onAdd({ day_date: day === "park" ? null : day, scope }); onOpenChange(false); }
    finally { setSaving(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {seed.image_url && (
          <div className="-mx-6 -mt-6 mb-4 aspect-[16/9] overflow-hidden">
            <img src={seed.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <SheetHeader>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{seed.category}</p>
          <SheetTitle className="font-display text-2xl leading-tight">{seed.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          {seed.rating != null && (
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-yellow-500" />{seed.rating.toFixed(1)} <span className="text-muted-foreground">({seed.review_count} reviews)</span></span>
          )}
          {seed.est_duration_min != null && <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {seed.est_duration_min < 60 ? `${seed.est_duration_min}m` : `${Math.round(seed.est_duration_min / 60)}h`}</span>}
          {seed.est_cost_usd != null && <span className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> {seed.est_cost_usd === 0 ? "Free" : `~$${seed.est_cost_usd}`}</span>}
          {seed.distance_km != null && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {seed.distance_km} km away</span>}
        </div>

        {seed.description && <p className="mt-4 rounded-2xl bg-secondary p-4 text-sm leading-relaxed">{seed.description}</p>}

        <div className="mt-2 flex flex-wrap gap-2">
          {seed.tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">#{t}</span>
          ))}
          {seed.url && (
            <a href={seed.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Visit website <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add to plan</p>

          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">Day</p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <button
                onClick={() => setDay("park")}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${day === "park" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
              >
                <Inbox className="h-3 w-3" /> Park it
              </button>
              {days.map((d) => {
                const dt = new Date(d);
                const active = day === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                  >
                    {dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">Visibility</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setScope("personal")}
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs ${scope === "personal" ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}
              >
                Just me
              </button>
              <button
                onClick={() => setScope("shared")}
                className={`flex flex-1 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs ${scope === "shared" ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background"}`}
              >
                <Users className="h-3 w-3" /> Share with crew
              </button>
            </div>
          </div>

          <Button onClick={add} disabled={saving} className="h-11 w-full rounded-xl">
            <Plus className="mr-1 h-4 w-4" /> {saving ? "Adding…" : day === "park" ? "Park in backlog" : "Add to plan"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
