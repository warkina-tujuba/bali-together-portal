import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type EventCardData = {
  id: string;
  title: string;
  description?: string | null;
  day_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  image_url?: string | null;
  category?: string | null;
};

export type RsvpStatus = "going" | "maybe" | "declined" | null;

export function EventCard({
  event,
  myStatus,
  counts,
  onRsvp,
  compact,
}: {
  event: EventCardData;
  myStatus: RsvpStatus;
  counts: { going: number; maybe: number; declined: number };
  onRsvp?: (status: RsvpStatus) => void | Promise<void>;
  compact?: boolean;
}) {
  const dateStr = new Date(event.day_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeStr = event.start_time ? event.start_time.slice(0, 5) : null;

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-soft">
      {event.image_url && !compact && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
          <img src={event.image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {event.image_url && compact && (
            <img src={event.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{dateStr}{timeStr ? ` • ${timeStr}` : ""}</p>
            <h3 className="font-display text-lg leading-tight">{event.title}</h3>
            {event.location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{event.location}</span>
              </p>
            )}
            {event.description && !compact && (
              <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
            )}
          </div>
        </div>

        {onRsvp && (
          <>
            <div className="mt-3 flex gap-1.5">
              <RsvpButton active={myStatus === "going"} onClick={() => onRsvp("going")} variant="going">
                <Check className="h-3.5 w-3.5" /> Going{counts.going > 0 ? ` · ${counts.going}` : ""}
              </RsvpButton>
              <RsvpButton active={myStatus === "maybe"} onClick={() => onRsvp("maybe")} variant="maybe">
                <HelpCircle className="h-3.5 w-3.5" /> Maybe{counts.maybe > 0 ? ` · ${counts.maybe}` : ""}
              </RsvpButton>
              <RsvpButton active={myStatus === "declined"} onClick={() => onRsvp("declined")} variant="declined">
                <X className="h-3.5 w-3.5" /> Can't
              </RsvpButton>
            </div>
          </>
        )}
        {!onRsvp && (counts.going + counts.maybe) > 0 && (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {counts.going} going{counts.maybe > 0 ? ` · ${counts.maybe} maybe` : ""}
          </p>
        )}
      </div>
    </Card>
  );
}

function RsvpButton({ active, variant, onClick, children }: {
  active: boolean;
  variant: "going" | "maybe" | "declined";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const colors = {
    going: active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary",
    maybe: active ? "bg-amber-500 text-white border-amber-500" : "border-border hover:bg-secondary",
    declined: active ? "bg-muted text-muted-foreground border-border" : "border-border hover:bg-secondary",
  } as const;
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      className={cn("h-8 flex-1 gap-1 rounded-full border text-xs", colors[variant])}
    >
      {children}
    </Button>
  );
}
