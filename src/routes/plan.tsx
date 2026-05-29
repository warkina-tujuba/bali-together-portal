import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import {
  MapPin, CalendarIcon, Sparkles, Plane, Home as HomeIcon, Compass,
  Check, X, Plus, Trash2,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PlaceAutocomplete, type PlaceHit } from "@/components/trip/PlaceAutocomplete";
import { WizardShell, type WizardStep } from "@/components/plan/WizardShell";
import { usePlanDraft, type PlanRadarPlace, type PlanStay } from "@/lib/plan-draft";
import { lookupFlight } from "@/lib/trip.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/plan")({
  validateSearch: searchSchema,
  component: PlanWizard,
  head: () => ({
    meta: [
      { title: "Plan your trip — Travel Link" },
      { name: "description", content: "Start planning your trip — destination, dates, stays, and your crew, all in one place." },
    ],
  }),
});

const STEPS: WizardStep[] = [
  { key: "dest", label: "Destination" },
  { key: "dates", label: "Dates" },
  { key: "places", label: "Places" },
  { key: "stays", label: "Stays" },
  { key: "arrival", label: "Arrival" },
  { key: "vibe", label: "Vibe" },
];

function PlanWizard() {
  const { invite } = useSearch({ from: "/plan" });
  const navigate = useNavigate();
  const draft = usePlanDraft();
  const [step, setStep] = useState(0);

  // Invite path: send straight to /plan/auth which after sign-in lands on /dashboard.
  useEffect(() => {
    if (invite) {
      navigate({ to: "/plan/auth", search: { invite, next: "/dashboard" } });
    }
  }, [invite, navigate]);

  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));

  const finishToAuth = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      navigate({ to: "/plan/profile" });
    } else {
      navigate({ to: "/plan/auth", search: { next: "/plan/profile" } });
    }
  };

  // Per-step gates
  const next = () => {
    if (step === STEPS.length - 1) return finishToAuth();
    go(step + 1);
  };
  const back = step > 0 ? () => go(step - 1) : undefined;
  const skip = step >= 2 ? () => (step === STEPS.length - 1 ? finishToAuth() : go(step + 1)) : undefined;

  const stepProps = (() => {
    switch (step) {
      case 0:
        return {
          eyebrow: "Step 1 · Destination",
          title: "Where are you going?",
          subtitle: "A city, country, region — pick anything.",
          icon: <MapPin className="h-4 w-4" />,
          nextDisabled: !draft.destination,
        };
      case 1:
        return {
          eyebrow: "Step 2 · Dates",
          title: "When are you going?",
          subtitle: "Pick exact dates, or just say how long.",
          icon: <CalendarIcon className="h-4 w-4" />,
          nextDisabled: !((draft.start_date && draft.end_date) || draft.duration_days),
        };
      case 2:
        return {
          eyebrow: "Step 3 · On your radar",
          title: "Any places you want to visit?",
          subtitle: "Towns, neighbourhoods, beaches — add as many as you like.",
          icon: <Compass className="h-4 w-4" />,
          skippable: true,
          nextDisabled: false,
        };
      case 3:
        return {
          eyebrow: "Step 4 · Stays",
          title: "Where are you staying?",
          subtitle: "Add booked stays — we'll pin them on the map for your crew.",
          icon: <HomeIcon className="h-4 w-4" />,
          skippable: true,
          nextDisabled: false,
        };
      case 4:
        return {
          eyebrow: "Step 5 · Arrival",
          title: "How are you arriving?",
          subtitle: "Optional — share a flight so your crew knows when you land.",
          icon: <Plane className="h-4 w-4" />,
          skippable: true,
          nextDisabled: false,
        };
      case 5:
        return {
          eyebrow: "Step 6 · Vibe",
          title: "What's the vibe?",
          subtitle: "Help us tailor your recommendations. Totally optional.",
          icon: <Sparkles className="h-4 w-4" />,
          skippable: true,
          nextDisabled: false,
        };
      default:
        return { eyebrow: "", title: "", nextDisabled: false };
    }
  })();

  return (
    <WizardShell
      steps={STEPS}
      currentIndex={step}
      onBack={back}
      onNext={next}
      onSkip={skip}
      nextLabel={step === STEPS.length - 1 ? "Save your trip" : "Next"}
      {...stepProps}
    >
      {step === 0 && <DestinationStep />}
      {step === 1 && <DatesStep />}
      {step === 2 && <RadarStep />}
      {step === 3 && <StaysStep />}
      {step === 4 && <ArrivalStep />}
      {step === 5 && <VibeStep />}
    </WizardShell>
  );
}

/* ---------- Steps ---------- */

