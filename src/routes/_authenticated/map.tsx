import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getDashboard, updateMyLocation, stopSharingLocation, listLiveLocations } from "@/lib/trip.functions";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { MapPin, Radio } from "lucide-react";
import { GoogleMap, type GMapPin, type GMapAvatar } from "@/components/maps/GoogleMap";

export const Route = createFileRoute("/_authenticated/map")({ component: MapPage });

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

function MapPage() {
  const fn = useServerFn(getDashboard);
  const updateLoc = useServerFn(updateMyLocation);
  const stopLoc = useServerFn(stopSharingLocation);
  const listLive = useServerFn(listLiveLocations);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });

  const [sharing, setSharing] = useState(false);
  const [liveLocs, setLiveLocs] = useState<LiveLoc[]>([]);

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
  }, [data?.trip?.id, listLive]);

  // Geolocation watcher
  useEffect(() => {
    if (!sharing) return;
    if (!("geolocation" in navigator)) {
      alert("Geolocation not supported on this device.");
      setSharing(false);
      return;
    }
    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent < 5000) return;
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
    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharing, updateLoc]);

  const toggleSharing = async (next: boolean) => {
    setSharing(next);
    if (!next) await stopLoc().catch(() => {});
  };

  const { pins, avatars, center, zoom } = useMemo(() => {
    const c: [number, number] = [
      data?.trip?.map_center_lng ?? 115.0875,
      data?.trip?.map_center_lat ?? -8.829,
    ];
    const z = data?.trip?.map_default_zoom ?? 11;
    if (!data) return { pins: [] as GMapPin[], avatars: [] as GMapAvatar[], center: c, zoom: z };
    const memberById = new Map(data.members.map((m) => [m.id, m]));
    const pinList: GMapPin[] = data.stays
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => {
        const member = memberById.get(s.user_id);
        return {
          id: s.id,
          lat: s.lat!,
          lng: s.lng!,
          label: `${member?.full_name ?? "Guest"}'s stay`,
          sub: s.name,
          kind: "stay" as const,
        };
      });
    const avatarList: GMapAvatar[] = liveLocs.map((loc) => {
      const member = memberById.get(loc.user_id);
      return {
        user_id: loc.user_id,
        lat: loc.lat,
        lng: loc.lng,
        name: member?.full_name ?? "Guest",
        avatar_url: member?.avatar_url ?? null,
      };
    });
    return { pins: pinList, avatars: avatarList, center: c, zoom: z };
  }, [data, liveLocs]);

  if (!data) return <div className="p-10 text-center text-muted-foreground">Loading map…</div>;
  if (!data.trip) return <div className="p-10 text-center text-muted-foreground">No trip.</div>;

  const liveCount = liveLocs.length;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 pb-3">
        <div>
          <h1 className="font-display text-3xl">Stay map</h1>
          <p className="text-sm text-muted-foreground">
            <MapPin className="inline h-3.5 w-3.5" /> {pins.length} stays · {data.trip.destination}
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
      <div className="overflow-hidden rounded-3xl shadow-card" style={{ height: "72vh" }}>
        <GoogleMap center={center} zoom={zoom} pins={pins} avatars={avatars} />
      </div>
      <p className="px-2 pt-2 text-xs text-muted-foreground">
        Live location is only visible to your trip group, and only while this page is open.
      </p>
    </div>
  );
}
