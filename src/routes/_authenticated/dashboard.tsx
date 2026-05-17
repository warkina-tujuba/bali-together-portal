import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getItineraryHome, isAdmin as isAdminFn, setRsvp,
  recommendActivities, addCatalogueToTrip, createMagicLink,
} from "@/lib/trip.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Crown, Users, MapPin, Sparkles, Check, Plus, ExternalLink,
  Copy, AlertCircle, Plane, Home as HomeIcon, MessageCircle,
} from "lucide-react";
import { ItineraryMap } from "@/components/dashboard/ItineraryMap";
import { HostEventDialog } from "@/components/trip/HostEventDialog";
import { FlightDialog } from "@/components/trip/FlightDialog";
import { StayDialog } from "@/components/trip/StayDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type Activity = {
  id: string;
  trip_id: string;
  day_date: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  is_host_event: boolean;
  booking_url: string | null;
  created_by: string | null;
  category: string;
};

type Rsvp = { activity_id: string; user_id: string; status: "going" | "maybe" | "declined" };
type Member = { id: string; full_name: string | null; avatar_url: string | null };

function dateRange(startISO: string, endISO: string) {
  const out: string[] = [];
  const s = new Date(startISO); const e = new Date(endISO);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
    if (out.length > 40) break;
  }
  return out;
}

function fmtDay(iso: string) {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString(undefined, { weekday: "short" }), day: d.getDate(), mon: d.toLocaleDateString(undefined, { month: "short" }) };
}

