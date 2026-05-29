import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export type SeedCard = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  image_url: string | null;
  url: string | null;
  est_cost_usd: number | null;
  est_duration_min: number | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number;
  price_band: number;
  distance_km?: number | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  google_address: string | null;
};

const FilterSchema = z.object({
  tags: z.array(z.string().max(40)).max(20).default([]),
  categories: z.array(z.string().max(40)).max(20).default([]),
  max_price: z.number().int().min(1).max(4).optional(),
  max_duration_min: z.number().int().min(15).max(720).optional(),
  near: z.object({ lat: z.number(), lng: z.number() }).optional(),
  query: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(120).default(60),
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

export const listDiscover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => FilterSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    let slug = "bali";
    let stayCenter: { lat: number; lng: number } | null = null;
    if (profile?.trip_id) {
      const [{ data: trip }, { data: stays }] = await Promise.all([
        supabase.from("trips").select("destination").eq("id", profile.trip_id).maybeSingle(),
        supabase.from("accommodations").select("lat,lng").eq("trip_id", profile.trip_id).limit(1),
      ]);
      if (trip?.destination) slug = trip.destination.toLowerCase().split(",")[0].trim().replace(/\s+/g, "-");
      const stay = stays?.[0];
      if (stay?.lat != null && stay?.lng != null) stayCenter = { lat: stay.lat, lng: stay.lng };
    }
    const { data: seeds } = await supabase
      .from("activity_seeds")
      .select("*")
      .in("destination_slug", [slug, "bali"])
      .limit(200);

    const near = data.near ?? stayCenter;
    let items: SeedCard[] = (seeds ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      category: s.category,
      tags: (s.tags as string[] | null) ?? [],
      image_url: s.image_url,
      url: s.url,
      est_cost_usd: s.est_cost_usd as number | null,
      est_duration_min: s.est_duration_min,
      lat: s.lat,
      lng: s.lng,
      rating: (s.rating as number | null) ?? null,
      review_count: s.review_count ?? 0,
      price_band: s.price_band ?? 2,
      distance_km: near && s.lat != null && s.lng != null ? haversineKm(near, { lat: s.lat, lng: s.lng }) : null,
    }));

    if (data.query) {
      const q = data.query.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
    }
    if (data.categories.length) items = items.filter((i) => data.categories.includes(i.category));
    if (data.tags.length) items = items.filter((i) => data.tags.some((t) => i.tags.includes(t)));
    if (data.max_price) items = items.filter((i) => i.price_band <= data.max_price!);
    if (data.max_duration_min) items = items.filter((i) => (i.est_duration_min ?? 0) <= data.max_duration_min!);

    items.sort((a, b) => {
      if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    return { items: items.slice(0, data.limit) };
  });

export const addSeedToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      seed_id: z.string().uuid(),
      day_date: z.string().min(8).max(20).optional().nullable(),
      start_time: z.string().max(10).optional().nullable(),
      scope: z.enum(["personal", "shared"]).default("personal"),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("trip_id").eq("id", userId).maybeSingle();
    if (!profile?.trip_id) throw new Error("No trip");
    const { data: seed } = await supabaseAdmin.from("activity_seeds").select("*").eq("id", data.seed_id).maybeSingle();
    if (!seed) throw new Error("Activity not found");

    const parked = !data.day_date;
    const dayDate = data.day_date ?? new Date().toISOString().slice(0, 10);
    const start = data.start_time ?? "09:00";
    const duration = seed.est_duration_min ?? 90;
    const [h, m] = start.split(":").map(Number);
    const endMin = h * 60 + m + duration;
    const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    const { data: act, error } = await supabaseAdmin.from("activities").insert({
      trip_id: profile.trip_id,
      created_by: userId,
      owner_user_id: userId,
      day_date: dayDate,
      start_time: parked ? null : start,
      end_time: parked ? null : end,
      duration_min: duration,
      title: seed.title,
      description: seed.description,
      location: null,
      lat: seed.lat,
      lng: seed.lng,
      image_url: seed.image_url,
      cost_usd: seed.est_cost_usd,
      website_url: seed.url,
      category: seed.category as never,
      tags: seed.tags,
      scope: data.scope as never,
      is_host_event: false,
      parked,
    }).select("id").single();
    if (error || !act) throw new Error(error?.message ?? "Couldn't add");
    return { ok: true, id: act.id, parked };
  });
