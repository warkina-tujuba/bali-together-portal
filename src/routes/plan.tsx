import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { MapPin, CalendarIcon, Minus, Plus, Search, Info } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PlaceAutocomplete, type PlaceHit } from "@/components/trip/PlaceAutocomplete";
import { usePlanDraft } from "@/lib/plan-draft";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/plan")({
  validateSearch: searchSchema,
  component: PlanSearch,
  head: () => ({
    meta: [
      { title: "Trip search — Travel Link" },
      { name: "description", content: "Search your next trip — destination, dates, and travellers." },
    ],
  }),
});

type TripMode = "return" | "one-way";

function PlanSearch() {
  const { invite } = useSearch({ from: "/plan" });
  const navigate = useNavigate();
  const draft = usePlanDraft();

  useEffect(() => {
    if (invite) navigate({ to: "/plan/auth", search: { invite, next: "/dashboard" } });
  }, [invite, navigate]);

  const [mode, setMode] = useState<TripMode>("return");
  const [from, setFrom] = useState<PlaceHit | null>(null);
  const [to, setTo] = useState<PlaceHit | null>(
    draft.destination
      ? {
          name: draft.destination.name,
          address: draft.destination.address ?? "",
          lat: draft.destination.lat ?? 0,
          lng: draft.destination.lng ?? 0,
          place_id: draft.destination.place_id ?? undefined,
        }
      : null,
  );
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const range = useMemo<DateRange | undefined>(() => {
    if (!draft.start_date) return undefined;
    const from = parseISO(draft.start_date + "T00:00:00");
    const to = draft.end_date ? parseISO(draft.end_date + "T00:00:00") : undefined;
    return { from, to };
  }, [draft.start_date, draft.end_date]);

  const dateLabel = useMemo(() => {
    if (!draft.start_date) return "When?";
    const start = format(new Date(draft.start_date), "MMM d");
    if (mode === "one-way" || !draft.end_date) return start;
    return `${start} → ${format(new Date(draft.end_date), "MMM d")}`;
  }, [draft.start_date, draft.end_date, mode]);

  const canSearch = !!to && !!draft.start_date && (mode === "one-way" || !!draft.end_date);

  const onSearch = async () => {
    if (!canSearch || !to) return;
    draft.patch({
      destination: {
        name: to.name,
        address: to.address,
        lat: to.lat,
        lng: to.lng,
        place_id: to.place_id,
      },
    });
    const { data } = await supabase.auth.getUser();
    if (data.user) navigate({ to: "/plan/profile" });
    else navigate({ to: "/plan/auth", search: { next: "/plan/profile" } });
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-10">
      {/* Orange header */}
      <div className="bg-primary px-5 pb-10 pt-12 text-primary-foreground">
        <h1 className="text-center font-display text-2xl font-semibold">Trip search</h1>
      </div>

      <div className="-mt-6 px-4">
        <div className="mx-auto max-w-md space-y-5 rounded-3xl bg-card p-5 shadow-card">
          {/* Return / One way toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary/60 p-1">
            {(["return", "one-way"] as TripMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  if (m === "one-way") draft.patch({ end_date: null, duration_days: null });
                }}
                className={cn(
                  "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                  mode === m ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                {m === "return" ? "Return" : "One way"}
              </button>
            ))}
          </div>

          {/* From */}
          <FieldCard label="From" placeholder="Where from?" value={from?.name ?? ""}>
            <PlaceAutocomplete value={from} onPick={setFrom} placeholder="City or airport" autoFocus />
          </FieldCard>

          {/* To */}
          <FieldCard label="To" placeholder="Where to?" value={to?.name ?? ""}>
            <PlaceAutocomplete value={to} onPick={setTo} placeholder="City, region or country" autoFocus />
          </FieldCard>

          {/* Date */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left transition hover:bg-secondary/40"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground">Date</div>
                  <div className={cn("truncate text-base", !draft.start_date && "text-muted-foreground")}>
                    {dateLabel}
                  </div>
                </div>
                <CalendarIcon className="h-5 w-5 shrink-0 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
              <SheetHeader className="text-left">
                <div className="text-sm text-muted-foreground">
                  {from?.name ?? "Anywhere"} to {to?.name ?? "Anywhere"}
                </div>
                <SheetTitle className="font-display text-2xl md:text-3xl">
                  {mode === "return" ? "When are you travelling?" : "When are you flying?"}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex justify-center">
                {mode === "return" ? (
                  <Calendar
                    mode="range"
                    numberOfMonths={typeof window !== "undefined" && window.innerWidth >= 768 ? 2 : 1}
                    selected={range}
                    onSelect={(r) => {
                      draft.patch({
                        start_date: r?.from ? format(r.from, "yyyy-MM-dd") : null,
                        end_date: r?.to ? format(r.to, "yyyy-MM-dd") : null,
                        duration_days:
                          r?.from && r?.to ? differenceInCalendarDays(r.to, r.from) + 1 : null,
                        dates_flexible: false,
                      });
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto [--cell-size:2.75rem] md:[--cell-size:3rem]"
                  />
                ) : (
                  <Calendar
                    mode="single"
                    numberOfMonths={typeof window !== "undefined" && window.innerWidth >= 768 ? 2 : 1}
                    selected={range?.from}
                    onSelect={(d) => {
                      draft.patch({
                        start_date: d ? format(d, "yyyy-MM-dd") : null,
                        end_date: null,
                        duration_days: null,
                        dates_flexible: false,
                      });
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto [--cell-size:2.75rem] md:[--cell-size:3rem]"
                  />
                )}
              </div>

              {draft.start_date && (
                <div className="sticky bottom-0 mt-6 -mx-6 border-t bg-card/95 px-6 py-4 backdrop-blur">
                  <div className="mx-auto flex max-w-md items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Selected</div>
                      <div className="truncate text-sm font-semibold">{dateLabel}</div>
                    </div>
                    <Button
                      onClick={() =>
                        draft.patch({ start_date: null, end_date: null, duration_days: null })
                      }
                      variant="ghost"
                      className="text-primary"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Travellers */}
          <div className="space-y-1 pt-2">
            <CounterRow
              label="Adults"
              value={adults}
              onChange={(v) => setAdults(Math.max(1, v))}
              min={1}
            />
            <CounterRow
              label="Children"
              meta="Ages 2–11"
              note="Children travelling alone"
              value={children}
              onChange={(v) => setChildren(Math.max(0, v))}
            />
            <CounterRow
              label="Infants"
              meta="Under 2 years"
              note="Travelling with infants"
              value={infants}
              onChange={(v) => setInfants(Math.max(0, v))}
            />
          </div>

          {/* Search */}
          <Button
            onClick={onSearch}
            disabled={!canSearch}
            className="h-14 w-full rounded-full text-base font-semibold shadow-card disabled:opacity-50"
          >
            <Search className="mr-2 h-5 w-5" />
            Search
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small bits ---------- */

function FieldCard({
  label,
  value,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  placeholder: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left transition hover:bg-secondary/40"
        >
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">{label}</div>
            <div className={cn("truncate text-base", !value && "text-muted-foreground")}>
              {value || placeholder}
            </div>
          </div>
          <MapPin className="h-5 w-5 shrink-0 text-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <div className="mt-4" onClick={(e) => {
          // close after a selection bubbles up (PlaceAutocomplete sets value)
          const tgt = e.target as HTMLElement;
          if (tgt.closest("[data-place-pick]")) setOpen(false);
        }}>
          {children}
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CounterRow({
  label,
  meta,
  note,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  meta?: string;
  note?: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold">{label}</span>
          {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
        </div>
        {note && (
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-ocean" />
            {note}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-lg font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
