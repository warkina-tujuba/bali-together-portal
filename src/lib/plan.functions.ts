import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { differenceInCalendarDays, addDays, format } from "date-fns";

const placeSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).nullish(),
  place_id: z.string().max(200).nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
});

const finalizeSchema = z.object({
  draft: z.object({
    destination: placeSchema,
    start_date: z.string().nullish(),
    end_date: z.string().nullish(),
    duration_days: z.number().int().min(1).max(60).nullish(),
    dates_flexible: z.boolean().default(false),
    places: z.array(placeSchema.extend({
      nights: z.number().int().min(1).max(60).nullish(),
      start_date: z.string().nullish(),
      end_date: z.string().nullish(),
    })).max(40),
    stays: z.array(placeSchema.extend({
      check_in: z.string().nullish(),
      check_out: z.string().nullish(),
      booking_url: z.string().nullish(),
      booking_source: z.string().nullish(),
    })).max(20),
    arrival: z.object({
      flight_number: z.string().max(20).nullish(),
      airline: z.string().max(120).nullish(),
      airline_iata: z.string().max(6).nullish(),
      scheduled_at: z.string().max(60).nullish(),
      origin_iata: z.string().max(6).nullish(),
      origin_city: z.string().max(120).nullish(),
      destination_iata: z.string().max(6).nullish(),
      destination_city: z.string().max(120).nullish(),
    }).nullish(),
    vibe: z.object({
      adventure: z.number().int().min(0).max(100),
      culture: z.number().int().min(0).max(100),
      budget: z.number().int().min(0).max(100),
      foodie: z.number().int().min(0).max(100),
      pace: z.number().int().min(0).max(100),
    }).nullish(),
  }),
  profile: z.object({
    full_name: z.string().min(1).max(120),
    avatar_url: z.string().max(4000).nullish(),
    marker_colour: z.string().max(20).nullish(),
  }),
});

