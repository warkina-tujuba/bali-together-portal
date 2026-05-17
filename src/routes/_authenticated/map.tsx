import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getDashboard, updateMyLocation, stopSharingLocation, listLiveLocations } from "@/lib/trip.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MapPin, Radio } from "lucide-react";

export const Route = createFileRoute("/_authenticated/map")({ component: MapPage });

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoid2Fya2luYXR1anViYSIsImEiOiJjbXA5ZWVvczkwMDU0MnFweHJqN240dDl2In0.GVNQCWU3xPPaal-Yjx0STQ";

type LiveLoc = {
  user_id: string;
  trip_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  accuracy: number | null;
  sharing: boolean;
  updated_at: string;
};

function makeAvatarEl(name: string, avatarUrl: string | null | undefined, live: boolean) {
  const el = document.createElement("div");
  el.style.cssText = `width:44px;height:44px;border-radius:9999px;border:3px solid ${live ? "#22c55e" : "white"};box-shadow:0 4px 14px rgba(0,0,0,.3);background:#D97757;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-family:system-ui;overflow:hidden;${live ? "animation:pulse 2s infinite;" : ""}`;
  if (avatarUrl) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    el.appendChild(img);
  } else {
    el.textContent = (name || "?").charAt(0).toUpperCase();
  }
  return el;
}

function MapPage() {
  const fn = useServerFn(getDashboard);
  const updateLoc = useServerFn(updateMyLocation);
  const stopLoc = useServerFn(stopSharingLocation);
  const listLive = useServerFn(listLiveLocations);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const stayMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const liveMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const watchIdRef = useRef<number | null>(null);

  const [sharing, setSharing] = useState(false);
  const [liveLocs, setLiveLocs] = useState<LiveLoc[]>([]);

  // Init map
  useEffect(() => {
    if (!data?.trip || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const center: [number, number] = [
      data.trip.map_center_lng ?? 115.0875,
      data.trip.map_center_lat ?? -8.829,
    ];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center,
      zoom: data.trip.map_default_zoom ?? 11,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      stayMarkersRef.current = [];
      liveMarkersRef.current.clear();
    };
  }, [data?.trip?.id]);

  // Render stay pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    stayMarkersRef.current.forEach((m) => m.remove());
    stayMarkersRef.current = [];
    const memberById = new Map(data.members.map((m) => [m.id, m]));
    const bounds = new mapboxgl.LngLatBounds();
    let added = 0;
    data.stays
      .filter((s) => s.lat != null && s.lng != null)
      .forEach((s) => {
        const member = memberById.get(s.user_id);
        const el = document.createElement("div");
        el.style.cssText = "width:40px;height:40px;border-radius:9999px;background:white;border:2px solid #D97757;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;";
        el.textContent = "🏠";
        const popup = new mapboxgl.Popup({ offset: 28 }).setHTML(
          `<div style="font-family:system-ui;min-width:180px"><strong>${member?.full_name ?? "Guest"}</strong>'s stay<div style="margin-top:4px">${s.name}</div><div style="opacity:.6;font-size:12px;margin-top:2px">${s.address ?? ""}</div>${s.booking_url ? `<a href="${s.booking_url}" target="_blank" style="display:inline-block;margin-top:6px;color:#D97757;font-size:12px">Open booking ↗</a>` : ""}</div>`,
        );
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([s.lng!, s.lat!])
          .setPopup(popup)
          .addTo(map);
        stayMarkersRef.current.push(marker);
        bounds.extend([s.lng!, s.lat!]);
        added++;
      });
    if (added > 1) map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 600 });
  }, [data]);

  // Fetch initial live locations + subscribe to realtime
  useEffect(() => {
    if (!data?.trip) return;
    let cancelled = false;
    listLive().then((r) => {
      if (!cancelled) setLiveLocs(r.locations as LiveLoc[]);
    });
    const channel = supabase
      .channel("live_locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_locations" },
        (payload) => {
          setLiveLocs((prev) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as LiveLoc;
              return prev.filter((l) => l.user_id !== oldRow.user_id);
            }
            const row = payload.new as LiveLoc;
            const next = prev.filter((l) => l.user_id !== row.user_id);
            if (row.sharing) next.push(row);
            return next;
          });
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [data?.trip?.id]);

  // Render live markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    const memberById = new Map(data.members.map((m) => [m.id, m]));
    const seen = new Set<string>();
    liveLocs.forEach((loc) => {
      seen.add(loc.user_id);
      const existing = liveMarkersRef.current.get(loc.user_id);
      if (existing) {
        existing.setLngLat([loc.lng, loc.lat]);
      } else {
        const member = memberById.get(loc.user_id);
        const el = makeAvatarEl(member?.full_name ?? "?", member?.avatar_url, true);
        const popup = new mapboxgl.Popup({ offset: 28 }).setHTML(
          `<div style="font-family:system-ui"><strong>${member?.full_name ?? "Guest"}</strong><div style="font-size:12px;color:#22c55e">● Live now</div></div>`,
        );
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(popup)
          .addTo(map);
        liveMarkersRef.current.set(loc.user_id, marker);
      }
    });
    // remove markers for users no longer sharing
    liveMarkersRef.current.forEach((marker, uid) => {
      if (!seen.has(uid)) {
        marker.remove();
        liveMarkersRef.current.delete(uid);
      }
    });
  }, [liveLocs, data]);

  // Geolocation watcher
  useEffect(() => {
    if (!sharing) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!("geolocation" in navigator)) {
      alert("Geolocation not supported on this device.");
      setSharing(false);
      return;
    }
    let lastSent = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent < 5000) return; // throttle 5s
        lastSent = now;
        updateLoc({
          data: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            heading: pos.coords.heading ?? null,
            sharing: true,
          },
        }).catch(() => {});
      },
      (err) => {
        console.warn("geolocation error", err);
        alert("Couldn't access your location. Check browser permissions.");
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [sharing]);

  const toggleSharing = async (next: boolean) => {
    setSharing(next);
    if (!next) {
      await stopLoc().catch(() => {});
    }
  };

  if (!data) return <div className="p-10 text-center text-muted-foreground">Loading map…</div>;
  if (!data.trip) return <div className="p-10 text-center text-muted-foreground">No trip.</div>;

  const pinCount = data.stays.filter((s) => s.lat != null && s.lng != null).length;
  const liveCount = liveLocs.length;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <style>{`@keyframes pulse {0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.6),0 4px 14px rgba(0,0,0,.3)} 50%{box-shadow:0 0 0 10px rgba(34,197,94,0),0 4px 14px rgba(0,0,0,.3)}}`}</style>
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 pb-3">
        <div>
          <h1 className="font-display text-3xl">Stay map</h1>
          <p className="text-sm text-muted-foreground">
            <MapPin className="inline h-3.5 w-3.5" /> {pinCount} stays · {data.trip.destination}
            {liveCount > 0 && (
              <span className="ml-2 text-green-600">
                <Radio className="inline h-3.5 w-3.5" /> {liveCount} live
              </span>
            )}
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm shadow-sm">
          <Radio className={`h-4 w-4 ${sharing ? "text-green-600" : "text-muted-foreground"}`} />
          <span>Share my location</span>
          <Switch checked={sharing} onCheckedChange={toggleSharing} />
        </label>
      </div>
      <div ref={containerRef} className="overflow-hidden rounded-3xl shadow-card" style={{ height: "72vh" }} />
      <p className="px-2 pt-2 text-xs text-muted-foreground">
        Live location is only visible to your trip group, and only while this page is open.
      </p>
    </div>
  );
}
