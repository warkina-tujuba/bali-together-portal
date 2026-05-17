import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/trip.functions";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });

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
  const days = Math.max(0, Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <main className="mx-auto max-w-md px-5 py-6 space-y-5">
      {/* Hero */}
      <Card
        className="overflow-hidden rounded-3xl border-0 p-0 shadow-card"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(27,43,33,0.15) 0%, rgba(27,43,33,0.75) 100%), url('${trip.cover_image_url ?? "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=1200&q=80"}')`,
          backgroundSize: "cover", backgroundPosition: "center",
        }}
      >
        <div className="p-6 text-white min-h-[220px] flex flex-col justify-end">
          <p className="text-xs uppercase tracking-widest opacity-80">{trip.destination}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight">{trip.name}</h1>
          <p className="mt-2 text-sm opacity-90">
            {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(trip.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
          <p className="mt-3 inline-flex w-fit rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">{days === 0 ? "Today!" : `${days} days to go`}</p>
        </div>
      </Card>

      {/* Group */}
      <Card className="rounded-3xl border-0 p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">The crew</h3>
          <span className="text-xs text-muted-foreground">{data.members.length}</span>
        </div>
        <div className="mt-3 flex -space-x-2">
          {data.members.slice(0, 8).map((m) => (
            <div key={m.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-card bg-secondary text-center text-sm leading-10">
              {m.avatar_url ? <img src={m.avatar_url} alt={m.full_name ?? ""} className="h-full w-full object-cover" /> : (m.full_name?.[0] ?? "?")}
            </div>
          ))}
        </div>
      </Card>

      {/* Flights */}
      <Card className="rounded-3xl border-0 p-5 shadow-soft">
        <h3 className="font-display text-xl">Flight board</h3>
        <ul className="mt-3 divide-y divide-border">
          {data.flights.length === 0 && <li className="py-3 text-sm text-muted-foreground">No flights yet.</li>}
          {data.flights.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{f.airline ?? "Flight"} {f.flight_number}</p>
                <p className="text-xs text-muted-foreground">{f.origin_iata ?? "—"} → {f.destination_iata ?? "DPS"}</p>
              </div>
              <p className="text-sm tabular-nums">{f.scheduled_at ? new Date(f.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Stays */}
      <Link to="/map" className="block">
        <Card className="rounded-3xl border-0 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Stay map</h3>
            <span className="text-xs text-primary">Open →</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{data.stays.length} villas pinned</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {data.stays.slice(0, 4).map((s) => (
              <div key={s.id} className="rounded-2xl bg-secondary p-3">
                <p className="line-clamp-1 text-sm font-medium">{s.name}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{s.address}</p>
              </div>
            ))}
          </div>
        </Card>
      </Link>

      <Link to="/itinerary" className="block">
        <Card className="rounded-3xl border-0 p-5 shadow-soft">
          <h3 className="font-display text-xl">Itinerary</h3>
          <p className="mt-1 text-sm text-muted-foreground">Day-by-day plan, surf, dinners.</p>
        </Card>
      </Link>

      {trip.whatsapp_invite_url && (
        <a href={trip.whatsapp_invite_url} target="_blank" rel="noreferrer" className="block rounded-2xl bg-[#25D366] py-4 text-center font-medium text-white">
          Open WhatsApp group
        </a>
      )}
    </main>
  );
}