export const finalizeTripDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(finalizeSchema)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const d = data.draft;

    // 1. Trip
    const dest = d.destination;
    const city = dest.name.split(",")[0]?.trim() || dest.name;
    let duration = d.duration_days ?? null;
    let endDate = d.end_date ?? null;
    if (d.start_date && d.end_date) {
      duration = differenceInCalendarDays(new Date(d.end_date), new Date(d.start_date)) + 1;
    } else if (d.start_date && duration && !endDate) {
      endDate = format(addDays(new Date(d.start_date), duration - 1), "yyyy-MM-dd");
    }

    const { data: trip, error: tripErr } = await supabaseAdmin.from("trips").insert({
      name: `Trip to ${city}`,
      destination: dest.name,
      occasion: "just-because",
      start_date: d.start_date ?? null,
      end_date: endDate,
      duration_days: duration,
      duration_nights: duration ? Math.max(0, duration - 1) : null,
      dates_flexible: d.dates_flexible,
      destination_place_id: dest.place_id ?? null,
      destination_lat: dest.lat ?? null,
      destination_lng: dest.lng ?? null,
      map_center_lat: dest.lat ?? null,
      map_center_lng: dest.lng ?? null,
      is_active: true,
    }).select("*").single();
    if (tripErr || !trip) throw new Error(tripErr?.message ?? "Couldn't create trip");
    const tripId = trip.id;

    // 2. Profile
    await supabaseAdmin.from("profiles").update({
      trip_id: tripId,
      full_name: data.profile.full_name,
      avatar_url: data.profile.avatar_url ?? null,
      uploaded_avatar_url: data.profile.avatar_url ?? null,
      marker_colour: data.profile.marker_colour ?? null,
      onboarding_complete: true,
      onboarding_step: 6,
    }).eq("id", userId);

    // 3. Host role
    await supabaseAdmin.from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    // 4. Stays
    if (d.stays.length) {
      await supabaseAdmin.from("accommodations").insert(
        d.stays.map((s) => ({
          trip_id: tripId,
          user_id: userId,
          name: s.name,
          address: s.address ?? null,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
          google_place_id: s.place_id ?? null,
          place_id: s.place_id ?? null,
          check_in: s.check_in ?? null,
          check_out: s.check_out ?? null,
          booking_url: s.booking_url ?? null,
          booking_source: s.booking_source ?? null,
        })),
      );
    }

    // 5. Planned places
    if (d.places.length) {
      await supabaseAdmin.from("planned_places").insert(
        d.places.map((p, i) => ({
          trip_id: tripId,
          created_by: userId,
          name: p.name,
          address: p.address ?? null,
          google_place_id: p.place_id ?? null,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          nights: p.nights ?? null,
          start_date: p.start_date ?? null,
          end_date: p.end_date ?? null,
          sort_index: i,
          source: "google_places",
        })),
      );
    }

    // 6. Arrival flight
    if (d.arrival?.flight_number) {
      await supabaseAdmin.from("flights").insert({
        trip_id: tripId,
        user_id: userId,
        direction: "arrival",
        flight_number: d.arrival.flight_number,
        airline: d.arrival.airline ?? null,
        airline_iata: d.arrival.airline_iata ?? null,
        scheduled_at: d.arrival.scheduled_at ?? null,
        origin_iata: d.arrival.origin_iata ?? null,
        origin_city: d.arrival.origin_city ?? null,
        destination_iata: d.arrival.destination_iata ?? null,
        destination_city: d.arrival.destination_city ?? null,
      });
    }

    // 7. Vibe preferences
    if (d.vibe) {
      await supabaseAdmin.from("trip_preferences").insert({
        trip_id: tripId,
        created_by: userId,
        vibes: [
          d.vibe.adventure > 60 ? "adventure" : d.vibe.adventure < 40 ? "relax" : "balanced",
          d.vibe.culture > 60 ? "culture" : d.vibe.culture < 40 ? "party" : "mixed",
          d.vibe.foodie > 60 ? "foodie" : "casual-bites",
        ],
        must_do: [],
        avoid: [],
        pace: Math.max(1, Math.min(5, Math.round((d.vibe.pace / 100) * 4) + 1)),
        budget: d.vibe.budget > 66 ? 3 : d.vibe.budget > 33 ? 2 : 1,
      });
    }

    // 8. Day shells
    const dayCount = duration ?? 0;
    if (dayCount > 0) {
      const anchor = d.start_date ? new Date(d.start_date) : new Date();
      const placeNames = d.places.map((p) => p.name);
      const rows = Array.from({ length: dayCount }).map((_, i) => {
        const date = format(addDays(anchor, i), "yyyy-MM-dd");
        let title = "Explore";
        let prompt: string | null = null;
        if (i === 0) {
          title = "Arrival & settle in";
          prompt = d.arrival?.flight_number
            ? `Land on flight ${d.arrival.flight_number} — settle into ${d.stays[0]?.name ?? city}.`
            : `Arrive in ${city} — get your bearings and unpack.`;
        } else if (i === dayCount - 1) {
          title = "Departure";
          prompt = "Last morning — pack, brunch, head out.";
        } else if (placeNames.length) {
          const area = placeNames[(i - 1) % placeNames.length];
          title = `Explore ${area}`;
          prompt = `Spend the day around ${area} — food, walking, local discovery.`;
        } else {
          title = `Day ${i + 1}`;
          prompt = "Food, beach, or local discovery — fill this in.";
        }
        return {
          trip_id: tripId,
          day_date: date,
          title,
          prompt,
          sort_index: i,
          is_placeholder: true,
        };
      });
      await supabaseAdmin.from("itinerary_days").insert(rows);
    }

    return { tripId };
  });

export const uploadProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    base64: z.string().min(10).max(8_000_000),
    contentType: z.string().regex(/^image\/(png|jpe?g|webp)$/),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const ext = data.contentType.includes("png") ? "png" : data.contentType.includes("webp") ? "webp" : "jpg";
    const path = `${userId}/avatar.${ext}`;
    const buf = Buffer.from(data.base64, "base64");
    const { error } = await supabaseAdmin.storage.from("profile-photos").upload(path, buf, {
      contentType: data.contentType,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("profile-photos").getPublicUrl(path);
    return { url: `${pub.publicUrl}?v=${Date.now()}` };
  });
