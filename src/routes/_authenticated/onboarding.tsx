import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvite, getDashboard, updateProfile, saveFlight, saveAccommodation,
  geocode, parseFlightText, parseStayText,
} from "@/lib/trip.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AvatarPicker } from "@/components/trip/AvatarPicker";
import { FlightPasteForm } from "@/components/trip/FlightPasteForm";
import { FlightManualForm } from "@/components/trip/FlightManualForm";
import { StayPasteForm } from "@/components/trip/StayPasteForm";
import { StaySearchForm } from "@/components/trip/StaySearchForm";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ invite: z.string().optional() });

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: searchSchema,
  component: Onboarding,
});

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
  const parseFlight = useServerFn(parseFlightText);
  const parseStay = useServerFn(parseStayText);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashFn() });
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);

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
      } else if (!data.profile.trip_id && !invite) {
        // no trip and no invite → send to chooser
        navigate({ to: "/choose" });
      } else {
        setStep(Math.min(data.profile.onboarding_step ?? 0, 3));
      }
    }
  }, [data, navigate, invite]);

  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  const steps = ["Welcome", "Profile", "Flight", "Stay"];
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
          <h1 className="font-display text-4xl leading-tight">Welcome{data.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}.</h1>
          <p className="mt-3 text-muted-foreground">Four quick steps and you're in the group. Takes about 2 minutes.</p>
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

      {step === 2 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card">
          <h2 className="font-display text-3xl">Your arrival flight</h2>
          <p className="mt-2 text-sm text-muted-foreground">So the crew can see everyone landing on one board.</p>
          <Tabs defaultValue="paste" className="mt-5">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="paste" className="rounded-lg">Paste booking</TabsTrigger>
              <TabsTrigger value="manual" className="rounded-lg">Add manually</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="mt-4">
              <FlightPasteForm
                parse={parseFlight}
                onSave={async (f) => { await flightFn({ data: f }); await advance(3); }}
              />
            </TabsContent>
            <TabsContent value="manual" className="mt-4">
              <FlightManualForm onSave={async (f) => { await flightFn({ data: f }); await advance(3); }} />
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-3xl border-0 p-7 shadow-card">
          <h2 className="font-display text-3xl">Where are you staying?</h2>
          <p className="mt-2 text-sm text-muted-foreground">We'll pin it on the group map so everyone knows the meeting point.</p>
          <Tabs defaultValue="paste" className="mt-5">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="paste" className="rounded-lg">Paste booking</TabsTrigger>
              <TabsTrigger value="search" className="rounded-lg">Search</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="mt-4">
              <StayPasteForm
                parse={parseStay}
                geocode={geoFn}
                onSave={async (s) => { await stayFn({ data: s }); await advance(4); }}
              />
            </TabsContent>
            <TabsContent value="search" className="mt-4">
              <StaySearchForm
                geocode={geoFn}
                destinationHint={data.trip?.destination}
                onSave={async (s) => { await stayFn({ data: s }); await advance(4); }}
              />
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}

function StepProfile({ initial, onNext }: { initial: { full_name?: string | null; phone?: string | null; dietary?: string | null; room_preference?: string | null; avatar_url?: string | null } | null; onNext: (p: Record<string, unknown>) => void }) {
  const [full_name, setName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [dietary, setDietary] = useState(initial?.dietary ?? "");
  const [room_preference, setRoom] = useState(initial?.room_preference ?? "");
  const [avatar_url, setAvatar] = useState<string | null>(initial?.avatar_url ?? null);
  return (
    <Card className="rounded-3xl border-0 p-7 shadow-card">
      <h2 className="font-display text-3xl">A little about you</h2>
      <div className="mt-5 space-y-4">
        <Field label="Pick your hero">
          <AvatarPicker value={avatar_url} onChange={(url) => setAvatar(url)} />
        </Field>
        <Field label="Full name"><Input value={full_name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" /></Field>
        <Field label="Phone (with country code)"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555…" className="h-12 rounded-xl" /></Field>
        <Field label="Dietary"><Input value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="None, vegetarian, allergies…" className="h-12 rounded-xl" /></Field>
        <Field label="Room preference"><Input value={room_preference} onChange={(e) => setRoom(e.target.value)} placeholder="King, twin, solo…" className="h-12 rounded-xl" /></Field>
      </div>
      <Button className="mt-6 h-12 w-full rounded-xl text-base" disabled={!full_name.trim()} onClick={() => onNext({ full_name, phone, dietary, room_preference, avatar_url })}>Continue</Button>
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
