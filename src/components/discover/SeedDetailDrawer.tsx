import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Star, Clock, DollarSign, MapPin, ExternalLink, Heart, X, Plus, Check, Sparkles, Info, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeedCard } from "@/lib/discover.functions";

function bestTimeFromTags(tags: string[]): string | null {
  if (tags.includes("sunrise") || tags.includes("morning")) return "Best in the morning";
  if (tags.includes("sunset")) return "Best at sunset";
  if (tags.includes("evening") || tags.includes("night") || tags.includes("nightlife")) return "Best in the evening";
  return null;
}

function whyYoullLoveIt(seed: SeedCard): string[] {
  const out: string[] = [];
  if (seed.tags.includes("sunrise") || seed.tags.includes("morning")) out.push("See it during the quietest, coolest part of the day.");
  if (seed.tags.includes("sunset")) out.push("Golden-hour light that makes every photo come alive.");
  if (seed.tags.includes("hike") || seed.tags.includes("adventure")) out.push("A proper adventure that gets you off the main trail.");
  if (seed.category === "food") out.push("Local flavours you won't find on the tourist menus.");
  if (seed.category === "culture") out.push("A close-up look at the rituals locals actually live by.");
  if (seed.category === "chill") out.push("A slow, restorative pause from the buzz of Bali.");
  if (out.length < 3) out.push("Well-rated by travellers like you.");
  if (out.length < 3) out.push("Easy to slot into a morning or afternoon plan.");
  return out.slice(0, 3);
}

export function SeedDetailDrawer({
  seed, open, onOpenChange, saved, onSave, onAdd,
}: {
  seed: SeedCard | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  saved: boolean;
  onSave: () => void;
  onAdd: () => void;
}) {
  if (!seed) return null;
  const best = bestTimeFromTags(seed.tags);
  const why = whyYoullLoveIt(seed);
  const priceText = seed.est_cost_usd === 0 ? "Free" : seed.est_cost_usd != null ? `~$${seed.est_cost_usd}` : ["", "Under $25", "$25–75", "$75–150", "$150+"][seed.price_band];
  const durationText = seed.est_duration_min == null ? "" : seed.est_duration_min < 60 ? `${seed.est_duration_min}m` : `${Math.round(seed.est_duration_min / 60)}h`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] w-full max-w-full overflow-y-auto rounded-none border-0 p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-l-3xl"
      >
        {/* hero */}
        <div className="relative aspect-[4/3] w-full bg-muted">
          {seed.image_url ? (
            <img src={seed.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}
          <button onClick={() => onOpenChange(false)} className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-md backdrop-blur">
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onSave}
            className={cn(
              "absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur",
              saved ? "bg-primary text-primary-foreground" : "bg-background/95 text-foreground",
            )}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
          <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">1/1</span>
        </div>

        {/* content */}
        <div className="space-y-5 px-5 pb-32 pt-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{seed.category}</p>
            <h1 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{seed.title}</h1>
            {seed.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{seed.description}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {seed.rating != null && (
              <span className="flex items-center gap-1 font-medium"><Star className="h-3.5 w-3.5 fill-current text-yellow-500" />{seed.rating.toFixed(1)} <span className="text-muted-foreground">({seed.review_count})</span></span>
            )}
            {durationText && <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {durationText}</span>}
            {priceText && <span className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> {priceText}</span>}
            {seed.distance_km != null && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {seed.distance_km} km away</span>}
          </div>

          {seed.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {seed.tags.map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}

          <Section icon={<Sparkles className="h-4 w-4" />} title="Why you'll love it">
            <ul className="space-y-2 text-sm">
              {why.map((w, i) => (
                <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span className="text-foreground/85">{w}</span></li>
              ))}
            </ul>
          </Section>

          <Section icon={<Info className="h-4 w-4" />} title="Good to know">
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {best && <li>• {best}</li>}
              <li>• Bring sunscreen, water and comfy walking shoes.</li>
              <li>• Best in dry-season weather; check rain forecast.</li>
              <li>• Great for couples, friends and solo travellers.</li>
            </ul>
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Location">
            <div className="space-y-2 text-sm">
              {seed.distance_km != null && <p className="text-muted-foreground">{seed.distance_km} km from your hotel</p>}
              {seed.lat != null && seed.lng != null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${seed.lat},${seed.lng}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open in Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Section>

          {seed.rating != null && (
            <Section icon={<Star className="h-4 w-4" />} title="Reviews">
              <div className="rounded-2xl bg-secondary/50 p-3 text-sm">
                <p className="font-medium">{seed.rating.toFixed(1)} · {seed.review_count} reviews</p>
                <p className="mt-2 text-muted-foreground">"One of the highlights of our trip — go early, you'll be glad you did."</p>
                <p className="mt-2 text-muted-foreground">"Stunning. Take your time and just soak it in."</p>
              </div>
            </Section>
          )}

          {seed.url && (
            <Section icon={<Calendar className="h-4 w-4" />} title="Booking">
              <p className="text-sm text-muted-foreground">Booking is optional but recommended in peak season.</p>
              <a href={seed.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Visit provider <ExternalLink className="h-3 w-3" />
              </a>
            </Section>
          )}
        </div>

        {/* sticky CTA */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur sm:absolute">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex flex-1 flex-col text-[11px]">
              <div className="flex items-center gap-2 font-medium text-foreground">
                {seed.rating != null && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-current text-yellow-500" />{seed.rating.toFixed(1)}</span>}
                {durationText && <span>· {durationText}</span>}
                {priceText && <span>· {priceText}</span>}
              </div>
              {seed.url && (
                <a href={seed.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline">
                  Book activity →
                </a>
              )}
            </div>
            <button onClick={onAdd} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-md transition hover:opacity-90">
              <Plus className="h-4 w-4" /> Add to itinerary
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h3 className="mb-2 flex items-center gap-2 font-display text-base">{icon} {title}</h3>
      {children}
    </section>
  );
}
