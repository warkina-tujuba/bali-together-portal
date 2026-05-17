import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, AlertTriangle } from "lucide-react";
import type { StayPayload } from "./StaySearchForm";

type ParseFn = (input: { data: { text: string } }) => Promise<{
  name?: string | null; address?: string | null;
  check_in?: string | null; check_out?: string | null;
  booking_source?: string | null; booking_url?: string | null;
  lat?: number | null; lng?: number | null;
  confidence: "high" | "medium" | "low";
}>;

type GeoFn = (input: { data: { q: string } }) => Promise<{
  results: Array<{ place_id: string; name: string; address: string; lat: number; lng: number }>;
}>;

export function StayPasteForm({ parse, geocode, onSave }: {
  parse: ParseFn; geocode: GeoFn; onSave: (s: StayPayload) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<StayPayload & { confidence?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleParse() {
    if (text.trim().length < 4) { toast.error("Paste more detail"); return; }
    setParsing(true);
    try {
      const r = await parse({ data: { text } });
      if (!r.name && !r.address && !r.booking_url) { toast.error("Couldn't read that — try the search tab"); return; }
      // Geocode if AI didn't return coords
      let lat = r.lat ?? null;
      let lng = r.lng ?? null;
      if ((lat == null || lng == null) && r.address) {
        try {
          const g = await geocode({ data: { q: r.address } });
          if (g.results[0]) { lat = g.results[0].lat; lng = g.results[0].lng; }
        } catch { /* ignore */ }
      }
      setParsed({
        name: r.name ?? "",
        address: r.address ?? "",
        lat, lng,
        check_in: r.check_in ?? "",
        check_out: r.check_out ?? "",
        booking_source: r.booking_source ?? "",
        booking_url: r.booking_url ?? "",
        confidence: r.confidence,
      });
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setParsing(false); }
  }

  if (parsed) {
    return (
      <div className="space-y-3">
        {parsed.confidence !== "high" && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Confidence is {parsed.confidence}. Edit anything below before saving.</span>
          </div>
        )}
        <Field label="Property name"><Input value={parsed.name} onChange={(e) => setParsed({ ...parsed, name: e.target.value })} className="h-11 rounded-xl" /></Field>
        <Field label="Address"><Input value={parsed.address} onChange={(e) => setParsed({ ...parsed, address: e.target.value })} className="h-11 rounded-xl" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in"><Input type="date" value={parsed.check_in ?? ""} onChange={(e) => setParsed({ ...parsed, check_in: e.target.value })} className="h-11 rounded-xl" /></Field>
          <Field label="Check-out"><Input type="date" value={parsed.check_out ?? ""} onChange={(e) => setParsed({ ...parsed, check_out: e.target.value })} className="h-11 rounded-xl" /></Field>
        </div>
        {parsed.booking_url && (
          <p className="text-xs text-muted-foreground">Source: <a href={parsed.booking_url} target="_blank" rel="noreferrer" className="underline">{parsed.booking_source ?? "booking"}</a></p>
        )}
        {parsed.lat != null && parsed.lng != null && (
          <p className="text-xs text-muted-foreground">📍 Pin ready: {parsed.lat.toFixed(4)}, {parsed.lng.toFixed(4)}</p>
        )}
        <Button
          className="h-12 w-full rounded-xl text-base"
          disabled={!parsed.name || saving}
          onClick={async () => {
            setSaving(true);
            try { await onSave(parsed); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            finally { setSaving(false); }
          }}
        >{saving ? "Saving…" : "Confirm & save"}</Button>
        <button onClick={() => setParsed(null)} className="w-full text-center text-xs text-muted-foreground underline">
          Paste a different one
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Paste your booking link or confirmation email (Airbnb, Booking.com, Agoda, Vrbo…). We'll pull the address, dates, and drop a pin on the map.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Examples:\n\nhttps://www.airbnb.com/rooms/12345678\n\nor paste the confirmation email body`}
        className="min-h-[160px] rounded-xl"
      />
      <Button onClick={handleParse} disabled={parsing} className="h-12 w-full rounded-xl text-base">
        <Sparkles className="mr-2 h-4 w-4" />
        {parsing ? "Reading your booking…" : "Read booking"}
      </Button>
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
