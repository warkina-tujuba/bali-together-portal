/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export type GMapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  kind: "stay" | "activity" | "host";
};

export type GMapAvatar = {
  user_id: string;
  lat: number;
  lng: number;
  name: string;
  avatar_url: string | null;
};

type Props = {
  center: [number, number]; // [lng, lat]
  zoom: number;
  pins: GMapPin[];
  avatars?: GMapAvatar[];
  focusedId?: string | null;
  onPinClick?: (id: string) => void;
  routeCoords?: [number, number][]; // [lng, lat]
  className?: string;
};

const PIN_STYLE: Record<GMapPin["kind"], { bg: string; fg: string; emoji: string }> = {
  stay: { bg: "#1B2B21", fg: "#ffffff", emoji: "🏠" },
  host: { bg: "#D97757", fg: "#ffffff", emoji: "👑" },
  activity: { bg: "#ffffff", fg: "#1B2B21", emoji: "📍" },
};

function pinSvg(kind: GMapPin["kind"]): string {
  const s = PIN_STYLE[kind];
  const stroke = kind === "activity" ? "#D97757" : "#ffffff";
  return (
    `data:image/svg+xml;utf-8,` +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">` +
        `<circle cx="18" cy="18" r="15" fill="${s.bg}" stroke="${stroke}" stroke-width="2"/>` +
        `<text x="18" y="23" text-anchor="middle" font-size="16" font-family="system-ui">${s.emoji}</text>` +
      `</svg>`,
    )
  );
}

export function GoogleMap({
  center,
  zoom,
  pins,
  avatars = [],
  focusedId,
  onPinClick,
  routeCoords,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const avatarMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: { lat: center[1], lng: center[0] },
          zoom,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          clickableIcons: false,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
        infoRef.current = new g.maps.InfoWindow();
      })
      .catch((e) => {
        console.error("[GoogleMap] load failed", e);
        setError("Map unavailable");
      });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();
      avatarMarkersRef.current.forEach((m) => m.setMap(null));
      avatarMarkersRef.current.clear();
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins
  useEffect(() => {
    const map = mapRef.current;
    const g = window.google;
    if (!map || !g) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    const bounds = new g.maps.LatLngBounds();
    pins.forEach((p) => {
      const marker = new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        icon: {
          url: pinSvg(p.kind),
          scaledSize: new g.maps.Size(36, 36),
          anchor: new g.maps.Point(18, 18),
        },
        title: p.label,
      });
      marker.addListener("click", () => {
        if (infoRef.current) {
          infoRef.current.setContent(
            `<div style="font-family:system-ui;min-width:160px"><strong>${p.label}</strong>${
              p.sub ? `<div style="opacity:.7;font-size:12px;margin-top:2px">${p.sub}</div>` : ""
            }</div>`,
          );
          infoRef.current.open({ map, anchor: marker });
        }
        onPinClick?.(p.id);
      });
      markersRef.current.set(p.id, marker);
      bounds.extend({ lat: p.lat, lng: p.lng });
    });

    if (pins.length > 1) {
      map.fitBounds(bounds, 60);
    } else if (pins.length === 1) {
      map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      map.setZoom(13);
    }
  }, [pins, onPinClick]);

  // Avatar markers
  useEffect(() => {
    const map = mapRef.current;
    const g = window.google;
    if (!map || !g) return;
    avatarMarkersRef.current.forEach((m) => m.setMap(null));
    avatarMarkersRef.current.clear();

    avatars.forEach((a) => {
      const svg =
        `data:image/svg+xml;utf-8,` +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">` +
            `<circle cx="23" cy="23" r="22" fill="#ffffff"/>` +
            `<circle cx="23" cy="23" r="19" fill="#1B2B21"/>` +
            `<text x="23" y="28" text-anchor="middle" font-size="14" font-family="system-ui" fill="#fff" font-weight="600">${(a.name?.[0] ?? "?").replace(/[<>&"]/g, "")}</text>` +
          `</svg>`,
        );
      const marker = new g.maps.Marker({
        position: { lat: a.lat, lng: a.lng },
        map,
        icon: {
          url: svg,
          scaledSize: new g.maps.Size(46, 46),
          anchor: new g.maps.Point(23, 23),
        },
        title: a.name,
      });
      marker.addListener("click", () => {
        if (infoRef.current) {
          infoRef.current.setContent(`<div style="font-family:system-ui">${a.name} · just now</div>`);
          infoRef.current.open({ map, anchor: marker });
        }
      });
      avatarMarkersRef.current.set(a.user_id, marker);
    });
  }, [avatars]);

  // Route polyline
  useEffect(() => {
    const map = mapRef.current;
    const g = window.google;
    if (!map || !g) return;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    if (!routeCoords || routeCoords.length < 2) return;
    polylineRef.current = new g.maps.Polyline({
      path: routeCoords.map(([lng, lat]) => ({ lat, lng })),
      geodesic: true,
      strokeColor: "#D97757",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });
  }, [routeCoords]);

  // Focus a pin
  useEffect(() => {
    if (!focusedId) return;
    const map = mapRef.current;
    const marker = markersRef.current.get(focusedId);
    if (!map || !marker) return;
    const pos = marker.getPosition();
    if (pos) {
      map.panTo(pos);
      map.setZoom(14.5);
    }
    if (infoRef.current) {
      const pin = pins.find((p) => p.id === focusedId);
      if (pin) {
        infoRef.current.setContent(
          `<div style="font-family:system-ui;min-width:160px"><strong>${pin.label}</strong>${
            pin.sub ? `<div style="opacity:.7;font-size:12px;margin-top:2px">${pin.sub}</div>` : ""
          }</div>`,
        );
        infoRef.current.open({ map, anchor: marker });
      }
    }
  }, [focusedId, pins]);

  if (error) {
    return (
      <div className={`h-full w-full flex items-center justify-center bg-muted text-sm text-muted-foreground ${className ?? ""}`}>
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}
