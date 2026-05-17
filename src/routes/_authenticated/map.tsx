import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/trip.functions";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/_authenticated/map")({ component: MapPage });

function MapPage() {
  const fn = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!data?.trip || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      const center: [number, number] = [data.trip!.map_center_lat ?? -8.829, data.trip!.map_center_lng ?? 115.0875];
      const map = L.map(containerRef.current).setView(center, data.trip!.map_default_zoom ?? 11);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      const memberById = new Map(data.members.map((m) => [m.id, m]));
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:#D97757;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      data.stays
        .filter((s) => s.lat != null && s.lng != null)
        .forEach((s) => {
          L.marker([s.lat!, s.lng!], { icon })
            .addTo(map)
            .bindPopup(
              `<strong>${memberById.get(s.user_id)?.full_name ?? "Guest"}</strong><br/>${s.name}<br/><span style="opacity:.7">${s.address ?? ""}</span>`,
            );
        });
    })();
    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      m?.remove?.();
      mapRef.current = null;
    };
  }, [data]);

  if (!data) return <div className="p-10 text-center text-muted-foreground">Loading map…</div>;
  if (!data.trip) return <div className="p-10 text-center text-muted-foreground">No trip.</div>;

  const pinCount = data.stays.filter((s) => s.lat != null && s.lng != null).length;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <h1 className="px-2 font-display text-3xl">Stay map</h1>
      <p className="px-2 pb-3 text-sm text-muted-foreground">
        {pinCount} villas across {data.trip.destination}
      </p>
      <div ref={containerRef} className="overflow-hidden rounded-3xl shadow-card" style={{ height: "72vh" }} />
    </div>
  );
}
