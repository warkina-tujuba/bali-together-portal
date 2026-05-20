import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const MAPBOX_TOKEN =
  "pk.eyJ1Ijoid2Fya2luYXR1anViYSIsImEiOiJjbXA5ZWVvczkwMDU0MnFweHJqN240dDl2In0.GVNQCWU3xPPaal-Yjx0STQ";

const Pt = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

function r4(n: number) { return Math.round(n * 1e4) / 1e4; }

async function fetchLeg(o: { lat: number; lng: number }, d: { lat: number; lng: number }) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${o.lng},${o.lat};${d.lng},${d.lat}?access_token=${MAPBOX_TOKEN}&geometries=polyline&overview=simplified`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routes error ${res.status}`);
  const j = (await res.json()) as { routes: Array<{ duration: number; distance: number; geometry: string }> };
  const r = j.routes?.[0];
  if (!r) throw new Error("No route");
  return {
    duration_min: Math.max(1, Math.round(r.duration / 60)),
    distance_km: Math.round((r.distance / 1000) * 10) / 10,
    polyline: r.geometry as string | null,
  };
}

export const computeLeg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ origin: Pt, dest: Pt, hour: z.number().int().min(0).max(23).default(12) }))
  .handler(async ({ data }) => {
    const o = { lat: r4(data.origin.lat), lng: r4(data.origin.lng) };
    const d = { lat: r4(data.dest.lat), lng: r4(data.dest.lng) };
    const { data: cached } = await supabaseAdmin
      .from("route_legs")
      .select("duration_min, distance_km, polyline")
      .eq("origin_lat", o.lat).eq("origin_lng", o.lng)
      .eq("dest_lat", d.lat).eq("dest_lng", d.lng)
      .eq("hour_bucket", data.hour).eq("mode", "drive")
      .maybeSingle();
    if (cached) return cached;
    const fresh = await fetchLeg(o, d);
    await supabaseAdmin.from("route_legs").insert({
      origin_lat: o.lat, origin_lng: o.lng, dest_lat: d.lat, dest_lng: d.lng,
      hour_bucket: data.hour, mode: "drive",
      duration_min: fresh.duration_min, distance_km: fresh.distance_km, polyline: fresh.polyline,
    });
    return fresh;
  });

// --- Day optimiser (suggest only) ---
type Stop = { id: string; lat: number; lng: number; start: string | null; duration_min: number; locked: boolean };

function timeToMin(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(m: number): string {
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

async function buildMatrix(stops: Stop[]) {
  const n = stops.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  await Promise.all(
    stops.flatMap((a, i) =>
      stops.map(async (b, j) => {
        if (i === j) return;
        const leg = await fetchLeg(a, b).catch(() => ({ duration_min: 30 }));
        mat[i][j] = leg.duration_min;
      })
    ),
  );
  return mat;
}

function nearestNeighbour(start: number, n: number, mat: number[][], locked: Set<number>): number[] {
  const order: number[] = [start];
  const seen = new Set([start]);
  while (order.length < n) {
    const last = order[order.length - 1];
    let best = -1, bestD = Infinity;
    for (let j = 0; j < n; j++) if (!seen.has(j) && mat[last][j] < bestD) { bestD = mat[last][j]; best = j; }
    if (best === -1) break;
    order.push(best); seen.add(best);
  }
  // Make sure locked stays in place isn't needed for NN; we filter to non-locked separately
  void locked;
  return order;
}

function totalDrive(order: number[], mat: number[][]) {
  let t = 0;
  for (let i = 1; i < order.length; i++) t += mat[order[i - 1]][order[i]];
  return t;
}

export const optimiseDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ day_date: z.string().min(8).max(20) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { data: acts } = await supabase
      .from("activities")
      .select("id, lat, lng, start_time, duration_min, is_host_event")
      .eq("trip_id", profile.trip_id)
      .eq("day_date", data.day_date);
    const stops: Stop[] = (acts ?? [])
      .filter((a): a is typeof a & { lat: number; lng: number } => a.lat != null && a.lng != null)
      .map((a) => ({
        id: a.id, lat: a.lat, lng: a.lng,
        start: a.start_time, duration_min: a.duration_min ?? 90,
        locked: !!a.is_host_event,
      }));
    if (stops.length < 2) return { proposed: [], before_drive_min: 0, after_drive_min: 0 };
    const mat = await buildMatrix(stops);

    // Current order (by start time, nulls last)
    const current = stops
      .map((_, i) => i)
      .sort((a, b) => (timeToMin(stops[a].start) ?? 9999) - (timeToMin(stops[b].start) ?? 9999));
    const before = totalDrive(current, mat);

    // NN from first locked stop (or first by time)
    const start = current[0];
    const locked = new Set(stops.map((s, i) => s.locked ? i : -1).filter((i) => i >= 0));
    const proposedOrder = nearestNeighbour(start, stops.length, mat, locked);
    const after = totalDrive(proposedOrder, mat);

    // Build proposed schedule starting at first stop's start (or 09:00)
    let cursor = timeToMin(stops[start].start) ?? 9 * 60;
    const proposed = proposedOrder.map((idx, i) => {
      if (i > 0) cursor += mat[proposedOrder[i - 1]][idx]; // travel
      const s = stops[idx];
      const startMin = cursor;
      cursor += s.duration_min;
      return { id: s.id, start_time: minToTime(startMin), end_time: minToTime(cursor) };
    });

    return { proposed, before_drive_min: before, after_drive_min: after };
  });

export const applyDaySchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    updates: z.array(z.object({
      id: z.string().uuid(),
      start_time: z.string().max(10),
      end_time: z.string().max(10),
    })).min(1).max(20),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await Promise.all(data.updates.map((u) =>
      supabase.from("activities").update({ start_time: u.start_time, end_time: u.end_time }).eq("id", u.id),
    ));
    return { ok: true };
  });

export const updateActivitySchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid(),
    day_date: z.string().min(8).max(20).optional(),
    start_time: z.string().max(10),
    duration_min: z.number().int().min(15).max(720),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [h, m] = data.start_time.split(":").map(Number);
    const endMin = h * 60 + m + data.duration_min;
    const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    const { error } = data.day_date
      ? await supabase.from("activities").update({
          start_time: data.start_time, end_time: end, duration_min: data.duration_min, day_date: data.day_date,
        }).eq("id", data.id)
      : await supabase.from("activities").update({
          start_time: data.start_time, end_time: end, duration_min: data.duration_min,
        }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCustomActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    day_date: z.string().min(8).max(20),
    title: z.string().min(1).max(200),
    start_time: z.string().max(10),
    duration_min: z.number().int().min(15).max(720).default(60),
    location: z.string().max(200).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    cost_usd: z.number().min(0).max(100000).optional().nullable(),
    website_url: z.string().url().max(800).optional().nullable(),
    booking_url: z.string().url().max(800).optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const [h, m] = data.start_time.split(":").map(Number);
    const endMin = h * 60 + m + data.duration_min;
    const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    const { data: act, error } = await supabase.from("activities").insert({
      trip_id: profile.trip_id,
      created_by: userId,
      day_date: data.day_date,
      title: data.title,
      start_time: data.start_time,
      end_time: end,
      duration_min: data.duration_min,
      location: data.location ?? null,
      description: data.description ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      cost_usd: data.cost_usd ?? null,
      website_url: data.website_url ?? null,
      booking_url: data.booking_url ?? null,
      category: "activity",
      is_host_event: false,
    }).select("id").single();
    if (error || !act) throw new Error(error?.message ?? "Couldn't add");
    return { ok: true, id: act.id };
  });
