import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getItinerary, getTripPreferences, applyPreferences, isAdmin as isAdminFn, addEvent, geocode, setRsvp, listAgenda } from "@/lib/trip.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, ChevronDown } from "lucide-react";
import { PreferencesQuiz } from "@/components/trip/PreferencesQuiz";
import { EventBuilder } from "@/components/trip/EventBuilder";
import { EventCard, type RsvpStatus } from "@/components/trip/EventCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/itinerary")({ component: Itinerary });

function Itinerary() {
  const itinFn = useServerFn(getItinerary);
  const prefsFn = useServerFn(getTripPreferences);
  const applyFn = useServerFn(applyPreferences);
  const adminFn = useServerFn(isAdminFn);
  const addFn = useServerFn(addEvent);
  const geoFn = useServerFn(geocode);
  const rsvpFn = useServerFn(setRsvp);
  const agendaFn = useServerFn(listAgenda);
  const qc = useQueryClient();

  const { data: itin, isLoading } = useQuery({ queryKey: ["itinerary"], queryFn: () => itinFn() });
  const { data: prefs } = useQuery({ queryKey: ["trip-prefs"], queryFn: () => prefsFn() });
  const { data: admin } = useQuery({ queryKey: ["isAdmin"], queryFn: () => adminFn() });
  const { data: agenda } = useQuery({ queryKey: ["agenda"], queryFn: () => agendaFn() });

  const [openBuilder, setOpenBuilder] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const applyMut = useMutation({
    mutationFn: (input: { vibes: string[]; must_do: string[]; avoid: string[]; pace: number; budget: number }) =>
      applyFn({ data: input }),
    onSuccess: (r) => {
      toast.success(`Plan built — ${r.days} days, ${r.events} events`);
      setQuizOpen(false);
      qc.invalidateQueries({ queryKey: ["itinerary"] });
      qc.invalidateQueries({ queryKey: ["agenda"] });
      qc.invalidateQueries({ queryKey: ["trip-prefs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't build plan"),
  });

  const rsvpMut = useMutation({
    mutationFn: (input: { activity_id: string; status: "going" | "maybe" | "declined" }) => rsvpFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "RSVP failed"),
  });

  if (isLoading || !itin) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const isAdmin = !!admin?.admin;
  const hasPrefs = !!prefs?.prefs;

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">The plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">{itin.days.length} days · {itin.activities.length} events</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setQuizOpen((v) => !v)} variant="outline" className="h-10 rounded-xl">
            <Sparkles className="mr-1.5 h-4 w-4" />{hasPrefs ? "Tune prefs" : "Set prefs"}
          </Button>
        )}
      </div>

      {isAdmin && (quizOpen || (!hasPrefs && itin.days.length === 0)) && (
        <Card className="mt-4 rounded-3xl border-0 p-6 shadow-soft">
          <p className="font-display text-xl">Tell us your vibe</p>
          <p className="mb-4 text-sm text-muted-foreground">A few quick taps and we'll lock in a draft for everyone.</p>
          <PreferencesQuiz
            initial={prefs?.prefs ? {
              vibes: prefs.prefs.vibes ?? [],
              must_do: prefs.prefs.must_do ?? [],
              avoid: prefs.prefs.avoid ?? [],
              pace: prefs.prefs.pace ?? 3,
              budget: prefs.prefs.budget ?? 2,
            } : undefined}
            onComplete={async (p) => { await applyMut.mutateAsync(p); }}
          />
        </Card>
      )}

      {itin.days.length === 0 && !quizOpen && (
        <Card className="mt-6 rounded-3xl border-0 p-6 text-center shadow-soft">
          <p className="text-muted-foreground">No days planned yet. {isAdmin ? "Set prefs to build a draft." : "The host will lock events in soon."}</p>
        </Card>
      )}

      <div className="mt-6 space-y-8">
        {itin.days.map((d) => {
          const acts = itin.activities.filter((a) => a.day_date === d.day_date);
          return (
            <section key={d.id}>
              <div className="flex items-baseline gap-3">
                <p className="font-display text-3xl text-primary">{new Date(d.day_date).toLocaleDateString(undefined, { day: "numeric" })}</p>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {new Date(d.day_date).toLocaleDateString(undefined, { weekday: "long", month: "short" })}
                  </p>
                  <h2 className="font-display text-2xl">{d.title}</h2>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setOpenBuilder(openBuilder === d.day_date ? null : d.day_date)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    aria-label="Add event"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              {d.summary && <p className="mt-2 text-sm text-muted-foreground">{d.summary}</p>}

              <div className="mt-3 space-y-3">
                {acts.map((a) => (
                  <EventCard
                    key={a.id}
                    event={{
                      id: a.id,
                      title: a.title,
                      description: a.description,
                      day_date: a.day_date,
                      start_time: a.start_time,
                      end_time: a.end_time,
                      location: a.location,
                      image_url: a.image_url,
                      category: a.category,
                    }}
                    myStatus={(agenda?.rsvps[a.id] ?? null) as RsvpStatus}
                    counts={agenda?.counts[a.id] ?? { going: 0, maybe: 0, declined: 0 }}
                    onRsvp={(status) => status && rsvpMut.mutate({ activity_id: a.id, status })}
                    compact
                  />
                ))}
                {acts.length === 0 && <p className="text-xs text-muted-foreground">No events for this day yet.</p>}
              </div>

              {openBuilder === d.day_date && (
                <div className="mt-3">
                  <EventBuilder
                    dayDate={d.day_date}
                    geocode={geoFn}
                    onAdd={async (p) => {
                      await addFn({ data: {
                        day_date: p.day_date,
                        title: p.title,
                        start_time: p.start_time ?? null,
                        end_time: p.end_time ?? null,
                        location: p.location ?? null,
                        description: p.description ?? null,
                        category: p.category ?? "activity",
                        image_url: p.image_url ?? null,
                        lat: p.lat ?? null,
                        lng: p.lng ?? null,
                      } });
                      toast.success("Event added");
                      qc.invalidateQueries({ queryKey: ["itinerary"] });
                      qc.invalidateQueries({ queryKey: ["agenda"] });
                    }}
                    onClose={() => setOpenBuilder(null)}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Catch-all add for any date (admins only, when no days exist) */}
      {isAdmin && itin.days.length > 0 && (
        <button
          onClick={() => setOpenBuilder(itin.days[0].day_date)}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-medium text-primary"
        >
          <Plus className="h-4 w-4" /> Add another event
        </button>
      )}

      {!isAdmin && itin.days.length > 0 && (
        <p className="mt-8 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <ChevronDown className="h-3 w-3" /> Tap events to RSVP
        </p>
      )}
    </main>
  );
}
