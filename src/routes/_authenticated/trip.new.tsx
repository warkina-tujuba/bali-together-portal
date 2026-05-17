import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  createTrip, geocode, updateProfile, saveFlight, saveAccommodation,
  parseFlightText, parseStayText, suggestItinerary, saveItineraryDays,
  addActivity, createMagicLink,
} from "@/lib/trip.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AvatarPicker } from "@/components/trip/AvatarPicker";
import { OccasionPicker } from "@/components/trip/OccasionPicker";
import { FlightPasteForm } from "@/components/trip/FlightPasteForm";
import { FlightManualForm } from "@/components/trip/FlightManualForm";
import { StayPasteForm } from "@/components/trip/StayPasteForm";
import { StaySearchForm } from "@/components/trip/StaySearchForm";
import { EventForm } from "@/components/trip/EventForm";
import { toast } from "sonner";
import { Sparkles, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trip/new")({ component: TripWizard });

type AiDay = { date: string; title: string; items: string[] };

function TripWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createTripFn = useServerFn(createTrip);
  const geoFn = useServerFn(geocode);
  const updateFn = useServerFn(updateProfile);
  const flightFn = useServerFn(saveFlight);
  const stayFn = useServerFn(saveAccommodation);
  const parseFlight = useServerFn(parseFlightText);
  const parseStay = useServerFn(parseStayText);
  const aiFn = useServerFn(suggestItinerary);
  const saveDaysFn = useServerFn(saveItineraryDays);
  const addActivityFn = useServerFn(addActivity);
  const magicFn = useServerFn(createMagicLink);

  const [step, setStep] = useState(0);
  const steps = ["Trip", "You", "Flight", "Stay", "Plan & invite"];
  const progress = ((step + 1) / steps.length) * 100;

  // Step 1
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("just-because");
  const [destination, setDestination] = useState("");
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);

  // Step 5
  const [aiDays, setAiDays] = useState<AiDay[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [magic, setMagic] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function geocodeDest() {
    if (!destination.trim()) return;
    try {
      const r = await geoFn({ data: { q: destination } });
      const hit = r.results?.[0];
      if (hit) { setDestLat(hit.lat); setDestLng(hit.lng); }
    } catch { /* ignore */ }
  }

  async function handleCreateTrip() {
    if (!name || !destination || !start || !end) {
      toast.error("Fill in name, destination, and dates"); return;
    }
    setCreating(true);
    try {
      if (destLat == null) await geocodeDest();
      const r = await createTripFn({
        data: { name, occasion, destination, lat: destLat, lng: destLng, start_date: start, end_date: end, description: description || null },
      });
      setTripId(r.trip.id);
      await qc.invalidateQueries();
      setStep(1);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't create"); }
    finally { setCreating(false); }
  }

  async function generateAi() {
    setAiBusy(true);
    try {
      const r = await aiFn();
      setAiDays(r.days);
      if (r.days.length > 0) {
        await saveDaysFn({ data: { days: r.days.map((d) => ({ date: d.date, title: d.title, summary: d.items.join(" • ") })) } });
        toast.success("Itinerary saved");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setAiBusy(false); }
  }

  async function publish() {
    try {
      const r = await magicFn({ data: { full_name: "Guest", max_uses: 50 } });
      const url = `${window.location.origin}/?invite=${r.token}`;
      setMagic(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      toast.success("Magic link copied!");
      await updateFn({ data: { onboarding_complete: true, onboarding_step: 5 } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't publish"); }
  }

  // Group AI days for event tile rendering
  const daysList: AiDay[] = aiDays.length > 0 ? aiDays : buildEmptyDays(start, end);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Step {step + 1} of {steps.length} • {steps[step]}</p>
        {step > 0 && step < 4 && <button onClick={() => setStep(step + 1)} className="text-xs text-muted-foreground">Skip →</button>}
      </div>
      <Progress value={progress} className="mb-6 h-1" />

      {step === 0 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card">
          <h1 className="font-display text-3xl sm:text-4xl">Start your trip</h1>
          <p className="mt-1 text-sm text-muted-foreground">A few basics — you can edit details later.</p>
          <div className="mt-6 space-y-5">
            <Field label="Trip name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sara's 30th in Bali" className="h-12 rounded-xl" />
            </Field>
            <Field label="Occasion">
              <OccasionPicker value={occasion} onChange={setOccasion} />
            </Field>
            <Field label="Destination">
              <Input value={destination} onChange={(e) => { setDestination(e.target.value); setDestLat(null); setDestLng(null); }} onBlur={geocodeDest} placeholder="Canggu, Bali" className="h-12 rounded-xl" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-12 rounded-xl" /></Field>
              <Field label="End"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-12 rounded-xl" /></Field>
            </div>
            <Field label="Description (optional)">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A weekend of beach mornings, scooter days, and one fancy dinner." className="min-h-[80px] rounded-xl" />
            </Field>
          </div>
          <Button disabled={creating || !name || !destination || !start || !end} onClick={handleCreateTrip} className="mt-6 h-12 w-full rounded-xl text-base">
            {creating ? "Creating…" : "Create trip"}
          </Button>
        </Card>
      )}

      {step === 1 && <StepProfile onNext={async (patch) => { await updateFn({ data: patch }); setStep(2); }} />}

      {step === 2 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card">
          <h2 className="font-display text-3xl">Your flight</h2>
          <p className="mt-1 text-sm text-muted-foreground">So the crew can see when you land. Skip if you'll add later.</p>
          <Tabs defaultValue="paste" className="mt-5">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="paste" className="rounded-lg">Paste booking</TabsTrigger>
              <TabsTrigger value="manual" className="rounded-lg">Add manually</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="mt-4">
              <FlightPasteForm parse={parseFlight} onSave={async (f) => { await flightFn({ data: f }); setStep(3); }} />
            </TabsContent>
            <TabsContent value="manual" className="mt-4">
              <FlightManualForm onSave={async (f) => { await flightFn({ data: f }); setStep(3); }} />
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card">
          <h2 className="font-display text-3xl">Your stay</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll drop a 🏠 pin on the group map.</p>
          <Tabs defaultValue="paste" className="mt-5">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="paste" className="rounded-lg">Paste booking</TabsTrigger>
              <TabsTrigger value="search" className="rounded-lg">Search</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="mt-4">
              <StayPasteForm parse={parseStay} geocode={geoFn} onSave={async (s) => { await stayFn({ data: s }); setStep(4); }} />
            </TabsContent>
            <TabsContent value="search" className="mt-4">
              <StaySearchForm geocode={geoFn} destinationHint={destination} onSave={async (s) => { await stayFn({ data: s }); setStep(4); }} />
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {step === 4 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card">
          <h2 className="font-display text-3xl">Plan & invite</h2>
          <p className="mt-1 text-sm text-muted-foreground">Let AI draft your days, add events, then share the magic link.</p>

          <Button onClick={generateAi} disabled={aiBusy} className="mt-5 h-11 w-full rounded-xl">
            <Sparkles className="mr-2 h-4 w-4" />{aiBusy ? "Thinking…" : aiDays.length > 0 ? "Regenerate plan" : "Draft my days with AI"}
          </Button>

          {daysList.length > 0 && (
            <div className="mt-5 space-y-3">
              {daysList.map((d) => (
                <div key={d.date} className="rounded-2xl bg-secondary p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{new Date(d.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                  <p className="font-display text-lg">{d.title || "Open day"}</p>
                  {d.items.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {d.items.map((it, i) => <li key={i}>• {it}</li>)}
                    </ul>
                  )}
                  <EventForm
                    dayDate={d.date}
                    onAdd={async (payload) => { await addActivityFn({ data: payload }); toast.success("Event added"); }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5">
            <h3 className="font-display text-xl">Ready to invite?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Publish creates one magic link you can share anywhere — email, SMS, group chat.</p>
            {magic ? (
              <div className="mt-4 space-y-2">
                <div className="break-all rounded-xl bg-background p-3 font-mono text-xs">{magic}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { navigator.clipboard.writeText(magic); setCopied(true); }}>
                    {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />} {copied ? "Copied" : "Copy again"}
                  </Button>
                  <Button size="sm" className="rounded-lg" onClick={() => navigate({ to: "/dashboard" })}>Go to dashboard</Button>
                </div>
              </div>
            ) : (
              <Button onClick={publish} className="mt-4 h-11 rounded-xl">Publish & copy magic link</Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function StepProfile({ onNext }: { onNext: (p: Record<string, unknown>) => Promise<void> }) {
  const [full_name, setName] = useState("");
  const [avatar_url, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="rounded-3xl border-0 p-7 shadow-card">
      <h2 className="font-display text-3xl">Pick your hero</h2>
      <p className="mt-1 text-sm text-muted-foreground">This is how the crew will see you on the map and in chat.</p>
      <div className="mt-5 space-y-4">
        <Field label="Choose your avatar"><AvatarPicker value={avatar_url} onChange={setAvatar} /></Field>
        <Field label="Your name"><Input value={full_name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" /></Field>
      </div>
      <Button
        disabled={busy || !full_name.trim()}
        onClick={async () => { setBusy(true); try { await onNext({ full_name, avatar_url }); } finally { setBusy(false); } }}
        className="mt-6 h-12 w-full rounded-xl text-base"
      >Continue</Button>
    </Card>
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

function buildEmptyDays(start: string, end: string): AiDay[] {
  if (!start || !end) return [];
  const s = new Date(start); const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return [];
  const out: AiDay[] = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push({ date: d.toISOString().slice(0, 10), title: "", items: [] });
    if (out.length > 30) break;
  }
  return out;
}
