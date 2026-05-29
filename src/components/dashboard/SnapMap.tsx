import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

export type SnapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  kind: "stay" | "activity" | "host";
};
export type SnapAvatar = {
  user_id: string;
  lat: number;
  lng: number;
  name: string;
  avatar_url: string | null;
};

export function SnapMap({
  center,
  zoom,
  pins,
  avatars = [],
  focusedId,
  onPinClick,
  routeCoords,
}: {
  center: [number, number];
  zoom: number;
  pins: SnapPin[];
  avatars?: SnapAvatar[];
  focusedId?: string | null;
  onPinClick?: (id: string) => void;
  routeCoords?: [number, number][]; // [lng,lat]
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const avatarMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markersRef.current.clear(); avatarMarkersRef.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    const bounds = new mapboxgl.LngLatBounds();
    pins.forEach((p) => {
      const el = document.createElement("div");
      const bg = p.kind === "stay" ? "#1B2B21" : p.kind === "host" ? "#D97757" : "#ffffff";
      const fg = p.kind === "activity" ? "#1B2B21" : "#fff";
      const border = p.kind === "activity" ? "#D97757" : "#fff";
      el.style.cssText = `width:34px;height:34px;border-radius:9999px;background:${bg};color:${fg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 6px 16px rgba(0,0,0,.25);cursor:pointer;transform:translateY(0);transition:transform .15s ease;`;
      el.textContent = p.kind === "stay" ? "🏠" : p.kind === "host" ? "👑" : "📍";
      el.onmouseenter = () => { el.style.transform = "translateY(-2px) scale(1.05)"; };
      el.onmouseleave = () => { el.style.transform = "translateY(0) scale(1)"; };
      el.onclick = () => onPinClick?.(p.id);
      const popup = new mapboxgl.Popup({ offset: 22 }).setHTML(
        `<div style="font-family:system-ui;min-width:160px"><strong>${p.label}</strong>${p.sub ? `<div style="opacity:.7;font-size:12px;margin-top:2px">${p.sub}</div>` : ""}</div>`,
      );
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
      markersRef.current.set(p.id, marker);
      bounds.extend([p.lng, p.lat]);
    });
    if (pins.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    else if (pins.length === 1) map.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 13, duration: 600 });
  }, [pins, onPinClick]);

  // Snap-style avatar markers with pulse
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    avatarMarkersRef.current.forEach((m) => m.remove());
    avatarMarkersRef.current.clear();
    avatars.forEach((a) => {
      const wrap = document.createElement("div");
      wrap.style.cssText = `position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;`;
      wrap.innerHTML = `
        <span style="position:absolute;inset:-4px;border-radius:9999px;background:#D9775733;animation:tl-pulse 2s ease-out infinite;"></span>
        <span style="position:absolute;inset:0;border-radius:9999px;background:#fff;padding:2px;box-shadow:0 4px 14px rgba(0,0,0,.25);"></span>
        <span style="position:relative;width:38px;height:38px;border-radius:9999px;overflow:hidden;background:#1B2B21;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;">
          ${a.avatar_url ? `<img src="${a.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover" />` : (a.name?.[0] ?? "?")}
        </span>`;
      const popup = new mapboxgl.Popup({ offset: 24 }).setText(`${a.name} · just now`);
      const m = new mapboxgl.Marker({ element: wrap }).setLngLat([a.lng, a.lat]).setPopup(popup).addTo(map);
      avatarMarkersRef.current.set(a.user_id, m);
    });
  }, [avatars]);

  useEffect(() => {
    if (!focusedId) return;
    const marker = markersRef.current.get(focusedId);
    const map = mapRef.current;
    if (marker && map) {
      const ll = marker.getLngLat();
      map.flyTo({ center: [ll.lng, ll.lat], zoom: 14.5, duration: 600 });
      marker.togglePopup();
      setTimeout(() => { try { marker.togglePopup(); } catch { /* ignore */ } }, 2200);
    }
  }, [focusedId]);

  return (
    <>
      <style>{`@keyframes tl-pulse { 0% { transform: scale(0.9); opacity: 0.7 } 80% { transform: scale(1.5); opacity: 0 } 100% { opacity: 0 } }`}</style>
      <div ref={containerRef} className="h-full w-full" />
    </>
  );
}