function Dashboard() {
  const homeFn = useServerFn(getItineraryHome);
  const adminCheck = useServerFn(isAdminFn);
  const rsvpFn = useServerFn(setRsvp);
  const recFn = useServerFn(recommendActivities);
  const addCat = useServerFn(addCatalogueToTrip);
  const magicFn = useServerFn(createMagicLink);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["itineraryHome"], queryFn: () => homeFn() });
  const { data: adminData } = useQuery({ queryKey: ["isAdmin"], queryFn: () => adminCheck() });

  const [adventure, setAdventure] = useState(3);
  const [pace, setPace] = useState(3);
  const [popularity, setPopularity] = useState(3);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: recs } = useQuery({
    queryKey: ["recs", adventure, pace, popularity],
    queryFn: () => recFn({ data: { adventure, pace, popularity, limit: 12 } }),
    enabled: !!data?.trip,
  });

  const isAdmin = !!adminData?.admin;

  const days = useMemo(() => data?.trip ? dateRange(data.trip.start_date, data.trip.end_date) : [], [data?.trip]);
  const activeDay = selectedDay ?? days[0];

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, Activity[]>();
    (data?.activities ?? []).forEach((a: Activity) => {
      if (!map.has(a.day_date)) map.set(a.day_date, []);
      map.get(a.day_date)!.push(a);
    });
    // host events first then by start_time
    map.forEach((arr) => arr.sort((a, b) => {
      if (a.is_host_event !== b.is_host_event) return a.is_host_event ? -1 : 1;
      return (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99");
    }));
    return map;
  }, [data?.activities]);

  const rsvpsByActivity = useMemo(() => {
    const map = new Map<string, Rsvp[]>();
    (data?.rsvps ?? []).forEach((r: Rsvp) => {
      if (!map.has(r.activity_id)) map.set(r.activity_id, []);
      map.get(r.activity_id)!.push(r);
    });
    return map;
  }, [data?.rsvps]);

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    (data?.members ?? []).forEach((mm: Member) => m.set(mm.id, mm));
    return m;
  }, [data?.members]);

  const mapPins = useMemo(() => {
    if (!data) return [];
    const pins: { id: string; lat: number; lng: number; label: string; sub?: string; kind: "stay" | "activity" | "host" }[] = [];
    data.stays.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      pins.push({ id: `stay-${s.id}`, lat: s.lat, lng: s.lng, label: s.name, sub: s.address ?? undefined, kind: "stay" });
    });
    const dayActs = activitiesByDay.get(activeDay) ?? [];
    dayActs.filter((a) => a.lat != null && a.lng != null).forEach((a) => {
      pins.push({ id: a.id, lat: a.lat!, lng: a.lng!, label: a.title, sub: a.location ?? undefined, kind: a.is_host_event ? "host" : "activity" });
    });
    return pins;
  }, [data, activitiesByDay, activeDay]);

  async function handleRsvp(activityId: string, status: "going" | "maybe") {
    try {
      await rsvpFn({ data: { activity_id: activityId, status } });
      qc.invalidateQueries({ queryKey: ["itineraryHome"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't RSVP"); }
  }

  async function addRecommendation(catalogueId: string) {
    try {
      await addCat({ data: { catalogue_id: catalogueId, day_date: activeDay } });
      toast.success("Added to your trip");
      qc.invalidateQueries({ queryKey: ["itineraryHome"] });
      qc.invalidateQueries({ queryKey: ["recs"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add"); }
  }

  async function copyMagic() {
    try {
      const r = await magicFn({ data: { full_name: "Guest", max_uses: 50 } });
      const url = `${window.location.origin}/?invite=${r.token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Magic link copied!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't create link"); }
  }

  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!data.trip) return (
    <div className="mx-auto max-w-md p-6">
      <Card className="rounded-3xl border-0 p-7 shadow-card">
        <h2 className="font-display text-3xl">No trip yet</h2>
        <p className="mt-2 text-muted-foreground">Start a new trip or paste a magic link.</p>
        <Link to="/choose" className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">Get started</Link>
      </Card>
    </div>
  );

  const trip = data.trip;
  const center: [number, number] = [trip.map_center_lng ?? 115.0875, trip.map_center_lat ?? -8.829];
  const myFlight = (data as { flights?: { user_id: string }[] }).flights?.find?.((f) => f.user_id === data.userId);
  const myStay = data.stays.find((s: { user_id: string }) => s.user_id === data.userId);

  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5">
      {/* Hero strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{trip.destination}</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{trip.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(trip.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(trip.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {data.members.length} in the crew
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && <HostEventDialog defaultDate={activeDay} />}
          {isAdmin && (
            <Button variant="outline" className="rounded-full" onClick={copyMagic}>
              <Copy className="mr-2 h-4 w-4" /> Invite
            </Button>
          )}
          <Link to="/map"><Button variant="ghost" className="rounded-full"><MapPin className="mr-2 h-4 w-4" />Live map</Button></Link>
          <Link to="/chat"><Button variant="ghost" className="rounded-full"><MessageCircle className="mr-2 h-4 w-4" />Chat</Button></Link>
        </div>
      </div>

      {/* Setup reminders */}
      {(!myFlight || !myStay) && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {!myFlight && (
            <FlightDialog
              defaultDate={trip.start_date}
              trigger={
                <button className="flex w-full items-center justify-between gap-2 rounded-2xl bg-primary/10 px-4 py-2.5 text-left text-sm">
                  <span className="flex items-center gap-2"><Plane className="h-4 w-4 text-primary" />Add your flight</span>
                  <AlertCircle className="h-4 w-4 text-primary" />
                </button>
              }
            />
          )}
          {!myStay && (
            <StayDialog
              trigger={
                <button className="flex w-full items-center justify-between gap-2 rounded-2xl bg-primary/10 px-4 py-2.5 text-left text-sm">
                  <span className="flex items-center gap-2"><HomeIcon className="h-4 w-4 text-primary" />Add your stay</span>
                  <AlertCircle className="h-4 w-4 text-primary" />
                </button>
              }
            />
          )}
        </div>
      )}

      {/* Date strip */}
      <div className="mb-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d) => {
          const f = fmtDay(d);
          const active = d === activeDay;
          const count = activitiesByDay.get(d)?.length ?? 0;
          const hostCount = (activitiesByDay.get(d) ?? []).filter((a) => a.is_host_event).length;
          return (
            <button key={d} onClick={() => setSelectedDay(d)} className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-80">{f.dow}</div>
              <div className="font-display text-xl leading-none">{f.day}</div>
              <div className="text-[10px] opacity-80">{f.mon}</div>
              <div className="mt-1 flex items-center gap-1 text-[10px]">
                {hostCount > 0 && <Crown className="h-2.5 w-2.5" />}
                {count > 0 ? `${count}` : "·"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Split: list left / map right */}
      <div className="grid gap-4 lg:grid-cols-[1fr_520px]">
        {/* LEFT: day plan + recommendations */}
        <div className="space-y-4">
          <Card className="rounded-3xl border-0 p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">
                {new Date(activeDay).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </h2>
              {isAdmin && <HostEventDialog defaultDate={activeDay} trigger={
                <Button size="sm" variant="ghost" className="rounded-full"><Crown className="mr-1 h-3.5 w-3.5" />Host event</Button>
              } />}
            </div>

            <div className="mt-3 space-y-3">
              {(activitiesByDay.get(activeDay) ?? []).length === 0 && (
                <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
                  Nothing scheduled for this day yet. Pick something from the recommendations below, or have your host add an event.
                </p>
              )}
              {(activitiesByDay.get(activeDay) ?? []).map((a) => {
                const rsvps = rsvpsByActivity.get(a.id) ?? [];
                const going = rsvps.filter((r) => r.status === "going");
                const maybe = rsvps.filter((r) => r.status === "maybe");
                const myRsvp = rsvps.find((r) => r.user_id === data.userId)?.status;
                const creator = a.created_by ? memberById.get(a.created_by) : null;
                return (
                  <div key={a.id} onMouseEnter={() => setFocusedId(a.id)} className={`overflow-hidden rounded-2xl border ${a.is_host_event ? "border-primary/60 bg-primary/5" : "border-border bg-background"}`}>
                    <div className="flex">
                      {a.image_url && (
                        <img src={a.image_url} alt="" className="hidden h-24 w-24 shrink-0 object-cover sm:block" />
                      )}
                      <div className="min-w-0 flex-1 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {a.is_host_event && <Badge className="bg-primary text-primary-foreground"><Crown className="mr-1 h-3 w-3" />Hosted</Badge>}
                              {a.start_time && <span className="text-xs font-medium text-muted-foreground tabular-nums">{a.start_time.slice(0, 5)}{a.end_time ? ` – ${a.end_time.slice(0, 5)}` : ""}</span>}
                            </div>
                            <h3 className="mt-1 line-clamp-1 font-medium">{a.title}</h3>
                            {a.location && <p className="line-clamp-1 text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{a.location}</p>}
                            {creator && <p className="mt-0.5 text-[11px] text-muted-foreground">Added by {creator.full_name ?? "a guest"}</p>}
                          </div>
                          {a.booking_url && (
                            <a href={a.booking_url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                              Book <ExternalLink className="ml-0.5 inline h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex -space-x-1.5">
                            {going.slice(0, 6).map((r) => {
                              const m = memberById.get(r.user_id);
                              return (
                                <div key={r.user_id} title={m?.full_name ?? "Guest"} className="h-6 w-6 overflow-hidden rounded-full border-2 border-background bg-secondary text-[10px] font-medium flex items-center justify-center">
                                  {m?.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m?.full_name?.[0] ?? "?")}
                                </div>
                              );
                            })}
                            {going.length > 6 && <span className="ml-2 text-xs text-muted-foreground">+{going.length - 6}</span>}
                            {going.length === 0 && <span className="text-xs text-muted-foreground">No-one's in yet</span>}
                            {maybe.length > 0 && <span className="ml-3 text-xs text-muted-foreground">· {maybe.length} interested</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant={myRsvp === "going" ? "default" : "outline"} className="h-7 rounded-full px-3 text-xs" onClick={() => handleRsvp(a.id, "going")}>
                              {myRsvp === "going" ? <><Check className="mr-1 h-3 w-3" />Going</> : "Join"}
                            </Button>
                            <Button size="sm" variant={myRsvp === "maybe" ? "secondary" : "ghost"} className="h-7 rounded-full px-3 text-xs" onClick={() => handleRsvp(a.id, "maybe")}>
                              Interested
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recommendations + sliders */}
          <Card className="rounded-3xl border-0 p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Recommended for your crew</h2>
                <p className="text-xs text-muted-foreground">Tune the dials — picks update live. Add to <strong>{new Date(activeDay).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong>.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ScaleSlider label="Adventure" left="Relaxed" right="Adventure" value={adventure} onChange={setAdventure} />
              <ScaleSlider label="Pace" left="Slow" right="Fast" value={pace} onChange={setPace} />
              <ScaleSlider label="Vibe" left="Hidden gems" right="Popular" value={popularity} onChange={setPopularity} />
            </div>

            <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2">
              {(recs?.recommendations ?? []).map((r) => (
                <div key={r.catalogue_id} className="w-56 shrink-0 overflow-hidden rounded-2xl border bg-background">
                  <img src={r.image_url} alt="" className="h-28 w-full object-cover" />
                  <div className="p-3">
                    <h4 className="line-clamp-2 text-sm font-medium leading-snug">{r.title}</h4>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{r.location}</p>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.daypart} · {Math.round(r.duration_min / 60)}h</span>
                      <Button size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => addRecommendation(r.catalogue_id)}>
                        <Plus className="mr-1 h-3 w-3" />Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {(!recs || recs.recommendations.length === 0) && (
                <p className="p-4 text-sm text-muted-foreground">Loading suggestions…</p>
              )}
            </div>
          </Card>

          {/* Crew */}
          <Card className="rounded-3xl border-0 p-4 shadow-soft sm:p-5">
            <h3 className="font-display text-xl flex items-center gap-2"><Users className="h-4 w-4" />The crew · {data.members.length}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.members.map((m: Member) => (
                <div key={m.id} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
                  <div className="h-6 w-6 overflow-hidden rounded-full bg-background text-xs font-medium flex items-center justify-center">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.full_name?.[0] ?? "?")}
                  </div>
                  <span className="text-xs font-medium">{m.full_name ?? "Guest"}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: sticky map */}
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <Card className="h-[55vh] overflow-hidden rounded-3xl border-0 shadow-card lg:h-full">
            <ItineraryMap center={center} zoom={trip.map_default_zoom ?? 11} pins={mapPins} focusedId={focusedId} />
          </Card>
        </div>
      </div>
    </main>
  );
}

function ScaleSlider({ label, left, right, value, onChange }: {
  label: string; left: string; right: string; value: number; onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}/5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} className="mt-2" />
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  );
}
