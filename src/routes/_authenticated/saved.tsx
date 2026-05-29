import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getItineraryHome } from "@/lib/trip.functions";
import { Heart, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/saved")({ component: SavedPage });

function SavedPage() {
  const homeFn = useServerFn(getItineraryHome);
  const { data } = useQuery({ queryKey: ["itineraryHome"], queryFn: () => homeFn() });
  const parked = (data?.activities ?? []).filter((a) => a.parked);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Backlog</p>
        <h1 className="font-display text-3xl">Saved for later</h1>
        <p className="mt-1 text-sm text-muted-foreground">Activities you've parked. Drop them into your plan when ready.</p>
      </div>

      {parked.length === 0 ? (
        <div className="rounded-3xl border bg-card p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl">Nothing saved yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any activity to save it here.</p>
          <Link to="/discover" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground">Discover activities</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {parked.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-2xl border bg-card">
              <div className="aspect-[4/3] w-full bg-muted">
                {a.image_url && <img src={a.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 font-display text-base">{a.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  {a.duration_min && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(a.duration_min / 60)}h</span>}
                  {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
