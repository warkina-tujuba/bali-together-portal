import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/trip.functions";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/map")({ component: MapPage });

function MapPage() {
  const fn = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const [Map, setMap] = useState<null | typeof import("react-leaflet")>(null);

  useEffect(() => { import("react-leaflet").then(setMap); }, []);

  if (!data || !Map) return <div className="p-10 text-center text-muted-foreground">Loading map…</div>;
  if (!data.trip) return <div className="p-10 text-center text-muted-foreground">No trip.</div>;

  const { MapContainer, TileLayer, Marker, Popup } = Map;
  const center: [number, number] = [data.trip.map_center_lat ?? -8.829, data.trip.map_center_lng ?? 115.0875];

  // pair stays with member name
  const memberById = new Map(data.members.map((m) => [m.id, m]));
  const pins = data.stays.filter((s) => s.lat != null && s.lng != null).map((s) => ({
    ...s, member: memberById.get(s.user_id),
  }));

  // build a colored circle SVG marker
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");
  const pinIcon = L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:#D97757;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25)"></div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <h1 className="px-2 font-display text-3xl">Stay map</h1>
      <p className="px-2 pb-3 text-sm text-muted-foreground">{pins.length} villas across {data.trip.destination}</p>
      <div className="overflow-hidden rounded-3xl shadow-card">
        <MapContainer center={center} zoom={data.trip.map_default_zoom ?? 11} style={{ height: "72vh", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          {pins.map((p) => (
            <Marker key={p.id} position={[p.lat!, p.lng!]} icon={pinIcon}>
              <Popup>
                <strong>{p.member?.full_name ?? "Guest"}</strong>
                <br />{p.name}
                <br /><span style={{ opacity: 0.7 }}>{p.address}</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
