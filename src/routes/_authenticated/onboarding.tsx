import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptInvite, getDashboard, updateProfile, saveFlight, saveAccommodation, geocode } from "@/lib/trip.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: searchSchema,
  component: Onboarding,
});

type Stay = { name: string; address: string; lat: number; lng: number; place_id: string };

function Onboarding() {
  const { invite } = useSearch({ from: "/_authenticated/onboarding" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const acceptFn = useServerFn(acceptInvite);
  const dashFn = useServerFn(getDashboard);
  const updateFn = useServerFn(updateProfile);
  const flightFn = useServerFn(saveFlight);
  const stayFn = useServerFn(saveAccommodation);
  const geoFn = useServerFn(geocode);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashFn() });
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);

  // accept invite once on mount
  useEffect(() => {
    if (!invite || accepted) return;
    acceptFn({ data: { token: invite } }).then((r) => {
      setAccepted(true);
      if (!r.ok) toast.error("Invite invalid — continuing without it");
      refetch();
    }).catch(() => setAccepted(true));
  }, [invite, accepted, acceptFn, refetch]);

  useEffect(() => {
    if (data?.profile) {
      if (data.profile.onboarding_complete) {
        navigate({ to: "/dashboard" });
      } else {
        setStep(data.profile.onboarding_step ?? 0);
      }
    }
  }, [data, navigate]);

  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  const steps = ["Welcome", "Profile", "Flight", "Stay", "WhatsApp"];
  const progress = ((step + 1) / steps.length) * 100;

  async function advance(next: number, patch: Record<string, unknown> = {}) {
    await updateFn({ data: { onboarding_step: next, onboarding_complete: next >= steps.length, ...patch } });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (next >= steps.length) navigate({ to: "/dashboard" });
    else setStep(next);
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Step {step + 1} of {steps.length}</p>
        <Progress value={progress} className="mt-2 h-1" />
      </div>

      {step === 0 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card">
          <h1 className="font-display text-4xl leading-tight">Selamat datang{data.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}.</h1>
          <p className="mt-3 text-muted-foreground">A few quick steps and you're in the group. Takes about 2 minutes.</p>
          {data.trip && (
            <div className="mt-5 rounded-2xl bg-secondary p-4">
              <p className="font-display text-xl">{data.trip.name}</p>
              <p className="text-sm text-muted-foreground">{data.trip.destination} • {new Date(data.trip.start_date).toLocaleDateString()} – {new Date(data.trip.end_date).toLocaleDateString()}</p>
            </div>
          )}
          <Button className="mt-7 h-12 w-full rounded-xl text-base" onClick={() => advance(1)}>Begin</Button>
        </Card>
      )}

      {step === 1 && <StepProfile initial={data.profile} onNext={(patch) => advance(2, patch)} />}
      {step === 2 && <StepFlight onSave={async (f) => { await flightFn({ data: f }); await advance(3); }} />}
      {step === 3 && <StepStay onSave={async (s) => { await stayFn({ data: s }); await advance(4); }} geocode={geoFn} />}
      {step === 4 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card text-center">
          <h2 className="font-display text-3xl">Join the WhatsApp group</h2>
          <p className="mt-3 text-muted-foreground">Real-time updates, photos, last-minute plans.</p>
          <a
            href={data.trip?.whatsapp_invite_url ?? "https://chat.whatsapp.com/"}
            target="_blank" rel="noreferrer"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#25D366] font-medium text-white"
            onClick={() => updateFn({ data: { whatsapp_joined: true } })}
          >Open WhatsApp</a>
          <Button variant="ghost" className="mt-3 w-full" onClick={() => advance(5, { whatsapp_joined: true })}>I'm in — finish</Button>
        </Card>
      )}
    </div>
  );
}

