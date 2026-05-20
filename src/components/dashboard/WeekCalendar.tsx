import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

export type CalActivity = {
  id: string;
  day_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_min: number | null;
  title: string;
  location: string | null;
  is_host_event: boolean;
  lat: number | null;
  lng: number | null;
};

export type TravelLeg = {
  from_id: string;
  to_id: string;
  duration_min: number;
  distance_km: number;
};

const START_HOUR = 7;
const END_HOUR = 23;
const HOURS = END_HOUR - START_HOUR; // 16
const ROW_PX = 56; // 1h = 56px
const PX_PER_MIN = ROW_PX / 60;

function timeToMin(t: string | null): number {
  if (!t) return 9 * 60;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function WeekCalendar({
  days,
  activities,
  legsByDay,
  onSlotClick,
  onActivityClick,
  onActivityDrop,
  onOptimise,
  selectedDay,
  onSelectDay,
}: {
  days: string[];
  activities: CalActivity[];
  legsByDay: Map<string, TravelLeg[]>;
  onSlotClick: (day: string, hourMinutes: number) => void;
  onActivityClick: (id: string) => void;
  onActivityDrop: (id: string, day: string, hourMinutes: number) => void;
  onOptimise: (day: string) => void;
  selectedDay: string | null;
  onSelectDay: (d: string) => void;
}) {
  const byDay = useMemo(() => {
    const m = new Map<string, CalActivity[]>();
    days.forEach((d) => m.set(d, []));
    activities.forEach((a) => { if (m.has(a.day_date)) m.get(a.day_date)!.push(a); });
    m.forEach((arr) => arr.sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time)));
    return m;
  }, [days, activities]);

  const visibleDays = days.slice(0, 7);
  const gridRef = useRef<HTMLDivElement | null>(null);

  function pixelToMin(y: number) {
    const minOffset = Math.round((y / PX_PER_MIN) / 15) * 15;
    return Math.max(0, Math.min(HOURS * 60, minOffset));
  }

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
      {/* Day header */}
      <div className="grid border-b" style={{ gridTemplateColumns: `48px repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
        <div />
        {visibleDays.map((d) => {
          const date = new Date(d);
          const isToday = new Date().toDateString() === date.toDateString();
          const isSelected = d === selectedDay;
          return (
            <button
              key={d}
              onClick={() => onSelectDay(d)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-secondary/60",
              )}
            >
              <span className="font-medium uppercase tracking-wider">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full font-display text-base", isToday && "bg-accent text-accent-foreground")}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Optimise button strip */}
      {selectedDay && (
        <div className="flex items-center justify-between border-b bg-secondary/30 px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">
            {(byDay.get(selectedDay) ?? []).length} planned · click a slot to add
          </span>
          <button
            onClick={() => onOptimise(selectedDay)}
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            ✨ Optimise this day
          </button>
        </div>
      )}

      {/* Hour grid */}
      <div ref={gridRef} className="relative overflow-auto" style={{ maxHeight: "70vh" }}>
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
          {/* Hour gutter */}
          <div className="border-r">
            {Array.from({ length: HOURS }).map((_, i) => (
              <div key={i} style={{ height: ROW_PX }} className="border-b pr-1 text-right text-[10px] text-muted-foreground">
                {String(START_HOUR + i).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {visibleDays.map((d) => {
            const list = byDay.get(d) ?? [];
            const legs = legsByDay.get(d) ?? [];
            const legByFrom = new Map(legs.map((l) => [l.from_id, l]));
            return (
              <div
                key={d}
                className="relative border-r last:border-r-0"
                style={{ height: HOURS * ROW_PX }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = pixelToMin(e.clientY - rect.top);
                  onSlotClick(d, START_HOUR * 60 + minutes);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/activity-id");
                  if (!id) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = pixelToMin(e.clientY - rect.top);
                  onActivityDrop(id, d, START_HOUR * 60 + minutes);
                }}
              >
                {/* Hour lines */}
                {Array.from({ length: HOURS }).map((_, i) => (
                  <div key={i} style={{ height: ROW_PX }} className="border-b border-border/50" />
                ))}

                {/* Activity tiles */}
                {list.map((a) => {
                  const start = timeToMin(a.start_time);
                  const dur = a.duration_min ?? 60;
                  const top = Math.max(0, (start - START_HOUR * 60) * PX_PER_MIN);
                  const height = Math.max(28, dur * PX_PER_MIN - 2);
                  if (start >= END_HOUR * 60 || start + dur <= START_HOUR * 60) return null;
                  const leg = legByFrom.get(a.id);
                  return (
                    <div key={a.id}>
                      <button
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/activity-id", a.id)}
                        onClick={(e) => { e.stopPropagation(); onActivityClick(a.id); }}
                        style={{ top, height }}
                        className={cn(
                          "absolute left-1 right-1 overflow-hidden rounded-lg border p-1.5 text-left text-[11px] shadow-sm transition hover:z-10 hover:shadow-md",
                          a.is_host_event ? "border-primary/70 bg-primary/15 text-primary-foreground" : "border-accent/40 bg-accent/15 hover:bg-accent/20",
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {a.is_host_event && <Crown className="h-2.5 w-2.5 shrink-0" />}
                          <span className="truncate font-medium text-foreground">{a.title}</span>
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {a.start_time?.slice(0, 5)}{a.end_time ? `–${a.end_time.slice(0, 5)}` : ""}
                        </div>
                      </button>
                      {leg && (
                        <div
                          style={{ top: top + height, height: Math.max(14, leg.duration_min * PX_PER_MIN) }}
                          className="pointer-events-none absolute left-2 right-2 flex items-center justify-center text-[9px] uppercase tracking-wider text-muted-foreground"
                        >
                          <span className="rounded-full bg-background/80 px-2 py-0.5 shadow-sm">
                            🚗 {leg.duration_min}m · {leg.distance_km}km
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
