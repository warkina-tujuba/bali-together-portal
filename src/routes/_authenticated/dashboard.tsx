import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getDashboard, suggestItinerary, updateProfile, isAdmin as isAdminFn, createMagicLink } from "@/lib/trip.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plane, Home, MessageCircle, Sparkles, Send, CheckCircle2, AlertCircle, Users, Copy, Check } from "lucide-react";
import { FlightDialog } from "@/components/trip/FlightDialog";
import { StayDialog } from "@/components/trip/StayDialog";
import { airlineLogoUrl, parseAirlineCode } from "@/lib/airline";
import { bookingSourceMeta } from "@/lib/booking-source";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const fn = useServerFn(getDashboard);
  const aiFn = useServerFn(suggestItinerary);
  const updFn = useServerFn(updateProfile);
  const adminCheck = useServerFn(isAdminFn);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const { data: adminData } = useQuery({ queryKey: ["isAdmin"], queryFn: () => adminCheck() });
  const [aiDays, setAiDays] = useState<Array<{ date: string; title: string; items: string[] }> | null>(null);

  const aiMut = useMutation({
    mutationFn: () => aiFn(),
    onSuccess: (r) => { setAiDays(r.days); toast.success("Itinerary drafted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });

  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!data.trip) return (
    <div className="mx-auto max-w-md p-6">
      <Card className="rounded-3xl border-0 p-7 shadow-card">
        <h2 className="font-display text-3xl">No trip yet</h2>
        <p className="mt-2 text-muted-foreground">You're not linked to a trip — paste your invite code.</p>
        <Link to="/" className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">Enter code</Link>
      </Card>
    </div>
  );

  const trip = data.trip;
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const days = Math.max(0, Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isAdmin = !!adminData?.admin;

  const myFlight = data.flights.find((f) => f.user_id === data.profile?.id);
  const myStay = data.stays.find((s) => s.user_id === data.profile?.id);

  const steps = [
    { done: !!myFlight, label: "Flight" },
    { done: !!myStay, label: "Stay" },
  ];
  const completed = steps.filter((s) => s.done).length;
  const allReady = completed === steps.length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-8">
      {/* Hero */}
      <Card
        className="overflow-hidden rounded-3xl border-0 p-0 shadow-card"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(27,43,33,0.15) 0%, rgba(27,43,33,0.78) 100%), url('${trip.cover_image_url ?? "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=1600&q=80"}')`,
          backgroundSize: "cover", backgroundPosition: "center",
        }}
      >
        <div className="flex min-h-[240px] flex-col justify-end p-6 text-white sm:min-h-[320px] sm:p-10">
          <p className="text-xs uppercase tracking-widest opacity-80">{trip.destination}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight sm:text-6xl">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{days === 0 ? "Today!" : `${days} days to go`}</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{data.members.length}</span>
          </div>
        </div>
      </Card>

      {/* Reminder banners */}
      {!myFlight && (
        <FlightDialog
          trigger={
            <button className="mt-4 flex w-full flex-col items-start justify-between gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-left sm:flex-row sm:items-center">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Your flight isn't confirmed yet — add it so the crew can see arrivals.</span>
              </div>
              <span className="shrink-0 text-sm font-medium text-primary">Add flight →</span>
            </button>
          }
        />
      )}
      {!myStay && (
        <StayDialog
          trigger={
            <button className="mt-4 flex w-full flex-col items-start justify-between gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-left sm:flex-row sm:items-center">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Your accommodation isn't confirmed yet — pin it on the map.</span>
              </div>
              <span className="shrink-0 text-sm font-medium text-primary">Add stay →</span>
            </button>
          }
        />
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Profile checklist */}
        <Card className="rounded-3xl border-0 p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl">Your trip profile</h2>
              <p className="text-sm text-muted-foreground">{completed} of {steps.length} complete</p>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-secondary" style={{ background: `conic-gradient(var(--primary) ${(completed/steps.length)*360}deg, transparent 0)` }} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FlightDialog
              initial={myFlight ?? undefined}
              trigger={
                <button className="w-full text-left">
                  <StatusTile
                    icon={<Plane className="h-5 w-5" />}
                    title="Flight"
                    status={myFlight ? `${myFlight.airline ?? ""} ${myFlight.flight_number}` : "Not yet confirmed"}
                    done={!!myFlight}
                    logo={myFlight ? airlineLogoUrl(myFlight.airline_iata ?? parseAirlineCode(myFlight.flight_number) ?? "") : undefined}
                    cta={myFlight ? "Edit" : "Add"}
                  />
                </button>
              }
            />
            <StayDialog
              initial={myStay ?? undefined}
              trigger={
                <button className="w-full text-left">
                  <StatusTile
                    icon={<Home className="h-5 w-5" />}
                    title="Accommodation"
                    status={myStay ? `${myStay.name}${myStay.booking_source ? ` • ${bookingSourceMeta(myStay.booking_source).label}` : ""}` : "Not yet confirmed"}
                    done={!!myStay}
                    cta={myStay ? "Edit" : "Add"}
                  />
                </button>
              }
            />
            <Link to="/chat" className="w-full text-left">
              <StatusTile
                icon={<MessageCircle className="h-5 w-5" />}
                title="Group chat"
                status={`${data.members.length} in the crew`}
                done={false}
                cta="Open"
              />
            </Link>
            <button className="w-full text-left" onClick={() => aiMut.mutate()} disabled={aiMut.isPending}>
              <StatusTile
                icon={<Sparkles className="h-5 w-5" />}
                title="AI itinerary"
                status={aiDays ? `${aiDays.length} days drafted` : "Tap to generate"}
                done={!!aiDays}
                cta={aiMut.isPending ? "Thinking…" : (aiDays ? "Regenerate" : "Generate")}
              />
            </button>
          </div>

          {/* AI output */}
          {aiDays && aiDays.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-display text-xl">Suggested plan</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {aiDays.map((d) => (
                  <div key={d.date} className="rounded-2xl bg-secondary p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{new Date(d.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                    <p className="font-display text-lg">{d.title}</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {d.items.map((it, i) => <li key={i}>• {it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ready to send */}
          <div className={`mt-6 rounded-2xl p-4 ${allReady ? "bg-primary/10" : "bg-secondary"}`}>
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-display text-lg">{allReady ? "You're ready to send the magic link" : "Almost ready"}</p>
                <p className="text-sm text-muted-foreground">{allReady ? "Invite the crew with one tap." : "Finish the checklist above to unlock."}</p>
              </div>
              <Link to={isAdmin ? "/admin" : "/chat"}>
                <Button disabled={!allReady} className="h-11 rounded-xl px-5">
                  <Send className="mr-2 h-4 w-4" />{isAdmin ? "Send magic link" : "Open chat"}
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Crew */}
        <Card className="rounded-3xl border-0 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">The crew</h3>
            <span className="text-xs text-muted-foreground">{data.members.length}</span>
          </div>
          <ul className="mt-4 space-y-3">
            {data.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-medium">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.full_name?.[0] ?? "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.full_name ?? "Guest"}</p>
                  <p className="truncate text-xs text-muted-foreground">In the crew</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Group flights + stays */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="rounded-3xl border-0 p-6 shadow-soft">
          <h3 className="font-display text-xl">Flight board</h3>
          <ul className="mt-3 divide-y divide-border">
            {data.flights.length === 0 && <li className="py-3 text-sm text-muted-foreground">No flights yet.</li>}
            {data.flights.map((f) => {
              const code = f.airline_iata ?? parseAirlineCode(f.flight_number);
              return (
                <li key={f.id} className="flex items-center gap-3 py-3">
                  {code ? (
                    <img
                      src={airlineLogoUrl(code)}
                      alt={f.airline ?? code}
                      className="h-9 w-9 shrink-0 rounded bg-white object-contain p-0.5"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                    />
                  ) : <div className="h-9 w-9 shrink-0 rounded bg-secondary" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.airline ?? "Flight"} {f.flight_number}</p>
                    <p className="text-xs text-muted-foreground">{f.origin_iata ?? "—"} → {f.destination_iata ?? "DPS"}</p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">{f.scheduled_at ? new Date(f.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="rounded-3xl border-0 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Stay board</h3>
            <Link to="/map" className="text-xs text-primary">Map →</Link>
          </div>
          <ul className="mt-3 space-y-2">
            {data.stays.length === 0 && <li className="text-sm text-muted-foreground">No stays yet.</li>}
            {data.stays.map((s) => {
              const meta = s.booking_source ? bookingSourceMeta(s.booking_source) : null;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{s.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{s.address}</p>
                  </div>
                  {meta && (
                    s.booking_url ? (
                      <a href={s.booking_url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-background px-2.5 py-1 text-xs font-medium">
                        {meta.emoji} {meta.label}
                      </a>
                    ) : (
                      <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-xs font-medium">{meta.emoji} {meta.label}</span>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </main>
  );
}

function StatusTile({ icon, title, status, done, cta, logo }: {
  icon: React.ReactNode; title: string; status: string; done: boolean; cta: string; logo?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${done ? "border-primary/30 bg-primary/5" : "border-border bg-background"}`}>
      <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
        {logo ? (
          <img src={logo} alt="" className="h-9 w-9 rounded bg-white object-contain p-0.5" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : done ? <CheckCircle2 className="h-5 w-5" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{status}</p>
      </div>
      <span className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium">{cta}</span>
    </div>
  );
}
