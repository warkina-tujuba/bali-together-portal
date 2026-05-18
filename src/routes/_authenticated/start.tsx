import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { acceptInvite } from "@/lib/trip.functions";
import { saveTripPreferences } from "@/lib/recommend.functions";
import { format, differenceInCalendarDays } from "date-fns";
import { CalendarIcon, ArrowLeft, ArrowRight, MapPin, Plane, Home, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createTrip, geocode, updateProfile, saveAccommodation, parseStayText,
} from "@/lib/trip.functions";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OccasionPicker } from "@/components/trip/OccasionPicker";
import { FlightSmartForm } from "@/components/trip/FlightSmartForm";
import { StayPasteForm } from "@/components/trip/StayPasteForm";
import { StayAddressForm } from "@/components/trip/StayAddressForm";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/_authenticated/start")({
  validateSearch: searchSchema,
  component: StartWizard,
});

type GeoHit = { name: string; lat: number; lng: number };

function StartWizard() {
  const { invite } = useSearch({ from: "/_authenticated/start" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const geoFn = useServerFn(geocode);
  const createTripFn = useServerFn(createTrip);
  const updateFn = useServerFn(updateProfile);
  const stayFn = useServerFn(saveAccommodation);
  const parseStay = useServerFn(parseStayText);
  const acceptFn = useServerFn(acceptInvite);
  const savePrefsFn = useServerFn(saveTripPreferences);

  // If user arrived with an invite, accept it and skip the wizard
  useEffect(() => {
    if (!invite) return;
    (async () => {
      try {
        await acceptFn({ data: { token: invite } });
        await updateFn({ data: { onboarding_complete: true } });
      } catch { /* ignore */ }
      navigate({ to: "/dashboard" });
    })();
  }, [invite, acceptFn, updateFn, navigate]);

  const TOTAL = 5;
  const [step, setStep] = useState(0);

  // Step 1 - debounced autocomplete
  const [destQuery, setDestQuery] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<GeoHit | null>(null);
  const [showHits, setShowHits] = useState(false);

  // Debounced search
  useEffect(() => {
    if (picked && destQuery === picked.name) return;
    if (destQuery.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await geoFn({ data: { q: destQuery } });
        setHits((r.results ?? []).slice(0, 6).map((h: { name: string; lat: number; lng: number }) => ({
          name: h.name, lat: h.lat, lng: h.lng,
        })));
        setShowHits(true);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [destQuery, geoFn, picked]);

  // Step 2 - date range
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const range: DateRange | undefined = start ? { from: start, to: end } : undefined;

  const [creating, setCreating] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);

  const nights = useMemo(
    () => (start && end ? Math.max(0, differenceInCalendarDays(end, start)) : 0),
    [start, end],
  );

  function pick(h: GeoHit) {
    setPicked(h);
    setDestQuery(h.name);
    setHits([]);
    setShowHits(false);
  }

  async function handleCreate() {
    if (!picked || !start || !end) return;
    setCreating(true);
    try {
      const city = picked.name.split(",")[0];
      const r = await createTripFn({
        data: {
          name: `Trip to ${city}`,
          occasion: "just-because",
          destination: picked.name,
          lat: picked.lat,
          lng: picked.lng,
          start_date: format(start, "yyyy-MM-dd"),
          end_date: format(end, "yyyy-MM-dd"),
          description: null,
        },
      });
      setTripId(r.trip.id);
      await qc.invalidateQueries();
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create trip");
    } finally {
      setCreating(false);
    }
  }

  async function finish() {
    try {
      await updateFn({ data: { onboarding_complete: true, onboarding_step: TOTAL } });
    } catch { /* ignore */ }
    navigate({ to: "/dashboard" });
  }

  const canNext0 = !!picked;
  const canNext1 = !!start && !!end && (start <= end);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col px-5 py-6">
      {/* Progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/60" : "w-4 bg-border",
            )}
          />
        ))}
      </div>

      <Card className="flex-1 rounded-3xl border-0 p-7 shadow-card animate-in fade-in duration-300" key={step}>
        {step === 0 && (
          <Step
            icon={<MapPin className="h-5 w-5" />}
            eyebrow="Step 1 of 4"
            title="Where are you looking to go?"
            subtitle="Pick a city, country, or neighbourhood."
          >
            <div className="mt-5 space-y-3">
              <div className="relative">
                <Input
                  value={destQuery}
                  onChange={(e) => { setDestQuery(e.target.value); setPicked(null); setShowHits(true); }}
                  onFocus={() => setShowHits(true)}
                  placeholder="Start typing… e.g. Canggu, Bali"
                  className="h-14 rounded-xl pr-12 text-base"
                  autoFocus
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</div>
                )}
              </div>
              {showHits && hits.length > 0 && !picked && (
                <div className="overflow-hidden rounded-xl border">
                  {hits.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => pick(h)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-secondary"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{h.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {picked && (
                <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm">
                  <Check className="h-4 w-4 text-primary" /> Heading to <strong>{picked.name}</strong>
                </div>
              )}
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step
            icon={<CalendarIcon className="h-5 w-5" />}
            eyebrow="Step 2 of 4"
            title="When are you going?"
            subtitle={picked ? `Select your dates in ${picked.name.split(",")[0]}.` : "Pick start and end."}
          >
            <div className="mt-5 flex justify-center rounded-2xl border bg-secondary/30 p-2">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={range}
                onSelect={(r) => { setStart(r?.from); setEnd(r?.to); }}
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                initialFocus
                className={cn("pointer-events-auto")}
              />
            </div>
            {start && end && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <strong className="text-foreground">{format(start, "MMM d")}</strong> → <strong className="text-foreground">{format(end, "MMM d, yyyy")}</strong> · {nights} {nights === 1 ? "night" : "nights"}
              </p>
            )}
          </Step>
        )}

        {step === 2 && (
          <Step
            icon={<Plane className="h-5 w-5" />}
            eyebrow="Step 3 of 4"
            title="Have you booked flights?"
            subtitle="So your crew can see when you land."
          >
            <FlightStep
              tripStart={start ? format(start, "yyyy-MM-dd") : null}
              onDone={() => setStep(3)}
            />
          </Step>
        )}

        {step === 3 && (
          <Step
            icon={<Home className="h-5 w-5" />}
            eyebrow="Step 4 of 4"
            title="Have you booked accommodation?"
            subtitle="We'll drop a 🏠 pin on the group map."
          >
            <StayStep
              destination={picked?.name ?? null}
              geoFnProp={geoFn}
              parseStayProp={parseStay}
              stayFnProp={stayFn}
              onDone={finish}
            />
          </Step>
        )}
      </Card>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-xl"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        {step === 1 ? (
          <Button onClick={handleCreate} disabled={creating || !picked || !start || !end} className="h-11 rounded-xl px-6">
            {creating ? "Creating…" : "Continue"} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : step === 0 ? (
          <Button
            onClick={() => setStep(1)}
            disabled={!canNext0}
            className="h-11 rounded-xl px-6"
          >
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" onClick={step === 3 ? finish : () => setStep(step + 1)} className="rounded-xl">
            Skip for now <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({
  icon, eyebrow, title, subtitle, children,
}: { icon: React.ReactNode; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
        {eyebrow}
      </div>
      <h1 className="mt-3 font-display text-3xl sm:text-4xl leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function DateField({
  label, value, onChange, minDate,
}: { label: string; value?: Date; onChange: (d?: Date) => void; minDate?: Date }) {
  return (
    <Field label={label}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-12 w-full justify-start rounded-xl text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={(d) => (minDate ? d < minDate : false)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function FlightStep({ tripStart, onDone }: { tripStart: string | null; onDone: () => void }) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  if (answer === null) {
    return (
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ChoiceCard label="Yes, I've booked" hint="Add your flight" onClick={() => setAnswer("yes")} />
        <ChoiceCard label="Not yet" hint="Skip for now" onClick={onDone} />
      </div>
    );
  }
  return (
    <div className="mt-5">
      <FlightSmartForm defaultDate={tripStart} onSaved={onDone} ctaLabel="Save & continue" />
      <button onClick={() => setAnswer(null)} className="mt-3 text-xs text-muted-foreground">← Back to options</button>
    </div>
  );
}

function StayStep({
  destination, geoFnProp, parseStayProp, stayFnProp, onDone,
}: {
  destination: string | null;
  geoFnProp: ReturnType<typeof useServerFn<typeof geocode>>;
  parseStayProp: ReturnType<typeof useServerFn<typeof parseStayText>>;
  stayFnProp: ReturnType<typeof useServerFn<typeof saveAccommodation>>;
  onDone: () => void;
}) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  if (answer === null) {
    return (
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ChoiceCard label="Yes, I've booked" hint="Add your stay" onClick={() => setAnswer("yes")} />
        <ChoiceCard label="Not yet" hint="Skip for now" onClick={onDone} />
      </div>
    );
  }
  const handleSave = async (s: Parameters<typeof stayFnProp>[0]["data"]) => {
    await stayFnProp({ data: s });
    onDone();
  };
  return (
    <div className="mt-5">
      <Tabs defaultValue="address">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="address" className="rounded-lg">Address</TabsTrigger>
          <TabsTrigger value="airbnb" className="rounded-lg">Airbnb link</TabsTrigger>
          <TabsTrigger value="booking" className="rounded-lg">Booking.com</TabsTrigger>
        </TabsList>
        <TabsContent value="address" className="mt-4">
          <StayAddressForm geocode={geoFnProp} destinationHint={destination} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="airbnb" className="mt-4 space-y-2">
          <div className="rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How to grab your Airbnb link</p>
            <ol className="ml-4 mt-1 list-decimal space-y-0.5">
              <li>Open your booking in the Airbnb app or website.</li>
              <li>Tap <strong>Share</strong> → <strong>Copy link</strong> (or copy the URL from your browser).</li>
              <li>Paste it below — we'll pull dates, address, and a map pin automatically.</li>
            </ol>
          </div>
          <StayPasteForm parse={parseStayProp} geocode={geoFnProp} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="booking" className="mt-4 space-y-2">
          <div className="rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How to grab your Booking.com link</p>
            <ol className="ml-4 mt-1 list-decimal space-y-0.5">
              <li>Open your confirmation email or your trip in Booking.com.</li>
              <li>Copy the property URL (or paste the full confirmation email body).</li>
              <li>Paste below — we'll extract property, dates, and address.</li>
            </ol>
          </div>
          <StayPasteForm parse={parseStayProp} geocode={geoFnProp} onSave={handleSave} />
        </TabsContent>
      </Tabs>
      <button onClick={() => setAnswer(null)} className="mt-3 text-xs text-muted-foreground">← Back to options</button>
    </div>
  );
}

function ChoiceCard({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border-2 border-border p-5 text-left transition hover:border-primary hover:bg-primary/5"
    >
      <p className="font-display text-xl">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </button>
  );
}

function capitalise(s: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
