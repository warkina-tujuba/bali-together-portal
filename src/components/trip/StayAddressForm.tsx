import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, MapPin } from "lucide-react";
import type { StayPayload } from "./StaySearchForm";

type GeoFn = (input: { data: { q: string } }) => Promise<{
  results: Array<{ place_id: string; name: string; address: string; lat: number; lng: number }>;
}>;

const MAPBOX_TOKEN = "pk.eyJ1Ijoid2Fya2luYXR1anViYSIsImEiOiJjbXA5ZWVvczkwMDU0MnFweHJqN240dDl2In0.GVNQCWU3xPPaal-Yjx0STQ";

const KINDS = [
  { id: "villa", label: "Villa", emoji: "🏡" },
  { id: "hotel", label: "Hotel", emoji: "🏨" },
  { id: "apartment", label: "Apartment", emoji: "🏢" },
  { id: "hostel", label: "Hostel", emoji: "🛏️" },
  { id: "resort", label: "Resort", emoji: "🌴" },
  { id: "other", label: "Other", emoji: "📍" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

export function StayAddressForm({ geocode, destinationHint, onSave }: {
  geocode: GeoFn;
  destinationHint?: string | null;
  onSave: (s: StayPayload & { kind: Kind }) => Promise<void>;
}) {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [kind, setKind] = useState<Kind>("villa");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  async function handleResolve() {
    const q = address.trim();
    if (q.length < 3) { toast.error("Add a bit more address detail"); return; }
    setBusy(true);
    try {
      // Try to detect a URL; if so, fall back to using the destination hint as the search
      const urlMatch = q.match(/^https?:\/\//);
      if (urlMatch) {
        setBookingUrl(q);
        const fallback = destinationHint ?? "Bali";
        const r = await geocode({ data: { q: fallback } });
        if (r.results[0]) {
          setCoords({ lat: r.results[0].lat, lng: r.results[0].lng });
          setResolvedAddress(`(Booking link saved — drag the pin to your exact location)`);
        } else {
          toast.error("Couldn't place that link — try pasting the street address instead");
        }
      } else {
        const r = await geocode({ data: { q: destinationHint ? `${q}, ${destinationHint}` : q } });
        const hit = r.results[0];
        if (!hit) { toast.error("No match — try a more specific address"); return; }
        setCoords({ lat: hit.lat, lng: hit.lng });
        setResolvedAddress(hit.address);
        if (!name) setName(hit.name);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't resolve address");
    } finally {
      setBusy(false);
    }
  }

  // Init / update map when coords change
  useEffect(() => {
    if (!coords || !containerRef.current) return;
    if (!mapRef.current) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [coords.lng, coords.lat],
        zoom: 15,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      const el = document.createElement("div");
      el.style.cssText = "width:36px;height:36px;border-radius:9999px;background:white;border:3px solid hsl(var(--primary));display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:grab;";
      el.textContent = "🏠";
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        setCoords({ lat: ll.lat, lng: ll.lng });
      });
      markerRef.current = marker;
      mapRef.current = map;
    } else {
      mapRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 15 });
      markerRef.current?.setLngLat([coords.lng, coords.lat]);
    }
    return () => {
      // Don't remove on rerender; only on unmount via separate effect
    };
  }, [coords]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
    markerRef.current = null;
  }, []);

  async function save() {
    if (!coords) { toast.error("Resolve the address first"); return; }
    if (!name.trim()) { toast.error("Give your stay a name (e.g. 'Villa Anita')"); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        address: resolvedAddress ?? address,
        lat: coords.lat,
        lng: coords.lng,
        check_in: checkIn || undefined,
        check_out: checkOut || undefined,
        booking_url: bookingUrl || undefined,
        kind,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paste your address, a Google Maps link, or your Airbnb / Booking.com URL. We'll drop a pin you can fine-tune.
      </p>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Address or booking link</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleResolve(); } }}
            placeholder="Jl. Pantai Batu Bolong No.51, Canggu"
            className="h-11 rounded-xl"
          />
          <Button onClick={handleResolve} disabled={busy} className="h-11 shrink-0 rounded-xl px-4">
            <Search className="mr-1.5 h-4 w-4" />{busy ? "Finding…" : "Find"}
          </Button>
        </div>
      </div>

      {coords && (
        <>
          <div ref={containerRef} className="overflow-hidden rounded-2xl border border-border" style={{ height: 220 }} />
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> Drag the pin to your exact spot. {resolvedAddress}
          </p>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">What kind of stay?</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${kind === k.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`}
                >
                  <span className="mr-1">{k.emoji}</span>{k.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name this stay</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Villa Anita" className="mt-1.5 h-11 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Check-in</Label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Check-out</Label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
            </div>
          </div>

          <Button onClick={save} disabled={saving || !name.trim()} className="h-12 w-full rounded-xl text-base">
            {saving ? "Saving…" : "Pin it on the map"}
          </Button>
        </>
      )}
    </div>
  );
}