function DestinationStep() {
  const draft = usePlanDraft();
  const [picked, setPicked] = useState<PlaceHit | null>(
    draft.destination ? {
      name: draft.destination.name,
      address: draft.destination.address ?? "",
      lat: draft.destination.lat ?? 0,
      lng: draft.destination.lng ?? 0,
      place_id: draft.destination.place_id ?? undefined,
    } : null,
  );
  useEffect(() => {
    if (picked) {
      draft.set("destination", {
        name: picked.name,
        address: picked.address,
        lat: picked.lat,
        lng: picked.lng,
        place_id: picked.place_id,
      });
    } else {
      draft.set("destination", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  return (
    <div className="space-y-3">
      <PlaceAutocomplete value={picked} onPick={setPicked} autoFocus placeholder="City, country, region…" />
      {picked && (
        <Card className="flex items-center gap-3 rounded-2xl border-0 bg-primary/5 p-4 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight">{picked.name}</p>
            {picked.address && picked.address !== picked.name && (
              <p className="truncate text-xs text-muted-foreground">{picked.address}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function DatesStep() {
  const draft = usePlanDraft();
  const [mode, setMode] = useState<"dates" | "duration">(
    draft.duration_days && !draft.start_date ? "duration" : "dates",
  );

  const range: DateRange | undefined = draft.start_date
    ? { from: new Date(draft.start_date), to: draft.end_date ? new Date(draft.end_date) : undefined }
    : undefined;

  const nights = useMemo(
    () => (draft.start_date && draft.end_date
      ? Math.max(0, differenceInCalendarDays(new Date(draft.end_date), new Date(draft.start_date)))
      : 0),
    [draft.start_date, draft.end_date],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
        {(["dates", "duration"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium capitalize transition",
              mode === m ? "bg-background shadow-soft" : "text-muted-foreground",
            )}
          >
            {m === "dates" ? "Pick dates" : "Just duration"}
          </button>
        ))}
      </div>

      {mode === "dates" ? (
        <>
          <div className="overflow-x-auto rounded-2xl border bg-card p-2">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={range}
              onSelect={(r) => {
                draft.patch({
                  start_date: r?.from ? format(r.from, "yyyy-MM-dd") : null,
                  end_date: r?.to ? format(r.to, "yyyy-MM-dd") : null,
                  duration_days: r?.from && r?.to ? differenceInCalendarDays(r.to, r.from) + 1 : null,
                  dates_flexible: false,
                });
              }}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className="pointer-events-auto mx-auto"
              classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "space-y-4",
              }}
            />
          </div>
          {draft.start_date && draft.end_date && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm">
                <strong>{format(new Date(draft.start_date), "MMM d")}</strong>
                <span className="text-muted-foreground">→</span>
                <strong>{format(new Date(draft.end_date), "MMM d, yyyy")}</strong>
                <span className="text-muted-foreground">· {nights} {nights === 1 ? "night" : "nights"}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 7, 10, 14, 21].map((n) => (
              <button
                key={n}
                onClick={() => draft.patch({
                  duration_days: n,
                  start_date: null,
                  end_date: null,
                  dates_flexible: true,
                })}
                className={cn(
                  "rounded-2xl border-2 p-4 text-center transition",
                  draft.duration_days === n
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="font-display text-3xl">{n}</div>
                <div className="text-xs text-muted-foreground">days</div>
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={1}
            max={60}
            placeholder="Custom (1–60 days)"
            value={draft.duration_days && ![3, 5, 7, 10, 14, 21].includes(draft.duration_days) ? draft.duration_days : ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              draft.patch({
                duration_days: Number.isFinite(v) && v > 0 ? Math.min(60, v) : null,
                start_date: null,
                end_date: null,
                dates_flexible: true,
              });
            }}
            className="h-12 rounded-xl"
          />
        </>
      )}
    </div>
  );
}

function RadarStep() {
  const draft = usePlanDraft();
  const [picked, setPicked] = useState<PlaceHit | null>(null);

  const add = () => {
    if (!picked) return;
    const next: PlanRadarPlace = {
      name: picked.name,
      address: picked.address,
      place_id: picked.place_id,
      lat: picked.lat,
      lng: picked.lng,
    };
    draft.set("places", [...draft.places, next]);
    setPicked(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <PlaceAutocomplete value={picked} onPick={setPicked} placeholder="Add a place, town, neighbourhood…" />
        </div>
        <Button onClick={add} disabled={!picked} className="h-14 rounded-2xl px-5">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {draft.places.length === 0 && (
        <p className="rounded-xl bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
          Nothing on the radar yet. Add as many spots as you want — they'll seed your day-by-day plan.
        </p>
      )}

      <div className="space-y-2">
        {draft.places.map((p, i) => (
          <Card key={`${p.name}-${i}`} className="flex items-start gap-3 rounded-2xl border-0 bg-secondary/40 p-3 shadow-soft">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              {p.address && p.address !== p.name && (
                <p className="truncate text-xs text-muted-foreground">{p.address}</p>
              )}
            </div>
            <button
              onClick={() => draft.set("places", draft.places.filter((_, j) => j !== i))}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-background"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StaysStep() {
  const draft = usePlanDraft();
  const [picked, setPicked] = useState<PlaceHit | null>(null);

  const add = () => {
    if (!picked) return;
    const next: PlanStay = {
      name: picked.name,
      address: picked.address,
      place_id: picked.place_id,
      lat: picked.lat,
      lng: picked.lng,
    };
    draft.set("stays", [...draft.stays, next]);
    setPicked(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <PlaceAutocomplete value={picked} onPick={setPicked} placeholder="Hotel, villa, Airbnb address…" />
        </div>
        <Button onClick={add} disabled={!picked} className="h-14 rounded-2xl px-5">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {draft.stays.length === 0 && (
        <p className="rounded-xl bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
          No stays yet. Skip and add later from your dashboard if you haven't booked.
        </p>
      )}

      <div className="space-y-2">
        {draft.stays.map((s, i) => (
          <Card key={`${s.name}-${i}`} className="flex items-start gap-3 rounded-2xl border-0 bg-secondary/40 p-3 shadow-soft">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <HomeIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              {s.address && <p className="truncate text-xs text-muted-foreground">{s.address}</p>}
            </div>
            <button
              onClick={() => draft.set("stays", draft.stays.filter((_, j) => j !== i))}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-background"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ArrivalStep() {
  const draft = usePlanDraft();
  const lookupFn = useServerFn(lookupFlight);
  const [flightNum, setFlightNum] = useState(draft.arrival?.flight_number ?? "");
  const [date, setDate] = useState(draft.arrival?.scheduled_at?.slice(0, 10) ?? draft.start_date ?? "");
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    if (!flightNum) return;
    setBusy(true);
    try {
      const r = await lookupFn({ data: { flight_number: flightNum, date: date || null } });
      if (!r.found) {
        toast.error("Flight not found — save manually below");
        draft.set("arrival", { ...draft.arrival, flight_number: flightNum, scheduled_at: date ? `${date}T00:00:00Z` : null });
        return;
      }
      draft.set("arrival", {
        flight_number: r.flight_number,
        airline: r.airline,
        airline_iata: r.airline_iata,
        scheduled_at: r.scheduled_at,
        origin_iata: r.origin_iata,
        origin_city: r.origin_city,
        destination_iata: r.destination_iata,
        destination_city: r.destination_city,
      });
      toast.success(`${r.airline ?? "Flight"} ${r.flight_number} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    draft.set("arrival", null);
    setFlightNum("");
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-0 bg-card p-5 shadow-card">
        <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
          <Input
            placeholder="Flight number (e.g. QF63)"
            value={flightNum}
            onChange={(e) => setFlightNum(e.target.value.toUpperCase())}
            className="h-12 rounded-xl"
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={lookup} disabled={!flightNum || busy} className="flex-1 rounded-xl">
            {busy ? "Looking up…" : "Find flight"}
          </Button>
          {draft.arrival && (
            <Button variant="ghost" onClick={clear} className="rounded-xl">Clear</Button>
          )}
        </div>
        {draft.arrival && (
          <div className="mt-4 rounded-2xl bg-secondary/50 p-3 text-sm">
            <div className="font-medium">{draft.arrival.airline} {draft.arrival.flight_number}</div>
            <div className="text-xs text-muted-foreground">
              {draft.arrival.origin_iata ?? "—"} → {draft.arrival.destination_iata ?? "—"}
              {draft.arrival.scheduled_at && ` · ${format(new Date(draft.arrival.scheduled_at), "MMM d, p")}`}
            </div>
          </div>
        )}
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Don't have flights yet? Skip — add them anytime from your dashboard.
      </p>
    </div>
  );
}

function VibeStep() {
  const draft = usePlanDraft();
  const v = draft.vibe ?? { adventure: 50, culture: 50, budget: 50, foodie: 50, pace: 50 };
  const update = (patch: Partial<typeof v>) => draft.set("vibe", { ...v, ...patch });

  const rows = [
    { key: "adventure", left: "Relax", right: "Adventure" },
    { key: "culture", left: "Party", right: "Culture" },
    { key: "budget", left: "Budget", right: "Luxury" },
    { key: "foodie", left: "Light bites", right: "Foodie" },
    { key: "pace", left: "Spontaneous", right: "Planned" },
  ] as const;

  return (
    <div className="space-y-6">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{r.left}</span>
            <span>{r.right}</span>
          </div>
          <Slider
            value={[v[r.key]]}
            onValueChange={([val]) => update({ [r.key]: val } as Partial<typeof v>)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      ))}
      <p className="text-center text-xs text-muted-foreground">
        Optional — helps us tailor recommendations. You can change this anytime.
      </p>
    </div>
  );
}

// Helper to avoid unused warnings in some builds
export const _addDays = addDays;
