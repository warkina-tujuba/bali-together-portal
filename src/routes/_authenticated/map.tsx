import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/trip.functions";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/map")({ component: MapPage });

function MapPage() {
  const fn = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!data) return <div className="p-10 text-center text-muted-foreground">Loading map…</div>;
  if (!data.trip) return <div className="p-10 text-center text-muted-foreground">No trip.</div>;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <h1 className="px-2 font-display text-3xl">Stay map</h1>
      <p className="px-2 pb-3 text-sm text-muted-foreground">
        {data.stays.filter((s) => s.lat != null && s.lng != null).length} villas across {data.trip.destination}
      </p>
      <div className="overflow-hidden rounded-3xl shadow-card" style={{ height: "72vh" }}>
        {mounted && <LeafletMap data={data} />}
      </div>
    </div>
  );
}

function LeafletMap({ data }: { data: { trip: { map_center_lat: number | null; map_center_lng: number | null; map_default_zoom: number | null }; stays: Array<{ id: string; lat: number | null; lng: number | null; name: string; address: string | null; user_id: string }>; members: Array<{ id: string; full_name: string | null }> } }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MapContainer, TileLayer, Marker, Popup } = require("react-leaflet") as typeof import("react-leaflet");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");

  const center: [number, number] = [data.trip.map_center_lat ?? -8.829, data.trip.map_center_lng ?? 115.0875];
  const memberById = new Map(data.members.map((m) => [m.id, m]));
  const pins = data.stays.filter((s) => s.lat != null && s.lng != null);
  const pinIcon = L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:#D97757;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25)"></div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });

  return (
    <MapContainer center={center} zoom={data.trip.map_default_zoom ?? 11} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap contributors' />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat!, p.lng!]} icon={pinIcon}>
          <Popup>
            <strong>{memberById.get(p.user_id)?.full_name ?? "Guest"}</strong>
            <br />{p.name}
            <br /><span style={{ opacity: 0.7 }}>{p.address}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
