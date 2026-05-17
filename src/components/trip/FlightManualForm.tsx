import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type FlightPayload = {
  airline?: string;
  flight_number: string;
  scheduled_at: string;
  origin_iata?: string;
  destination_iata?: string;
  direction: "arrival";
};

export function FlightManualForm({ initial, onSave, ctaLabel = "Continue" }: {
  initial?: Partial<FlightPayload>;
  onSave: (f: FlightPayload) => Promise<void>;
  ctaLabel?: string;
}) {
  const [airline, setAirline] = useState(initial?.airline ?? "");
  const [flight_number, setFn] = useState(initial?.flight_number ?? "");
  const [scheduled_at, setAt] = useState(initial?.scheduled_at?.slice(0, 16) ?? "");
  const [origin_iata, setO] = useState(initial?.origin_iata ?? "");
  const [destination_iata, setD] = useState(initial?.destination_iata ?? "DPS");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3">
      <Field label="Airline"><Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="Singapore Airlines" className="h-11 rounded-xl" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Flight #"><Input value={flight_number} onChange={(e) => setFn(e.target.value.toUpperCase())} placeholder="SQ938" className="h-11 rounded-xl" /></Field>
        <Field label="Arrival (local)"><Input type="datetime-local" value={scheduled_at} onChange={(e) => setAt(e.target.value)} className="h-11 rounded-xl" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From (IATA)"><Input value={origin_iata} onChange={(e) => setO(e.target.value.toUpperCase())} placeholder="SIN" maxLength={3} className="h-11 rounded-xl" /></Field>
        <Field label="To (IATA)"><Input value={destination_iata} onChange={(e) => setD(e.target.value.toUpperCase())} maxLength={3} className="h-11 rounded-xl" /></Field>
      </div>
      <Button
        className="mt-2 h-12 w-full rounded-xl text-base"
        disabled={!flight_number || !scheduled_at || saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({ airline, flight_number, scheduled_at: new Date(scheduled_at).toISOString(), origin_iata, destination_iata, direction: "arrival" });
          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          finally { setSaving(false); }
        }}
      >{saving ? "Saving…" : ctaLabel}</Button>
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
