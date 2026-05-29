import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { listDiscover, addSeedToPlan, type SeedCard } from "@/lib/discover.functions";
import { getItineraryHome } from "@/lib/trip.functions";
import { DiscoverHero } from "@/components/discover/DiscoverHero";
import { DiscoverSearchRow } from "@/components/discover/DiscoverSearchRow";
import { CategoryRail } from "@/components/discover/CategoryRail";
import { ViewToggle, type DiscoverView } from "@/components/discover/ViewToggle";
import { FilterSheet, EMPTY_EXTRA, type ExtraFilters } from "@/components/discover/FilterSheet";
import { ActivityCard } from "@/components/discover/ActivityCard";
import { SeedDetailDrawer } from "@/components/discover/SeedDetailDrawer";
import { MapPinPreviewSheet } from "@/components/discover/MapPinPreviewSheet";
import { AddToItinerarySheet, type AddToItineraryPayload } from "@/components/discover/AddToItinerarySheet";
import { SnapMap, type SnapPin } from "@/components/dashboard/SnapMap";
import { EMPTY_FILTERS, type DiscoverFilters } from "@/components/discover/FilterBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/discover")({ component: DiscoverPage });

function dateRange(startISO: string, endISO: string): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const s = new Date(startISO); const e = new Date(endISO);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === tomorrow.toDateString()) label = "Tomorrow";
    else label = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
    out.push({ date: dateStr, label });
    if (out.length > 40) break;
  }
  return out;
}

