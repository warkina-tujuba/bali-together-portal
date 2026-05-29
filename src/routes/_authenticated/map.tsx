import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getDashboard, getItinerary, updateMyLocation, stopSharingLocation, listLiveLocations } from "@/lib/trip.functions";
import { computeLeg } from "@/lib/routing.functions";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { MapPin, Radio } from "lucide-react";
import { GoogleMap, type GMapPin, type GMapAvatar } from "@/components/maps/GoogleMap";
import { CrewLayerToggle, type CrewLayer } from "@/components/plan/CrewLayerToggle";
import { cn } from "@/lib/utils";

// Decode Google's encoded polyline format into [lng, lat] pairs
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

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
  const itinFn = useServerFn(getItinerary);
  const updateLoc = useServerFn(updateMyLocation);
  const stopLoc = useServerFn(stopSharingLocation);
  const listLive = useServerFn(listLiveLocations);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const { data: itin } = useQuery({ queryKey: ["itinerary"], queryFn: () => itinFn() });

  const [sharing, setSharing] = useState(false);
  const [liveLocs, setLiveLocs] = useState<LiveLoc[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // null = all stays only
  const [crewLayer, setCrewLayer] = useState<CrewLayer>("both");

  const meId = data?.profile?.id ?? null;

  useEffect(() => {
    if (!data?.trip) return;
    let cancelled = false;
    listLive().then((r) => {
      if (!cancelled) setLiveLocs(r.locations as LiveLoc[]);
    });
    const channel = supabase
      .channel("live_locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations" }, (payload) => {
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
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [data?.trip?.id, listLive]);

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

  // Days available
  const days = useMemo(() => {
    const list = (itin?.days ?? []).slice().sort((a, b) => (a.day_date < b.day_date ? -1 : 1));
    return list;
  }, [itin]);

  const crewCount = useMemo(() => {
    if (!data?.members) return 0;
    return data.members.filter((m) => m.id !== meId).length;
  }, [data, meId]);

  const matchesCrewLayer = (user_id: string) => {
    if (crewLayer === "both") return true;
    const isMe = user_id === meId;
    return crewLayer === "mine" ? isMe : !isMe;
  };

  // Stops for the selected day (sorted by start_time)
  const dayStops = useMemo(() => {
    if (!selectedDay || !itin?.activities) return [];
    return itin.activities
      .filter((a) => a.day_date === selectedDay && a.lat != null && a.lng != null)
      .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
      .map((a) => ({ id: a.id, title: a.title, lat: a.lat as number, lng: a.lng as number, start_time: a.start_time }));
  }, [selectedDay, itin]);

  // Fetch driving polylines between consecutive stops
  const legFn = useServerFn(computeLeg);
  const { data: drivingRoute } = useQuery({
    enabled: dayStops.length >= 2,
    queryKey: ["dayRoute", selectedDay, dayStops.map((s) => s.id)],
    queryFn: async () => {
      const legs = await Promise.all(
        dayStops.slice(0, -1).map((o, i) => {
          const d = dayStops[i + 1];
          return legFn({ data: { origin: { lat: o.lat, lng: o.lng }, dest: { lat: d.lat, lng: d.lng }, hour: 12 } })
            .catch(() => null);
        }),
      );
      const coords: [number, number][] = [];
      legs.forEach((leg, i) => {
        if (leg?.polyline) {
          const pts = decodePolyline(leg.polyline);
          if (i === 0) coords.push(...pts);
          else coords.push(...pts.slice(1));
        } else {
          // fallback straight line for this segment
          const o = dayStops[i], d = dayStops[i + 1];
          if (coords.length === 0) coords.push([o.lng, o.lat]);
          coords.push([d.lng, d.lat]);
        }
      });
      const totalMin = legs.reduce((s, l) => s + (l?.duration_min ?? 0), 0);
      const totalKm = legs.reduce((s, l) => s + Number(l?.distance_km ?? 0), 0);
      return { coords, totalMin, totalKm };
    },
  });

  const { pins, avatars, center, zoom, routeCoords } = useMemo(() => {
    const c: [number, number] = [
      data?.trip?.map_center_lng ?? 115.0875,
      data?.trip?.map_center_lat ?? -8.829,
    ];
    const z = data?.trip?.map_default_zoom ?? 11;
    if (!data) return { pins: [] as GMapPin[], avatars: [] as GMapAvatar[], center: c, zoom: z, routeCoords: undefined as [number, number][] | undefined };
    const memberById = new Map(data.members.map((m) => [m.id, m]));

    const stayPins: GMapPin[] = data.stays
      .filter((s) => s.lat != null && s.lng != null && matchesCrewLayer(s.user_id))
      .map((s) => {
        const member = memberById.get(s.user_id);
        const isMe = s.user_id === meId;
        return {
          id: `stay-${s.id}`,
          lat: s.lat!,
          lng: s.lng!,
          label: isMe ? "My stay" : `${member?.full_name ?? "Crew"}'s base`,
          sub: s.name,
          kind: "stay" as const,
        };
      });

    const activityPins: GMapPin[] = dayStops.map((a, idx) => ({
      id: `act-${a.id}`,
      lat: a.lat,
      lng: a.lng,
      label: `${idx + 1}. ${a.title}`,
      sub: a.start_time ?? undefined,
      kind: "activity" as const,
    }));

    // Prefer real driving polyline; fall back to straight line through stops
    const route: [number, number][] | undefined =
      drivingRoute?.coords && drivingRoute.coords.length > 1
        ? drivingRoute.coords
        : dayStops.length >= 2
          ? dayStops.map((a) => [a.lng, a.lat] as [number, number])
          : undefined;

    const avatarList: GMapAvatar[] = liveLocs
      .filter((loc) => matchesCrewLayer(loc.user_id))
      .map((loc) => {
        const member = memberById.get(loc.user_id);
        return {
          user_id: loc.user_id,
          lat: loc.lat,
          lng: loc.lng,
          name: member?.full_name ?? "Guest",
          avatar_url: member?.avatar_url ?? null,
        };
      });



    return { pins: [...stayPins, ...activityPins], avatars: avatarList, center: c, zoom: z, routeCoords: route };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, liveLocs, dayStops, drivingRoute, crewLayer, meId]);

  if (!data) return <div className="p-10 text-center text-muted-foreground">Loading map…</div>;
  if (!data.trip) return <div className="p-10 text-center text-muted-foreground">No trip.</div>;

  const liveCount = avatars.length;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-2 pb-3">
        <div>
          <h1 className="font-display text-3xl">My Map</h1>
          <p className="text-sm text-muted-foreground">
            <MapPin className="inline h-3.5 w-3.5" /> {pins.filter((p) => p.kind === "stay").length} bases · {data.trip.destination}
            {liveCount > 0 && (
              <span className="ml-2 text-green-600">
                <Radio className="inline h-3.5 w-3.5" /> {liveCount} live
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Controls row: day chips + crew layer + share */}
      <div className="mb-3 flex flex-wrap items-center gap-2 px-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <DayChip active={selectedDay === null} onClick={() => setSelectedDay(null)}>
            All stays
          </DayChip>
          {days.map((d, i) => {
            const date = new Date(d.day_date);
            const label = `Day ${i + 1}`;
            const sub = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
            return (
              <DayChip key={d.id} active={selectedDay === d.day_date} onClick={() => setSelectedDay(d.day_date)}>
                <span className="font-medium">{label}</span>
                <span className="ml-1 text-[10px] opacity-70">{sub}</span>
              </DayChip>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <CrewLayerToggle value={crewLayer} onChange={setCrewLayer} crewCount={crewCount} />
          <label className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm">
            <Radio className={`h-3.5 w-3.5 ${sharing ? "text-green-600" : "text-muted-foreground"}`} />
            <span>Share live</span>
            <Switch checked={sharing} onCheckedChange={toggleSharing} />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl shadow-card" style={{ height: "70vh" }}>
        <GoogleMap center={center} zoom={zoom} pins={pins} avatars={avatars} routeCoords={routeCoords} />
      </div>
      <p className="px-2 pt-2 text-xs text-muted-foreground">
        {selectedDay
          ? "Showing the day's route between activities, plus bases for your selected crew layer."
          : "Showing bases for your selected crew layer. Pick a day above to see that day's route."}
        {" "}Live location is only visible to your trip group, and only while this page is open.
      </p>
    </div>
  );
}

function DayChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
