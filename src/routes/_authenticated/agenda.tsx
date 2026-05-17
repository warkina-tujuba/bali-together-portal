import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAgenda, setRsvp } from "@/lib/trip.functions";
import { EventCard, type RsvpStatus } from "@/components/trip/EventCard";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agenda")({ component: Agenda });

function Agenda() {
  const fn = useServerFn(listAgenda);
  const rsvpFn = useServerFn(setRsvp);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["agenda"], queryFn: () => fn() });

  const mut = useMutation({
    mutationFn: (input: { activity_id: string; status: "going" | "maybe" | "declined" }) => rsvpFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update RSVP"),
  });

  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  if (data.events.length === 0) {
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Calendar className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="font-display text-3xl">No events yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">When the host locks events in, they'll show up here for you to RSVP.</p>
      </main>
    );
  }

  // Group by day_date
  const grouped = new Map<string, typeof data.events>();
  for (const e of data.events) {
    if (!grouped.has(e.day_date)) grouped.set(e.day_date, []);
    grouped.get(e.day_date)!.push(e);
  }

  const totalGoing = Object.values(data.rsvps).filter((s) => s === "going").length;

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-28">
      <h1 className="font-display text-4xl">Your agenda</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.events.length} events · you're going to {totalGoing}
      </p>

      <div className="mt-6 space-y-6">
        {Array.from(grouped.entries()).map(([date, evs]) => (
          <section key={date}>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <div className="space-y-3">
              {evs.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={{
                    id: ev.id,
                    title: ev.title,
                    description: ev.description,
                    day_date: ev.day_date,
                    start_time: ev.start_time,
                    end_time: ev.end_time,
                    location: ev.location,
                    image_url: ev.image_url,
                    category: ev.category,
                  }}
                  myStatus={(data.rsvps[ev.id] ?? null) as RsvpStatus}
                  counts={data.counts[ev.id] ?? { going: 0, maybe: 0, declined: 0 }}
                  onRsvp={(status) => {
                    if (!status) return;
                    mut.mutate({ activity_id: ev.id, status });
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
