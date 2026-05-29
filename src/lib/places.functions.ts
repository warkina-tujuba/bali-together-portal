import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  placeDetails,
  placeAutocomplete,
  placeSearchText,
  TTL,
  isStale,
  type PlaceDetailsRaw,
} from "@/lib/google-maps.server";

const PlaceIdSchema = z.string().min(1).max(255);

type GoogleCachePayload = {
  google_place_id: string;
  google_maps_url: string | null;
  cached_google_rating: number | null;
  cached_google_review_count: number | null;
  cached_google_reviews: PlaceDetailsRaw["reviews"] | null;
  cached_google_photo_url: string | null;
  cached_google_address: string | null;
  cached_google_opening_hours: PlaceDetailsRaw["regularOpeningHours"] | null;
  cached_google_website_url: string | null;
  google_data_last_refreshed_at: string;
  lat?: number | null;
  lng?: number | null;
};

function rawToCache(placeId: string, raw: PlaceDetailsRaw): GoogleCachePayload {
  const firstPhoto = raw.photos?.[0]?.name ?? null;
  return {
    google_place_id: placeId,
    google_maps_url: raw.googleMapsUri ?? null,
    cached_google_rating: raw.rating ?? null,
    cached_google_review_count: raw.userRatingCount ?? null,
    cached_google_reviews: raw.reviews ?? null,
    cached_google_photo_url: firstPhoto ? `/api/public/place-photo?name=${encodeURIComponent(firstPhoto)}&w=800` : null,
    cached_google_address: raw.formattedAddress ?? null,
    cached_google_opening_hours: raw.regularOpeningHours ?? null,
    cached_google_website_url: raw.websiteUri ?? null,
    google_data_last_refreshed_at: new Date().toISOString(),
    lat: raw.location?.latitude ?? null,
    lng: raw.location?.longitude ?? null,
  };
}

/**
 * Get place details, using cached row data when fresh.
 * `table` = 'activities' | 'activity_seeds'. Writes the cache back to that row.
 */
export const getPlaceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      placeId: PlaceIdSchema,
      level: z.enum(["card", "detail"]).default("card"),
      table: z.enum(["activities", "activity_seeds"]).optional(),
      rowId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    // Try cache first if a row was specified
    if (data.table && data.rowId) {
      const { data: row } = await supabaseAdmin
        .from(data.table)
        .select(
          "google_place_id, google_maps_url, cached_google_rating, cached_google_review_count, cached_google_reviews, cached_google_photo_url, cached_google_address, cached_google_opening_hours, cached_google_website_url, google_data_last_refreshed_at",
        )
        .eq("id", data.rowId)
        .maybeSingle();
      if (row && row.google_place_id === data.placeId) {
        const ttl = data.level === "detail" ? TTL.reviews : TTL.rating;
        if (!isStale(row.google_data_last_refreshed_at, ttl)) {
          return { cached: true, data: row };
        }
      }
    }
    const raw = await placeDetails(data.placeId, data.level);
    const payload = rawToCache(data.placeId, raw);
    if (data.table && data.rowId) {
      const updateBody: Record<string, unknown> = { ...payload };
      if (data.table === "activities" || data.table === "activity_seeds") {
        const { data: existing } = await supabaseAdmin.from(data.table).select("lat, lng").eq("id", data.rowId).maybeSingle();
        if (existing?.lat != null) delete updateBody.lat;
        if (existing?.lng != null) delete updateBody.lng;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabaseAdmin.from(data.table).update(updateBody as any).eq("id", data.rowId);
    }
    return { cached: false, data: payload };
  });

export const refreshActivityGoogleData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      activityId: z.string().uuid().optional(),
      seedId: z.string().uuid().optional(),
      placeId: PlaceIdSchema,
    }),
  )
  .handler(async ({ data }) => {
    const raw = await placeDetails(data.placeId, "detail");
    const payload = rawToCache(data.placeId, raw);
    const table = data.activityId ? "activities" : "activity_seeds";
    const id = data.activityId ?? data.seedId;
    if (!id) throw new Error("activityId or seedId required");
    const { error } = await supabaseAdmin.from(table).update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchPlacesAutocomplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      input: z.string().min(1).max(200),
      sessionToken: z.string().min(1).max(128).optional(),
      types: z.array(z.string().min(1).max(50)).max(10).optional(),
      bias: z.object({ lat: z.number(), lng: z.number(), radiusM: z.number().int().min(100).max(500000).optional() }).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const suggestions = await placeAutocomplete(data.input, {
      sessionToken: data.sessionToken,
      types: data.types,
      locationBias: data.bias,
    });
    return {
      suggestions: suggestions
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
        .map((p) => ({
          place_id: p.placeId,
          main_text: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
          secondary_text: p.structuredFormat?.secondaryText?.text ?? "",
          full_text: p.text?.text ?? "",
          types: p.types ?? [],
        })),
    };
  });

export const searchPlacesByText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      query: z.string().min(1).max(200),
      bias: z.object({ lat: z.number(), lng: z.number(), radiusM: z.number().int().min(100).max(500000).optional() }).optional(),
      maxResults: z.number().int().min(1).max(20).default(10),
    }),
  )
  .handler(async ({ data }) => {
    const places = await placeSearchText(data.query, { locationBias: data.bias, maxResults: data.maxResults });
    return {
      results: places.map((p) => ({
        place_id: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
        rating: p.rating ?? null,
        review_count: p.userRatingCount ?? null,
      })),
    };
  });