function DiscoverPage() {
  const listFn = useServerFn(listDiscover);
  const addFn = useServerFn(addSeedToPlan);
  const homeFn = useServerFn(getItineraryHome);
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [filters, setFilters] = useState<DiscoverFilters>(EMPTY_FILTERS);
  const [extras, setExtras] = useState<ExtraFilters>(EMPTY_EXTRA);
  const [view, setView] = useState<DiscoverView>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<SeedCard | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pinPreviewOpen, setPinPreviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSeed, setAddSeed] = useState<SeedCard | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [heroChip, setHeroChip] = useState<"near" | "today" | "must" | null>(null);

  // user location
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  function ensureLocation() {
    if (coords) return;
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setCoords(null),
        { timeout: 4000 },
      );
    }
  }
  useEffect(() => { if (filters.near_me) ensureLocation(); }, [filters.near_me]); // eslint-disable-line

  const { data: home } = useQuery({ queryKey: ["itineraryHome"], queryFn: () => homeFn() });
  const trip = home?.trip;
  const destination = trip?.destination?.split(",")[0]?.trim() || "Bali";
  const days = useMemo(() => trip ? dateRange(trip.start_date, trip.end_date) : [], [trip]);
  const existingActivities = useMemo(
    () => (home?.activities ?? []).filter((a) => !a.parked).map((a) => ({ id: a.id, day_date: a.day_date!, start_time: a.start_time, end_time: a.end_time, title: a.title })),
    [home],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["discover", filters, coords],
    queryFn: () => listFn({ data: {
      categories: filters.categories,
      tags: filters.tags,
      max_price: filters.max_price,
      max_duration_min: filters.max_duration_min,
      near: filters.near_me && coords ? coords : undefined,
      query: filters.query || undefined,
      limit: 60,
    } }),
  });

  // client-side extra filters
  const items = useMemo(() => {
    let xs = data?.items ?? [];
    if (extras.time_of_day.length) xs = xs.filter((s) => extras.time_of_day.some((t) => s.tags.includes(t)));
    if (extras.price_band != null) {
      if (extras.price_band === 0) xs = xs.filter((s) => s.est_cost_usd === 0);
      else xs = xs.filter((s) => s.price_band === extras.price_band);
    }
    if (extras.duration_bucket) {
      xs = xs.filter((s) => {
        const m = s.est_duration_min ?? 0;
        if (extras.duration_bucket === "lt1") return m < 60;
        if (extras.duration_bucket === "1to2") return m >= 60 && m <= 120;
        if (extras.duration_bucket === "half") return m > 120 && m <= 300;
        if (extras.duration_bucket === "full") return m > 300;
        return true;
      });
    }
    if (extras.distance_km != null) xs = xs.filter((s) => s.distance_km != null && s.distance_km <= extras.distance_km!);
    if (extras.traveller.length) xs = xs.filter((s) => extras.traveller.some((t) => s.tags.includes(t)));
    if (extras.environment) xs = xs.filter((s) => s.tags.includes(extras.environment!));
    return xs;
  }, [data, extras]);

  const activeFilterCount =
    filters.categories.length + filters.tags.length +
    (filters.max_price ? 1 : 0) + (filters.max_duration_min ? 1 : 0) +
    extras.time_of_day.length + extras.traveller.length +
    (extras.distance_km != null ? 1 : 0) + (extras.near_hotel ? 1 : 0) +
    (extras.price_band != null ? 1 : 0) + (extras.duration_bucket ? 1 : 0) +
    (extras.environment ? 1 : 0) + (extras.accessibility ? 1 : 0) +
    (extras.booking_required ? 1 : 0) + (extras.fits_itinerary ? 1 : 0) +
    (extras.trip_day ? 1 : 0);

  function toggleRail(kind: "category" | "tag", id: string) {
    setFilters((f) => {
      if (kind === "category") {
        const next = f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id];
        return { ...f, categories: next };
      }
      const next = f.tags.includes(id) ? f.tags.filter((c) => c !== id) : [...f.tags, id];
      return { ...f, tags: next };
    });
  }

  function handleSave(seed: SeedCard) {
    setSavedIds((s) => {
      const next = new Set(s);
      if (next.has(seed.id)) next.delete(seed.id);
      else next.add(seed.id);
      return next;
    });
    addFn({ data: { seed_id: seed.id, day_date: null, scope: "personal" } })
      .then(() => { toast.success("Saved for later"); qc.invalidateQueries({ queryKey: ["itineraryHome"] }); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't save"));
  }

  function openAdd(seed: SeedCard) { setAddSeed(seed); setAddOpen(true); }
  function openDetail(seed: SeedCard) { setSelected(seed); setDetailOpen(true); }

  async function handleSubmitAdd(p: AddToItineraryPayload) {
    if (!addSeed) return;
    try {
      await addFn({ data: {
        seed_id: addSeed.id,
        day_date: p.day_date,
        start_time: p.start_time,
        scope: p.scope,
      } });
      const dayLabel = p.day_date ? days.find((d) => d.date === p.day_date)?.label ?? p.day_date : "your backlog";
      toast.success(p.day_date ? `Added to ${dayLabel}${p.start_time ? `, ${p.start_time}` : ""}` : "Parked in your backlog");
      qc.invalidateQueries({ queryKey: ["itineraryHome"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add");
    }
  }

  // map pins
  const pins: SnapPin[] = useMemo(
    () => items.filter((i) => i.lat != null && i.lng != null).map((i) => ({
      id: i.id, lat: i.lat!, lng: i.lng!, label: i.title, sub: i.category, kind: "activity",
    })),
    [items],
  );
  const mapCenter: [number, number] = useMemo(() => {
    if (coords) return [coords.lng, coords.lat];
    const withCoord = items.find((i) => i.lat != null && i.lng != null);
    if (withCoord) return [withCoord.lng!, withCoord.lat!];
    return [115.1889, -8.4095]; // Bali default
  }, [coords, items]);

  const showSplit = !isMobile;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6">
      <div className="space-y-4">
        <DiscoverHero
          destination={destination}
          coverUrl={trip?.cover_image_url}
          activeChip={heroChip}
          onNearMe={() => { setHeroChip((c) => c === "near" ? null : "near"); setFilters((f) => ({ ...f, near_me: !f.near_me })); ensureLocation(); }}
          onToday={() => {
            const today = new Date().toISOString().slice(0, 10);
            setHeroChip((c) => c === "today" ? null : "today");
            setExtras((e) => ({ ...e, trip_day: e.trip_day === today ? null : today }));
          }}
          onMustDo={() => {
            setHeroChip((c) => c === "must" ? null : "must");
            setFilters((f) => f.categories.length ? { ...f, categories: [] } : { ...f, categories: ["activity", "culture", "food"] });
          }}
        />

        <DiscoverSearchRow
          query={filters.query}
          onQueryChange={(q) => setFilters((f) => ({ ...f, query: q }))}
          nearMe={filters.near_me}
          onToggleNear={() => { setFilters((f) => ({ ...f, near_me: !f.near_me })); ensureLocation(); }}
          onOpenFilters={() => setFiltersOpen(true)}
          onToggleMap={() => setView((v) => v === "map" ? "grid" : "map")}
          mapActive={view === "map"}
          filterCount={activeFilterCount}
        />

        <CategoryRail
          categories={filters.categories}
          tags={filters.tags}
          onToggle={toggleRail}
          onMore={() => setFiltersOpen(true)}
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{isLoading ? "Loading…" : `${items.length} activities`}</p>
          <ViewToggle value={view} onChange={setView} showSplit={showSplit} />
        </div>

        {/* content */}
        {view === "map" ? (
          <div className="-mx-4 h-[calc(100dvh-280px)] overflow-hidden rounded-3xl border bg-card sm:mx-0">
            <SnapMap
              center={mapCenter}
              zoom={11}
              pins={pins}
              focusedId={hoveredId}
              onPinClick={(id) => {
                const s = items.find((x) => x.id === id);
                if (s) { setSelected(s); setPinPreviewOpen(true); }
              }}
            />
          </div>
        ) : view === "split" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,520px)]">
            <CardGrid items={items} loading={isLoading} hoveredId={hoveredId} savedIds={savedIds} onOpen={openDetail} onAdd={openAdd} onSave={handleSave} onHover={setHoveredId} onReset={() => { setFilters(EMPTY_FILTERS); setExtras(EMPTY_EXTRA); }} />
            <div className="sticky top-20 h-[calc(100dvh-180px)] overflow-hidden rounded-3xl border bg-card">
              <SnapMap
                center={mapCenter}
                zoom={11}
                pins={pins}
                focusedId={hoveredId}
                onPinClick={(id) => { const s = items.find((x) => x.id === id); if (s) openDetail(s); }}
              />
            </div>
          </div>
        ) : (
          <CardGrid items={items} loading={isLoading} hoveredId={hoveredId} savedIds={savedIds} onOpen={openDetail} onAdd={openAdd} onSave={handleSave} onHover={setHoveredId} onReset={() => { setFilters(EMPTY_FILTERS); setExtras(EMPTY_EXTRA); }} />
        )}
      </div>

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        extras={extras}
        onApply={({ filters: f, extras: e }) => { setFilters(f); setExtras(e); }}
        days={days}
        resultCount={items.length}
      />

      <SeedDetailDrawer
        seed={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        saved={selected ? savedIds.has(selected.id) : false}
        onSave={() => selected && handleSave(selected)}
        onAdd={() => { if (selected) { setDetailOpen(false); openAdd(selected); } }}
      />

      <MapPinPreviewSheet
        seed={selected}
        open={pinPreviewOpen}
        onOpenChange={setPinPreviewOpen}
        onView={() => { setPinPreviewOpen(false); setDetailOpen(true); }}
        onAdd={() => { if (selected) { setPinPreviewOpen(false); openAdd(selected); } }}
      />

      <AddToItinerarySheet
        seed={addSeed}
        open={addOpen}
        onOpenChange={setAddOpen}
        days={days}
        existing={existingActivities}
        onSubmit={handleSubmitAdd}
      />
    </main>
  );
}

function CardGrid({
  items, loading, hoveredId, savedIds, onOpen, onAdd, onSave, onHover, onReset,
}: {
  items: SeedCard[];
  loading: boolean;
  hoveredId: string | null;
  savedIds: Set<string>;
  onOpen: (s: SeedCard) => void;
  onAdd: (s: SeedCard) => void;
  onSave: (s: SeedCard) => void;
  onHover: (id: string | null) => void;
  onReset: () => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-3xl" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border bg-card p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 font-display text-2xl">Nothing matches that</h2>
        <p className="mt-1 text-sm text-muted-foreground">Try clearing a filter or two.</p>
        <button onClick={onReset} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground">Reset filters</button>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((s) => (
        <ActivityCard
          key={s.id}
          seed={s}
          saved={savedIds.has(s.id)}
          hovered={hoveredId === s.id}
          onOpen={() => onOpen(s)}
          onAdd={() => onAdd(s)}
          onSave={() => onSave(s)}
          onHover={onHover}
        />
      ))}
    </div>
  );
}
