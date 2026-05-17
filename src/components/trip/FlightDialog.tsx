import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { saveFlight } from "@/lib/trip.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { airlineLogoUrl, parseAirlineCode } from "@/lib/airline";

type Initial = {
  airline?: string | null;
  airline_iata?: string | null;
  flight_number?: string | null;
  scheduled_at?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
};

export function FlightDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Initial }) {
  const [open, setOpen] = useState(false);
  const saveFn = useServerFn(saveFlight);
  const qc = useQueryClient();

  const [airline, setAirline] = useState(initial?.airline ?? "");
  const [flight_number, setFn] = useState(initial?.flight_number ?? "");
  const [scheduled_at, setAt] = useState(
    initial?.scheduled_at ? new Date(initial.scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [origin_iata, setO] = useState(initial?.origin_iata ?? "");
  const [destination_iata, setD] = useState(initial?.destination_iata ?? "DPS");
  const [saving, setSaving] = useState(false);

  const iata = (initial?.airline_iata ?? parseAirlineCode(flight_number)) || undefined;
  const logo = iata ? airlineLogoUrl(iata) : null;

  async function submit() {
    if (!flight_number || !scheduled_at) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          airline,
          airline_iata: parseAirlineCode(flight_number),
          flight_number: flight_number.toUpperCase(),
          scheduled_at: new Date(scheduled_at).toISOString(),
          origin_iata: origin_iata.toUpperCase() || null,
          destination_iata: destination_iata.toUpperCase() || null,
          direction: "arrival",
        },
      });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Flight saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Your flight</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {logo && (
            <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
              <img src={logo} alt={airline || iata || "Airline"} className="h-10 w-10 rounded bg-white object-contain p-1" />
              <div>
                <p className="text-sm font-medium">{airline || iata}</p>
                <p className="text-xs text-muted-foreground">{flight_number || "Flight number"}</p>
              </div>
            </div>
          )}
          <Field label="Airline"><Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="Singapore Airlines" className="h-11 rounded-xl" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Flight #"><Input value={flight_number} onChange={(e) => setFn(e.target.value.toUpperCase())} placeholder="SQ938" className="h-11 rounded-xl" /></Field>
            <Field label="Arrival (local)"><Input type="datetime-local" value={scheduled_at} onChange={(e) => setAt(e.target.value)} className="h-11 rounded-xl" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From (IATA)"><Input value={origin_iata} onChange={(e) => setO(e.target.value.toUpperCase())} placeholder="SIN" maxLength={3} className="h-11 rounded-xl" /></Field>
            <Field label="To (IATA)"><Input value={destination_iata} onChange={(e) => setD(e.target.value.toUpperCase())} maxLength={3} className="h-11 rounded-xl" /></Field>
          </div>
          <Button className="h-11 w-full rounded-xl" disabled={saving || !flight_number || !scheduled_at} onClick={submit}>
            {saving ? "Saving…" : "Save flight"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
