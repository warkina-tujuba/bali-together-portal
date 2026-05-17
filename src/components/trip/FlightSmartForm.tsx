import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupFlight, saveFlight } from "@/lib/trip.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Plane, Check, AlertCircle } from "lucide-react";
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

type Found = {
  airline: string | null;
  airline_iata: string | null;
  flight_number: string;
  scheduled_at: string | null;
  origin_iata: string | null;
  origin_city: string | null;
  destination_iata: string | null;
  destination_city: string | null;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function FlightSmartForm({
  initial,
  defaultDate,
  onSaved,
  ctaLabel = "Save flight",
}: {
  initial?: Initial;
  defaultDate?: string | null; // YYYY-MM-DD (e.g. trip start)
  onSaved: () => void | Promise<void>;
  ctaLabel?: string;
}) {
  const lookupFn = useServerFn(lookupFlight);
  const saveFn = useServerFn(saveFlight);

  const [num, setNum] = useState(initial?.flight_number ?? "");
  const [date, setDate] = useState(defaultDate ?? "");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(
    initial?.flight_number
      ? {
          airline: initial.airline ?? null,
          airline_iata: initial.airline_iata ?? parseAirlineCode(initial.flight_number) ?? null,
          flight_number: initial.flight_number,
          scheduled_at: initial.scheduled_at ?? null,
          origin_iata: initial.origin_iata ?? null,
          origin_city: null,
          destination_iata: initial.destination_iata ?? "DPS",
          destination_city: null,
        }
      : null
  );
  const [manual, setManual] = useState(false);

  // manual fields
  const [airline, setAirline] = useState(initial?.airline ?? "");
  const [scheduledLocal, setScheduledLocal] = useState(toLocalInputValue(initial?.scheduled_at ?? null));
  const [origin, setOrigin] = useState(initial?.origin_iata ?? "");
  const [destination, setDestination] = useState(initial?.destination_iata ?? "DPS");
  const [saving, setSaving] = useState(false);

  async function runLookup() {
    if (!num.trim()) return;
    setLooking(true);
    setLookupError(null);
    try {
      const r = await lookupFn({ data: { flight_number: num.trim().toUpperCase(), date: date || null } });
      if (!r.found) {
        setLookupError("We couldn't find that flight. Double-check the number, or add it manually below.");
        setManual(true);
        return;
      }
      setFound(r);
      // sync manual fields too, so user can tweak
      setAirline(r.airline ?? "");
      setScheduledLocal(toLocalInputValue(r.scheduled_at));
      setOrigin(r.origin_iata ?? "");
      setDestination(r.destination_iata ?? "DPS");
      toast.success("Flight found via AviationStack");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed";
      setLookupError(msg);
      setManual(true);
    } finally {
      setLooking(false);
    }
  }

  async function save() {
    const flight_number = (found?.flight_number || num).toUpperCase().replace(/\s+/g, "");
    const iata = parseAirlineCode(flight_number);
    const scheduledISO = scheduledLocal
      ? new Date(scheduledLocal).toISOString()
      : found?.scheduled_at ?? null;
    if (!flight_number || !scheduledISO) {
      toast.error("Flight number and arrival time are required");
      return;
    }
    setSaving(true);
    try {
      await saveFn({
        data: {
          airline: (airline || found?.airline) ?? null,
          airline_iata: iata,
          flight_number,
          scheduled_at: scheduledISO,
          origin_iata: (origin || found?.origin_iata || "").toUpperCase() || null,
          destination_iata: (destination || found?.destination_iata || "DPS").toUpperCase() || null,
          direction: "arrival",
        },
      });
      toast.success("Flight saved");
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const iataCode = found?.airline_iata ?? parseAirlineCode(num);
  const logo = iataCode ? airlineLogoUrl(iataCode) : null;

  return (
    <div className="space-y-4">
      {/* Step 1 — lookup */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-primary">Live flight lookup</Label>
          <Badge variant="secondary" className="rounded-full text-[10px]">AviationStack</Badge>
        </div>
        <div className="flex gap-2">
          <Input
            value={num}
            onChange={(e) => { setNum(e.target.value.toUpperCase()); setFound(null); setLookupError(null); }}
            placeholder="SQ938"
            className="h-11 flex-1 rounded-xl uppercase font-mono text-base"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runLookup(); } }}
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-[150px] rounded-xl"
          />
          <Button type="button" onClick={runLookup} disabled={!num || looking} className="h-11 rounded-xl px-4">
            {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Type your flight number and arrival date — we'll fetch airline, times, and airports automatically.
        </p>
        {lookupError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {/* Found result */}
      {found && (
        <div className="rounded-2xl bg-secondary p-4">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={found.airline ?? iataCode ?? "Airline"} className="h-12 w-12 rounded-lg bg-white object-contain p-1.5" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white"><Plane className="h-5 w-5" /></div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-display text-lg">{found.airline ?? iataCode ?? "Airline"}</p>
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="font-mono text-sm text-muted-foreground">{found.flight_number}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 items-center gap-2 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">From</p>
              <p className="font-medium">{found.origin_iata ?? "—"}</p>
              {found.origin_city && <p className="truncate text-[11px] text-muted-foreground">{found.origin_city}</p>}
            </div>
            <div className="text-center text-muted-foreground">→</div>
            <div className="text-right">
              <p className="text-xs uppercase text-muted-foreground">To</p>
              <p className="font-medium">{found.destination_iata ?? "—"}</p>
              {found.destination_city && <p className="truncate text-[11px] text-muted-foreground">{found.destination_city}</p>}
            </div>
          </div>
          {found.scheduled_at && (
            <p className="mt-3 rounded-lg bg-background p-2 text-center text-sm">
              Arriving{" "}
              <span className="font-medium">
                {new Date(found.scheduled_at).toLocaleString(undefined, {
                  weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Manual fallback */}
      {!manual && !found && (
        <button type="button" onClick={() => setManual(true)} className="text-xs text-muted-foreground underline">
          Or enter flight details manually
        </button>
      )}

      {(manual || found) && (
        <div className="space-y-3 rounded-2xl border border-dashed p-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {found ? "Tweak details if needed" : "Manual entry"}
          </Label>
          <div className="space-y-2">
            <Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="Airline (e.g. Singapore Airlines)" className="h-10 rounded-lg" />
            {!found && (
              <Input value={num} onChange={(e) => setNum(e.target.value.toUpperCase())} placeholder="Flight # (e.g. SQ938)" className="h-10 rounded-lg uppercase" />
            )}
            <Input type="datetime-local" value={scheduledLocal} onChange={(e) => setScheduledLocal(e.target.value)} className="h-10 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} placeholder="From (SIN)" maxLength={3} className="h-10 rounded-lg uppercase" />
              <Input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} placeholder="To (DPS)" maxLength={3} className="h-10 rounded-lg uppercase" />
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={save}
        disabled={saving || (!found && (!num || !scheduledLocal))}
        className="h-12 w-full rounded-xl text-base"
      >
        {saving ? "Saving…" : ctaLabel}
      </Button>
    </div>
  );
}
