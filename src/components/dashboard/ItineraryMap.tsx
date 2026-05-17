import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1Ijoid2Fya2luYXR1anViYSIsImEiOiJjbXA5ZWVvczkwMDU0MnFweHJqN240dDl2In0.GVNQCWU3xPPaal-Yjx0STQ";

type Pin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  kind: "stay" | "activity" | "host";
};

export function ItineraryMap({
  center,
  zoom,
  pins,
  focusedId,
}: {
  center: [number, number];
  zoom: number;
  pins: Pin[];
  focusedId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center,
      zoom,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markersRef.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    const bounds = new mapboxgl.LngLatBounds();
    pins.forEach((p) => {
      const el = document.createElement("div");
      const bg = p.kind === "stay" ? "#1B2B21" : p.kind === "host" ? "#D97757" : "#ffffff";
      const fg = p.kind === "stay" || p.kind === "host" ? "#fff" : "#1B2B21";
      const border = p.kind === "activity" ? "#D97757" : "#fff";
      el.style.cssText = `width:36px;height:36px;border-radius:9999px;background:${bg};color:${fg};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;`;
      el.textContent = p.kind === "stay" ? "🏠" : p.kind === "host" ? "👑" : "📍";
      const popup = new mapboxgl.Popup({ offset: 24 }).setHTML(
        `<div style="font-family:system-ui;min-width:160px"><strong>${p.label}</strong>${p.sub ? `<div style="opacity:.7;font-size:12px;margin-top:2px">${p.sub}</div>` : ""}</div>`,
      );
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
      markersRef.current.set(p.id, marker);
      bounds.extend([p.lng, p.lat]);
    });
    if (pins.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 500 });
    else if (pins.length === 1) map.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 13, duration: 500 });
  }, [pins]);

  useEffect(() => {
    if (!focusedId) return;
    const marker = markersRef.current.get(focusedId);
    const map = mapRef.current;
    if (marker && map) {
      const ll = marker.getLngLat();
      map.flyTo({ center: [ll.lng, ll.lat], zoom: 14, duration: 600 });
      marker.togglePopup();
      setTimeout(() => { try { marker.togglePopup(); } catch { /* ignore */ } }, 2500);
    }
  }, [focusedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
