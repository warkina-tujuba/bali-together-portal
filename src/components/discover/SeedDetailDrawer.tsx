import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Star, Clock, DollarSign, MapPin, ExternalLink, Heart, X, Plus, Check, Sparkles, Info, Calendar, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeedCard } from "@/lib/discover.functions";
import { getPlaceDetails } from "@/lib/places.functions";
import { GoogleMap } from "@/components/maps/GoogleMap";

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

type GoogleDetail = {
  cached_google_rating: number | null;
  cached_google_review_count: number | null;
  cached_google_reviews: Array<{
    text?: { text?: string };
    rating?: number;
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string };
  }> | null;
  cached_google_address: string | null;
  cached_google_opening_hours: { weekdayDescriptions?: string[]; openNow?: boolean } | null;
  cached_google_website_url: string | null;
  google_maps_url: string | null;
};

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
  const fetchDetails = useServerFn(getPlaceDetails);
  const [google, setGoogle] = useState<GoogleDetail | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    if (!open || !seed?.google_place_id) { setGoogle(null); return; }
    let cancelled = false;
    setLoadingGoogle(true);
    fetchDetails({ data: { placeId: seed.google_place_id, level: "detail", table: "activity_seeds", rowId: seed.id } })
      .then((r) => { if (!cancelled) setGoogle(r.data as GoogleDetail); })
      .catch((e) => console.error("[SeedDetailDrawer] place details failed", e))
      .finally(() => { if (!cancelled) setLoadingGoogle(false); });
    return () => { cancelled = true; };
  }, [open, seed?.id, seed?.google_place_id, fetchDetails]);

  const mapCenter = useMemo<[number, number] | null>(
    () => (seed?.lat != null && seed?.lng != null ? [seed.lng, seed.lat] : null),
    [seed?.lat, seed?.lng],
  );

  if (!seed) return null;
  const best = bestTimeFromTags(seed.tags);
  const why = whyYoullLoveIt(seed);
  const rating = google?.cached_google_rating ?? seed.rating;
  const reviewCount = google?.cached_google_review_count ?? seed.review_count;
  const address = google?.cached_google_address ?? seed.google_address;
  const mapsUrl = google?.google_maps_url ?? seed.google_maps_url ?? (seed.lat != null && seed.lng != null ? `https://www.google.com/maps/search/?api=1&query=${seed.lat},${seed.lng}` : null);
  const websiteUrl = google?.cached_google_website_url ?? null;
  const hours = google?.cached_google_opening_hours?.weekdayDescriptions ?? null;
  const reviews = google?.cached_google_reviews ?? null;

  const priceText = seed.est_cost_usd === 0 ? "Free" : seed.est_cost_usd != null ? `~$${seed.est_cost_usd}` : ["", "Under $25", "$25–75", "$75–150", "$150+"][seed.price_band];
  const durationText = seed.est_duration_min == null ? "" : seed.est_duration_min < 60 ? `${seed.est_duration_min}m` : `${Math.round(seed.est_duration_min / 60)}h`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] w-full max-w-full overflow-y-auto rounded-none border-0 p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-l-3xl"
      >
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
        </div>

        <div className="space-y-5 px-5 pb-32 pt-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{seed.category}</p>
            <h1 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{seed.title}</h1>
            {seed.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{seed.description}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {rating != null && (
              <span className="flex items-center gap-1 font-medium"><Star className="h-3.5 w-3.5 fill-current text-yellow-500" />{rating.toFixed(1)} <span className="text-muted-foreground">({reviewCount})</span></span>
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
              {hours && hours.length > 0 ? (
                hours.slice(0, 3).map((h, i) => <li key={i}>• {h}</li>)
              ) : (
                <>
                  <li>• Bring sunscreen, water and comfy walking shoes.</li>
                  <li>• Best in dry-season weather; check rain forecast.</li>
                </>
              )}
            </ul>
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Location">
            <div className="space-y-3 text-sm">
              {address && <p className="text-foreground/85">{address}</p>}
              {seed.distance_km != null && <p className="text-muted-foreground">{seed.distance_km} km from your hotel</p>}
              {mapCenter && (
                <div className="h-44 overflow-hidden rounded-2xl border">
                  <GoogleMap
                    center={mapCenter}
                    zoom={14}
                    pins={[{ id: seed.id, lat: seed.lat!, lng: seed.lng!, label: seed.title, kind: "activity" }]}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Open in Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
              </div>
            </div>
          </Section>

          {(reviews && reviews.length > 0) ? (
            <Section icon={<Star className="h-4 w-4" />} title="Reviews">
              <div className="space-y-3">
                {rating != null && (
                  <p className="text-sm font-medium">{rating.toFixed(1)} · {reviewCount} reviews on Google</p>
                )}
                {reviews.slice(0, 3).map((r, i) => (
                  <div key={i} className="rounded-2xl bg-secondary/50 p-3 text-sm">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{r.authorAttribution?.displayName ?? "Anonymous"}</span>
                      <span>{r.relativePublishTimeDescription ?? ""}</span>
                    </div>
                    {r.rating != null && (
                      <div className="mt-1 flex items-center gap-1 text-[11px]">
                        <Star className="h-3 w-3 fill-current text-yellow-500" /> {r.rating.toFixed(1)}
                      </div>
                    )}
                    {r.text?.text && <p className="mt-2 text-foreground/85 line-clamp-4">{r.text.text}</p>}
                  </div>
                ))}
              </div>
            </Section>
          ) : rating != null ? (
            <Section icon={<Star className="h-4 w-4" />} title="Reviews">
              <div className="rounded-2xl bg-secondary/50 p-3 text-sm">
                <p className="font-medium">{rating.toFixed(1)} · {reviewCount} reviews</p>
                {loadingGoogle && <p className="mt-2 text-muted-foreground">Loading recent reviews…</p>}
              </div>
            </Section>
          ) : null}

          {seed.url && (
            <Section icon={<Calendar className="h-4 w-4" />} title="Booking">
              <p className="text-sm text-muted-foreground">Booking is optional but recommended in peak season.</p>
              <a href={seed.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Visit provider <ExternalLink className="h-3 w-3" />
              </a>
            </Section>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur sm:absolute">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex flex-1 flex-col text-[11px]">
              <div className="flex items-center gap-2 font-medium text-foreground">
                {rating != null && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-current text-yellow-500" />{rating.toFixed(1)}</span>}
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
