import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, AlertTriangle } from "lucide-react";
import { FlightManualForm, type FlightPayload } from "./FlightManualForm";

type ParseFn = (input: { data: { text: string } }) => Promise<{
  airline?: string | null; flight_number?: string | null; scheduled_at?: string | null;
  origin_iata?: string | null; destination_iata?: string | null; confidence: "high" | "medium" | "low";
}>;

export function FlightPasteForm({ parse, onSave }: { parse: ParseFn; onSave: (f: FlightPayload) => Promise<void>; }) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Partial<FlightPayload> & { confidence?: "high" | "medium" | "low" } | null>(null);

  async function handleParse() {
    if (text.trim().length < 4) { toast.error("Paste more detail"); return; }
    setParsing(true);
    try {
      const r = await parse({ data: { text } });
      if (!r.flight_number && !r.scheduled_at) { toast.error("Couldn't read that — try manual"); return; }
      setParsed({
        airline: r.airline ?? "",
        flight_number: r.flight_number ?? "",
        scheduled_at: r.scheduled_at ?? "",
        origin_iata: r.origin_iata ?? "",
        destination_iata: r.destination_iata ?? "DPS",
        direction: "arrival",
        confidence: r.confidence,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally { setParsing(false); }
  }

  if (parsed) {
    return (
      <div>
        {parsed.confidence !== "high" && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Confidence is {parsed.confidence}. Double-check the fields below.</span>
          </div>
        )}
        <FlightManualForm initial={parsed} onSave={onSave} ctaLabel="Confirm & save" />
        <button onClick={() => setParsed(null)} className="mt-3 w-full text-center text-xs text-muted-foreground underline">
          Paste a different one
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Paste your airline confirmation email, booking reference, or a flight number + date — we'll pull the details out.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Example:\n\nBooking reference: XYZ123\nSingapore Airlines SQ938\nDeparts SIN 20 Jun 2026 22:45\nArrives DPS 21 Jun 2026 01:25`}
        className="min-h-[160px] rounded-xl"
      />
      <Button onClick={handleParse} disabled={parsing} className="h-12 w-full rounded-xl text-base">
        <Sparkles className="mr-2 h-4 w-4" />
        {parsing ? "Reading your booking…" : "Read booking"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Just a booking code? Include the airline name with it (e.g. "Singapore Airlines XYZ123").
      </p>
    </div>
  );
}
