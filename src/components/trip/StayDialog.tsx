import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { saveAccommodation } from "@/lib/trip.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BOOKING_SOURCES, bookingSourceMeta } from "@/lib/booking-source";
import { cn } from "@/lib/utils";
import { PlaceAutocomplete, type PlaceHit } from "@/components/trip/PlaceAutocomplete";

type Initial = {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  place_id?: string | null;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  booking_source?: string | null;
  booking_url?: string | null;
};

export function StayDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Initial }) {
  const [open, setOpen] = useState(false);
  const saveFn = useServerFn(saveAccommodation);
  const qc = useQueryClient();

  const [picked, setPicked] = useState<PlaceHit | null>(
    initial?.name && initial?.lat != null && initial?.lng != null
      ? { name: initial.name, address: initial.address ?? "", lat: initial.lat, lng: initial.lng, place_id: initial.google_place_id ?? initial.place_id ?? "" }
      : null,
  );
  const [check_in, setCheckIn] = useState(initial?.check_in ?? "");
  const [check_out, setCheckOut] = useState(initial?.check_out ?? "");
  const [booking_source, setSource] = useState(initial?.booking_source ?? "");
  const [booking_url, setUrl] = useState(initial?.booking_url ?? "");
  const [saving, setSaving] = useState(false);

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
          google_place_id: picked.place_id || null,
          google_maps_url: picked.place_id
            ? `https://www.google.com/maps/place/?q=place_id:${picked.place_id}`
            : null,
          check_in: check_in || null,
          check_out: check_out || null,
          booking_source: booking_source || null,
          booking_url: booking_url || null,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["itineraryHome"] }),
      ]);
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
            <PlaceAutocomplete
              value={picked}
              onPick={setPicked}
              placeholder="Hotel, villa, or address"
            />
          </Field>

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
