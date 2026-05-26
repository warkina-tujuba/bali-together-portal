import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { listDiscover, addSeedToPlan, type SeedCard } from "@/lib/discover.functions";
import { getItineraryHome } from "@/lib/trip.functions";
import { FilterBar, EMPTY_FILTERS, type DiscoverFilters } from "@/components/discover/FilterBar";
import { ActivityCard } from "@/components/discover/ActivityCard";
import { SeedDetailDrawer } from "@/components/discover/SeedDetailDrawer";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/discover")({ component: DiscoverPage });

function dateRange(startISO: string, endISO: string) {
  const out: string[] = [];
  const s = new Date(startISO); const e = new Date(endISO);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
    if (out.length > 40) break;
  }
  return out;
}

function DiscoverPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listDiscover);
  const addFn = useServerFn(addSeedToPlan);
  const homeFn = useServerFn(getItineraryHome);
  const qc = useQueryClient();

  const [filters, setFilters] = useState<DiscoverFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<SeedCard | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // user location for "near me"
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  function ensureLocation() {
    if (!filters.near_me || coords) return;
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setCoords(null),
        { timeout: 4000 },
      );
    }
  }

  const { data: home } = useQuery({ queryKey: ["itineraryHome"], queryFn: () => homeFn() });
  const days = useMemo(() => home?.trip ? dateRange(home.trip.start_date, home.trip.end_date) : [], [home?.trip]);

  const queryKey = ["discover", filters, coords] as const;
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      ensureLocation();
      return listFn({ data: {
        categories: filters.categories,
        tags: filters.tags,
        max_price: filters.max_price,
        max_duration_min: filters.max_duration_min,
        near: filters.near_me && coords ? coords : undefined,
        query: filters.query || undefined,
        limit: 60,
      } });
    },
  });

  const items = data?.items ?? [];

  async function handleAdd(seed: SeedCard, args: { day_date: string | null; scope: "personal" | "shared" }) {
    try {
      const r = await addFn({ data: { seed_id: seed.id, day_date: args.day_date, scope: args.scope } });
      toast.success(r.parked ? "Parked in your backlog" : "Added to your plan");
      qc.invalidateQueries({ queryKey: ["itineraryHome"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add"); }
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Find your trip</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">Discover</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tap a card for details, then add it to your plan or park it for later.</p>
        </div>
        <button onClick={() => navigate({ to: "/dashboard" })} className="rounded-full border px-4 py-2 text-xs font-medium hover:bg-secondary">
          Go to my plan →
        </button>
      </div>

      <div className="mb-4">
        <FilterBar filters={filters} onChange={(f) => { setFilters(f); if (f.near_me && !coords) ensureLocation(); }} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl">Nothing matches that</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing a filter or two.</p>
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground">Reset filters</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((s) => (
            <ActivityCard
              key={s.id}
              seed={s}
              onOpen={() => { setSelected(s); setDrawerOpen(true); }}
              onAdd={() => { setSelected(s); setDrawerOpen(true); }}
            />
          ))}
        </div>
      )}

      <SeedDetailDrawer
        seed={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        days={days}
        onAdd={(args) => selected ? handleAdd(selected, args) : Promise.resolve()}
      />
    </main>
  );
}
