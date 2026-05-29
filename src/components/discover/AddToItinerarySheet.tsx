import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Inbox, Users, Sun, Sunset, Moon, Check, AlertTriangle, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeedCard } from "@/lib/discover.functions";

type ExistingActivity = { id: string; day_date: string; start_time: string | null; end_time: string | null; title: string };

export type AddToItineraryPayload = {
  day_date: string | null;
  start_time: string | null;
  scope: "personal" | "shared";
  booking_status: "none" | "needed" | "booked";
  booking_url?: string;
  booking_ref?: string;
  notes?: string;
};

export function AddToItinerarySheet({
  seed, open, onOpenChange, days, existing, onSubmit,
}: {
  seed: SeedCard | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  days: { date: string; label: string }[];
  existing: ExistingActivity[];
  onSubmit: (p: AddToItineraryPayload) => Promise<void>;
}) {
  const [day, setDay] = useState<string | "park">("park");
  const [start, setStart] = useState<string>("09:00");
  const [scope, setScope] = useState<"personal" | "shared">("personal");
  const [bookingStatus, setBookingStatus] = useState<"none" | "needed" | "booked">("none");
  const [bookingUrl, setBookingUrl] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const duration = seed?.est_duration_min ?? 90;
  const endTime = useMemo(() => {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + duration;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [start, duration]);

  const conflict = useMemo(() => {
    if (day === "park") return null;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const sMin = sh * 60 + sm;
    const eMin = eh * 60 + em;
    return existing.find((a) => {
      if (a.day_date !== day || !a.start_time || !a.end_time) return false;
      const [ash, asm] = a.start_time.split(":").map(Number);
      const [aeh, aem] = a.end_time.split(":").map(Number);
      const aS = ash * 60 + asm;
      const aE = aeh * 60 + aem;
      return sMin < aE && eMin > aS;
    });
  }, [day, start, endTime, existing]);

  if (!seed) return null;

  async function submit() {
    setSaving(true);
    try {
      await onSubmit({
        day_date: day === "park" ? null : day,
        start_time: day === "park" ? null : start,
        scope,
        booking_status: bookingStatus,
        booking_url: bookingUrl || undefined,
        booking_ref: bookingRef || undefined,
        notes: notes || undefined,
      });
      onOpenChange(false);
    } finally { setSaving(false); }
  }

  const slots = [
    { id: "08:00", label: "8:00 AM", icon: <Sun className="h-3 w-3" /> },
    { id: "10:00", label: "10:00 AM", icon: <Sun className="h-3 w-3" /> },
    { id: "14:00", label: "2:00 PM", icon: <Sun className="h-3 w-3" /> },
    { id: "17:00", label: "5:00 PM", icon: <Sunset className="h-3 w-3" /> },
    { id: "19:30", label: "7:30 PM", icon: <Moon className="h-3 w-3" /> },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-md sm:rounded-l-3xl sm:rounded-t-none">
        <div className="sticky top-0 z-10 border-b bg-background px-5 py-4">
          <SheetHeader><SheetTitle className="font-display text-xl">Add to itinerary</SheetTitle></SheetHeader>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* summary */}
          <div className="flex gap-3 rounded-2xl border bg-card p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {seed.image_url && <img src={seed.image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-medium">{seed.title}</p>
              <p className="text-[11px] text-muted-foreground">{duration < 60 ? `${duration}m` : `${Math.round(duration / 60)}h`} · {seed.est_cost_usd != null ? `~$${seed.est_cost_usd}` : "Price varies"}</p>
            </div>
          </div>

          {/* day */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Day</p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Chip active={day === "park"} onClick={() => setDay("park")}><Inbox className="h-3 w-3" /> Park it</Chip>
              {days.map((d) => (
                <Chip key={d.date} active={day === d.date} onClick={() => setDay(d.date)}>{d.label}</Chip>
              ))}
            </div>
          </div>

          {day !== "park" && (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested time</p>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {slots.map((s) => (
                    <Chip key={s.id} active={start === s.id} onClick={() => setStart(s.id)}>{s.icon} {s.label}</Chip>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted-foreground">Start
                    <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 h-10" />
                  </label>
                  <label className="text-[11px] text-muted-foreground">Ends
                    <Input type="time" value={endTime} readOnly className="mt-1 h-10 bg-secondary/40" />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5 rounded-2xl bg-secondary/40 p-3 text-[11px] text-muted-foreground">
                {conflict ? (
                  <p className="flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-3 w-3" /> Overlaps with "{conflict.title}"</p>
                ) : (
                  <p className="flex items-center gap-1.5 text-foreground"><Check className="h-3 w-3 text-green-600" /> No conflicts with your current plan</p>
                )}
                {seed.distance_km != null && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {seed.distance_km} km from your hotel</p>}
                {seed.est_duration_min != null && <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Takes about {seed.est_duration_min < 60 ? `${seed.est_duration_min}m` : `${Math.round(seed.est_duration_min / 60)}h`}</p>}
              </div>
            </>
          )}

          {/* visibility */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibility</p>
            <div className="flex gap-1.5">
              <button onClick={() => setScope("personal")} className={cn("flex-1 rounded-full border px-3 py-2 text-xs", scope === "personal" ? "border-foreground bg-foreground text-background" : "border-border bg-card")}>Just me</button>
              <button onClick={() => setScope("shared")} className={cn("flex flex-1 items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs", scope === "shared" ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card")}><Users className="h-3 w-3" /> Share with crew</button>
            </div>
          </div>

          {/* booking */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booking</p>
            <div className="flex flex-wrap gap-1.5">
              {(["none", "needed", "booked"] as const).map((b) => (
                <Chip key={b} active={bookingStatus === b} onClick={() => setBookingStatus(b)}>
                  {b === "none" ? "Not needed" : b === "needed" ? "Need to book" : "Booked"}
                </Chip>
              ))}
            </div>
            {bookingStatus !== "none" && (
              <div className="mt-3 space-y-2">
                <Input placeholder="Booking link (optional)" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} className="h-10" />
                {bookingStatus === "booked" && (
                  <Input placeholder="Confirmation number" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} className="h-10" />
                )}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
            <Input placeholder="e.g. wear hiking shoes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-10" />
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <Button onClick={submit} disabled={saving} className="h-12 w-full rounded-2xl text-base">
            {saving ? "Adding…" : day === "park" ? "Park in backlog" : "Add to itinerary"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
