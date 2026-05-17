import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ChevronRight, Calendar } from "lucide-react";
import type { EventCardData } from "@/components/trip/EventCard";

export function UpcomingEvents({ events, rsvps }: {
  events: EventCardData[];
  rsvps: Record<string, "going" | "maybe" | "declined">;
}) {
  if (events.length === 0) {
    return (
      <Card className="rounded-3xl border-0 p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg">No events yet</p>
            <p className="text-xs text-muted-foreground">The host hasn't locked in events.</p>
          </div>
          <Link to="/itinerary" className="text-xs text-primary">Plan →</Link>
        </div>
      </Card>
    );
  }
  return (
    <Card className="rounded-3xl border-0 p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Upcoming events</h2>
          <p className="text-xs text-muted-foreground">{events.length} on the agenda</p>
        </div>
        <Link to="/agenda" className="flex items-center gap-0.5 text-xs font-medium text-primary">
          See all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="space-y-2">
        {events.slice(0, 3).map((ev) => {
          const status = rsvps[ev.id];
          return (
            <li key={ev.id}>
              <Link to="/agenda" className="flex items-center gap-3 rounded-2xl bg-secondary p-2.5 transition hover:bg-secondary/70">
                {ev.image_url ? (
                  <img src={ev.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-lg">📍</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ev.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(ev.day_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ""}
                  </p>
                </div>
                {status && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    status === "going" ? "bg-primary/15 text-primary" :
                    status === "maybe" ? "bg-amber-500/15 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {status === "going" ? "Going" : status === "maybe" ? "Maybe" : "Skip"}
                  </span>
                )}
                {!status && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">RSVP</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
