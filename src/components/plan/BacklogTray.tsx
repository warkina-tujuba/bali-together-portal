import type { CalActivity } from "@/components/dashboard/WeekCalendar";
import { Inbox, Clock, DollarSign, X } from "lucide-react";

export type BacklogItem = CalActivity & {
  image_url: string | null;
  cost_usd: number | null;
};

export function BacklogTray({
  items, onSchedule, onRemove, onOpen,
}: {
  items: BacklogItem[];
  onSchedule: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg flex items-center gap-2">
          <Inbox className="h-4 w-4" /> Backlog · {items.length}
        </h3>
        <p className="text-[11px] text-muted-foreground">Drag onto a day or tap to schedule</p>
      </div>
      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
        {items.map((it) => (
          <div
            key={it.id}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData("text/activity-id", it.id); }}
            className="group relative w-52 shrink-0 overflow-hidden rounded-2xl border bg-background"
          >
            {it.image_url && (
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={it.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(it.id); }}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 opacity-0 transition group-hover:opacity-100"
              aria-label="Remove from backlog"
            >
              <X className="h-3 w-3" />
            </button>
            <button onClick={() => onOpen(it.id)} className="block w-full p-3 text-left">
              <p className="line-clamp-2 text-sm font-medium leading-snug">{it.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {it.duration_min != null && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {Math.round((it.duration_min ?? 60) / 60)}h</span>}
                {it.cost_usd != null && <span className="flex items-center gap-0.5"><DollarSign className="h-2.5 w-2.5" /> ${it.cost_usd}</span>}
              </div>
            </button>
            <button
              onClick={() => onSchedule(it.id)}
              className="absolute inset-x-2 bottom-2 rounded-full bg-primary/90 py-1 text-[11px] font-medium text-primary-foreground opacity-0 transition group-hover:opacity-100"
            >
              Schedule
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
