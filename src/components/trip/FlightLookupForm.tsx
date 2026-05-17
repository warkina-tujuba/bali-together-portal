import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupFlight } from "@/lib/trip.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type LookupResult = {
  airline: string | null;
  airline_iata: string | null;
  flight_number: string;
  scheduled_at: string | null;
  origin_iata: string | null;
  origin_city: string | null;
  destination_iata: string | null;
  destination_city: string | null;
};

export function FlightLookupForm({ onFound }: { onFound: (r: LookupResult) => void }) {
  const lookupFn = useServerFn(lookupFlight);
  const [num, setNum] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!num) return;
    setBusy(true);
    try {
      const r = await lookupFn({ data: { flight_number: num.trim().toUpperCase(), date: date || null } });
      if (!r.found) {
        toast.error("No flight found — try entering details manually below.");
        return;
      }
      onFound({
        airline: r.airline,
        airline_iata: r.airline_iata,
        flight_number: r.flight_number,
        scheduled_at: r.scheduled_at,
        origin_iata: r.origin_iata,
        origin_city: r.origin_city,
        destination_iata: r.destination_iata,
        destination_city: r.destination_city,
      });
      toast.success("Flight found — review and save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Auto-fill from flight number</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={num}
          onChange={(e) => setNum(e.target.value.toUpperCase())}
          placeholder="SQ938"
          className="h-10 flex-1 rounded-lg uppercase"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 w-[140px] rounded-lg"
        />
        <Button type="button" onClick={go} disabled={!num || busy} className="h-10 rounded-lg px-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Date helps disambiguate. Powered by AviationStack.</p>
    </div>
  );
}
