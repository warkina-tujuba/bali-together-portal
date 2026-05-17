import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { saveAccommodation, geocode } from "@/lib/trip.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BOOKING_SOURCES, bookingSourceMeta } from "@/lib/booking-source";
import { cn } from "@/lib/utils";

type Picked = { name: string; address: string; lat: number; lng: number; place_id: string };
type Initial = {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  place_id?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  booking_source?: string | null;
  booking_url?: string | null;
};

export function StayDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Initial }) {
  const [open, setOpen] = useState(false);
  const saveFn = useServerFn(saveAccommodation);
  const geoFn = useServerFn(geocode);
  const qc = useQueryClient();

  const [q, setQ] = useState(initial?.name ?? "");
  const [results, setResults] = useState<Picked[]>([]);
  const [picked, setPicked] = useState<Picked | null>(
    initial?.name && initial?.lat != null && initial?.lng != null
      ? { name: initial.name, address: initial.address ?? "", lat: initial.lat, lng: initial.lng, place_id: initial.place_id ?? "" }
      : null,
  );
  const [check_in, setCheckIn] = useState(initial?.check_in ?? "");
  const [check_out, setCheckOut] = useState(initial?.check_out ?? "");
  const [booking_source, setSource] = useState(initial?.booking_source ?? "");
  const [booking_url, setUrl] = useState(initial?.booking_url ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.length < 3 || picked) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await geoFn({ data: { q } }); setResults(r.results); } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, [q, picked, geoFn]);

  async function submit() {
    if (!picked) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          name: picked.name,
          address: picked.address,
          lat: picked.lat,
          lng: picked.lng,
          place_id: picked.place_id || null,
          check_in: check_in || null,
          check_out: check_out || null,
          booking_source: booking_source || null,
          booking_url: booking_url || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Stay saved");
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
          <DialogTitle className="font-display text-2xl">Where are you staying?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Property">
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPicked(null); }}
              placeholder="e.g. Bambu Indah Ubud"
              className="h-11 rounded-xl"
            />
          </Field>
          {!picked && results.length > 0 && (
            <ul className="max-h-48 overflow-auto rounded-xl border border-border bg-card">
              {results.map((r) => (
                <li key={r.place_id}>
                  <button onClick={() => { setPicked(r); setResults([]); setQ(r.name); }} className="w-full px-3 py-2 text-left hover:bg-secondary">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{r.address}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-sm font-medium">{picked.name}</p>
              <p className="text-xs text-muted-foreground">{picked.address}</p>
            </div>
          )}

          <Field label="Booked through">
            <div className="flex flex-wrap gap-2">
              {BOOKING_SOURCES.map((s) => {
                const meta = bookingSourceMeta(s);
                const active = booking_source === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(active ? "" : s)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <span>{meta.emoji}</span>{meta.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Booking link (optional)">
            <Input value={booking_url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-11 rounded-xl" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check in"><Input type="date" value={check_in} onChange={(e) => setCheckIn(e.target.value)} className="h-11 rounded-xl" /></Field>
            <Field label="Check out"><Input type="date" value={check_out} onChange={(e) => setCheckOut(e.target.value)} className="h-11 rounded-xl" /></Field>
          </div>

          <Button className="h-11 w-full rounded-xl" disabled={!picked || saving} onClick={submit}>
            {saving ? "Saving…" : "Save stay"}
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