function StepProfile({ initial, onNext }: { initial: { full_name?: string | null; phone?: string | null; dietary?: string | null; room_preference?: string | null } | null; onNext: (p: Record<string, unknown>) => void }) {
  const [full_name, setName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [dietary, setDietary] = useState(initial?.dietary ?? "");
  const [room_preference, setRoom] = useState(initial?.room_preference ?? "");
  return (
    <Card className="rounded-3xl border-0 p-7 shadow-card">
      <h2 className="font-display text-3xl">A little about you</h2>
      <div className="mt-5 space-y-3">
        <Field label="Full name"><Input value={full_name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" /></Field>
        <Field label="Phone (with country code)"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555…" className="h-12 rounded-xl" /></Field>
        <Field label="Dietary"><Input value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="None, vegetarian, allergies…" className="h-12 rounded-xl" /></Field>
        <Field label="Room preference"><Input value={room_preference} onChange={(e) => setRoom(e.target.value)} placeholder="King, twin, solo…" className="h-12 rounded-xl" /></Field>
      </div>
      <Button className="mt-6 h-12 w-full rounded-xl text-base" disabled={!full_name.trim()} onClick={() => onNext({ full_name, phone, dietary, room_preference })}>Continue</Button>
    </Card>
  );
}

function StepFlight({ onSave }: { onSave: (f: { airline?: string; flight_number: string; scheduled_at: string; origin_iata?: string; destination_iata?: string; direction: "arrival" }) => Promise<void> }) {
  const [airline, setAirline] = useState("");
  const [flight_number, setFn] = useState("");
  const [scheduled_at, setAt] = useState("");
  const [origin_iata, setO] = useState("");
  const [destination_iata, setD] = useState("DPS");
  const [saving, setSaving] = useState(false);

  return (
    <Card className="rounded-3xl border-0 p-7 shadow-card">
      <h2 className="font-display text-3xl">Your arrival flight</h2>
      <p className="mt-2 text-sm text-muted-foreground">So we can see everyone landing on one board.</p>
      <div className="mt-5 space-y-3">
        <Field label="Airline"><Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="Singapore Airlines" className="h-12 rounded-xl" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Flight #"><Input value={flight_number} onChange={(e) => setFn(e.target.value.toUpperCase())} placeholder="SQ938" className="h-12 rounded-xl" /></Field>
          <Field label="Arrival (local)"><Input type="datetime-local" value={scheduled_at} onChange={(e) => setAt(e.target.value)} className="h-12 rounded-xl" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From (IATA)"><Input value={origin_iata} onChange={(e) => setO(e.target.value.toUpperCase())} placeholder="SIN" maxLength={3} className="h-12 rounded-xl" /></Field>
          <Field label="To (IATA)"><Input value={destination_iata} onChange={(e) => setD(e.target.value.toUpperCase())} maxLength={3} className="h-12 rounded-xl" /></Field>
        </div>
      </div>
      <Button
        className="mt-6 h-12 w-full rounded-xl text-base"
        disabled={!flight_number || !scheduled_at || saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({ airline, flight_number, scheduled_at: new Date(scheduled_at).toISOString(), origin_iata, destination_iata, direction: "arrival" });
          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          finally { setSaving(false); }
        }}
      >{saving ? "Saving…" : "Continue"}</Button>
    </Card>
  );
}

function StepStay({ onSave, geocode }: { onSave: (s: { name: string; address: string; lat: number; lng: number; place_id: string }) => Promise<void>; geocode: (input: { data: { q: string } }) => Promise<{ results: Stay[] }> }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Stay[]>([]);
  const [picked, setPicked] = useState<Stay | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await geocode({ data: { q: `${q} Bali` } });
        setResults(r.results);
      } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, [q, geocode]);

  return (
    <Card className="rounded-3xl border-0 p-7 shadow-card">
      <h2 className="font-display text-3xl">Where are you staying?</h2>
      <p className="mt-2 text-sm text-muted-foreground">Type a hotel or villa name — pick the match.</p>
      <Input value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} placeholder="e.g. Bambu Indah Ubud" className="mt-4 h-12 rounded-xl" />
      {!picked && results.length > 0 && (
        <ul className="mt-2 max-h-64 overflow-auto rounded-2xl border border-border bg-card">
          {results.map((r) => (
            <li key={r.place_id}>
              <button onClick={() => { setPicked(r); setResults([]); setQ(r.name); }} className="w-full px-4 py-3 text-left hover:bg-secondary">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.address}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && (
        <div className="mt-3 rounded-2xl bg-secondary p-4">
          <p className="font-medium">{picked.name}</p>
          <p className="text-xs text-muted-foreground">{picked.address}</p>
        </div>
      )}
      <Button
        className="mt-6 h-12 w-full rounded-xl text-base"
        disabled={!picked || saving}
        onClick={async () => {
          if (!picked) return;
          setSaving(true);
          try { await onSave(picked); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          finally { setSaving(false); }
        }}
      >{saving ? "Saving…" : "Continue"}</Button>
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
