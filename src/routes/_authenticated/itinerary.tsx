import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getItinerary } from "@/lib/trip.functions";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/itinerary")({ component: Itinerary });

function Itinerary() {
  const fn = useServerFn(getItinerary);
  const { data, isLoading } = useQuery({ queryKey: ["itinerary"], queryFn: () => fn() });
  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <main className="mx-auto max-w-md px-5 py-6 space-y-5">
      <h1 className="font-display text-4xl">The plan</h1>
      {data.days.length === 0 && <p className="text-muted-foreground">Itinerary coming soon.</p>}
      {data.days.map((d) => {
        const acts = data.activities.filter((a) => a.day_date === d.day_date);
        return (
          <section key={d.id}>
            <div className="flex items-baseline gap-3">
              <p className="font-display text-3xl text-primary">{new Date(d.day_date).toLocaleDateString(undefined, { day: "numeric" })}</p>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{new Date(d.day_date).toLocaleDateString(undefined, { weekday: "long", month: "short" })}</p>
                <h2 className="font-display text-2xl">{d.title}</h2>
              </div>
            </div>
            {d.summary && <p className="mt-2 text-sm text-muted-foreground">{d.summary}</p>}
            <div className="mt-3 space-y-2">
              {acts.map((a) => (
                <Card key={a.id} className="flex gap-3 rounded-2xl border-0 p-4 shadow-soft">
                  <div className="w-16 shrink-0 font-mono text-sm text-muted-foreground">{a.start_time?.slice(0, 5) ?? "—"}</div>
                  <div className="flex-1">
                    <p className="font-medium">{a.title}</p>
                    {a.location && <p className="text-xs text-muted-foreground">{a.location}</p>}
                    {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
