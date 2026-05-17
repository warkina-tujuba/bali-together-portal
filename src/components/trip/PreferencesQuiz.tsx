import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { VIBE_OPTIONS, MUST_DO_OPTIONS, AVOID_OPTIONS } from "@/data/bali-activities";
import type { Preferences } from "@/lib/itinerary-planner";
import { cn } from "@/lib/utils";

export function PreferencesQuiz({ initial, onComplete }: {
  initial?: Partial<Preferences>;
  onComplete: (prefs: Preferences) => void | Promise<void>;
}) {
  const [vibes, setVibes] = useState<string[]>(initial?.vibes ?? []);
  const [must_do, setMust] = useState<string[]>(initial?.must_do ?? []);
  const [avoid, setAvoid] = useState<string[]>(initial?.avoid ?? []);
  const [pace, setPace] = useState<number>(initial?.pace ?? 3);
  const [budget, setBudget] = useState<number>(initial?.budget ?? 2);
  const [busy, setBusy] = useState(false);

  const canSubmit = vibes.length > 0;

  return (
    <div className="space-y-6">
      <Section label="What's the vibe?" hint="Pick at least one — mix freely">
        <Chips options={VIBE_OPTIONS} value={vibes} onChange={setVibes} />
      </Section>

      <Section label="Must-do moments" hint="What can't this trip miss?">
        <Chips options={MUST_DO_OPTIONS} value={must_do} onChange={setMust} />
      </Section>

      <Section label="Pace" hint={pace <= 2 ? "Chill — 1 thing per day" : pace >= 4 ? "Packed — 3-4 things per day" : "Balanced"}>
        <Slider value={[pace]} onValueChange={(v) => setPace(v[0])} min={1} max={5} step={1} className="mt-2" />
      </Section>

      <Section label="Budget per activity" hint={budget === 1 ? "Street eats & free entries" : budget === 2 ? "Mid-range — some splurges" : "Premium experiences"}>
        <Slider value={[budget]} onValueChange={(v) => setBudget(v[0])} min={1} max={3} step={1} className="mt-2" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>$</span><span>$$</span><span>$$$</span>
        </div>
      </Section>

      <Section label="Anything to avoid?">
        <Chips options={AVOID_OPTIONS} value={avoid} onChange={setAvoid} />
      </Section>

      <Button
        disabled={!canSubmit || busy}
        onClick={async () => {
          setBusy(true);
          try { await onComplete({ vibes, must_do, avoid, pace, budget }); }
          finally { setBusy(false); }
        }}
        className="h-12 w-full rounded-xl text-base"
      >
        {busy ? "Building your plan…" : "Build my plan"}
      </Button>
    </div>
  );
}

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {hint && <p className="mt-0.5 text-sm">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Chips({ options, value, onChange }: {
  options: ReadonlyArray<{ id: string; label: string; emoji?: string }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(active ? value.filter((v) => v !== o.id) : [...value, o.id])}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-secondary"
            )}
          >
            {o.emoji && <span className="mr-1">{o.emoji}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
