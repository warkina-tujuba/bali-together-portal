// Server-only Google Maps Platform helpers.
// Routes through the Lovable connector gateway (Lovable-managed Google Maps).
// Never import this from client code.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!gmapsKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gmapsKey,
    ...extra,
  };
}

// ---------- Places API (New) ----------

export type PlaceDetailsLevel = "card" | "detail";

const CARD_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "photos",
].join(",");

const DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "websiteUri",
  "regularOpeningHours",
  "reviews",
  "photos",
  "primaryType",
  "editorialSummary",
].join(",");

export type PlaceDetailsRaw = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[]; openNow?: boolean };
  reviews?: Array<{
    name?: string;
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string; photoUri?: string };
  }>;
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
  primaryType?: string;
  editorialSummary?: { text?: string };
};

export async function placeDetails(
  placeId: string,
  level: PlaceDetailsLevel = "card",
): Promise<PlaceDetailsRaw> {
  const url = `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: authHeaders({
      "X-Goog-FieldMask": level === "detail" ? DETAIL_FIELDS : CARD_FIELDS,
    }),
  });
  if (!res.ok) throw new Error(`Places details ${res.status}: ${await res.text()}`);
  return (await res.json()) as PlaceDetailsRaw;
}

export function placePhotoUrl(photoName: string, maxWidthPx = 800): string {
  // Returns a server-side proxy URL the browser can hit safely (see /api/public/place-photo).
  return `/api/public/place-photo?name=${encodeURIComponent(photoName)}&w=${maxWidthPx}`;
}

export async function placePhotoRedirect(photoName: string, maxWidthPx = 800): Promise<string> {
  const url = `${GATEWAY_URL}/places/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Photo ${res.status}`);
  const j = (await res.json()) as { photoUri?: string };
  if (!j.photoUri) throw new Error("No photoUri");
  return j.photoUri;
}

export type AutocompleteSuggestion = {
  placePrediction?: {
    placeId: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
    types?: string[];
  };
};

export async function placeAutocomplete(
  input: string,
  opts: { sessionToken?: string; types?: string[]; locationBias?: { lat: number; lng: number; radiusM?: number } } = {},
): Promise<AutocompleteSuggestion[]> {
  const body: Record<string, unknown> = { input };
  if (opts.sessionToken) body.sessionToken = opts.sessionToken;
  if (opts.types?.length) body.includedPrimaryTypes = opts.types;
  if (opts.locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.locationBias.lat, longitude: opts.locationBias.lng },
        radius: opts.locationBias.radiusM ?? 50000,
      },
    };
  }
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Autocomplete ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { suggestions?: AutocompleteSuggestion[] };
  return j.suggestions ?? [];
}

export type TextSearchPlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
};

export async function placeSearchText(
  query: string,
  opts: { locationBias?: { lat: number; lng: number; radiusM?: number }; maxResults?: number } = {},
): Promise<TextSearchPlace[]> {
  const body: Record<string, unknown> = { textQuery: query, maxResultCount: opts.maxResults ?? 10 };
  if (opts.locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.locationBias.lat, longitude: opts.locationBias.lng },
        radius: opts.locationBias.radiusM ?? 50000,
      },
    };
  }
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount",
    }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Text search ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { places?: TextSearchPlace[] };
  return j.places ?? [];
}

// ---------- Routes API ----------

export type RouteMode = "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";

export async function computeRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  mode: RouteMode = "DRIVE",
): Promise<{ duration_min: number; distance_km: number; polyline: string | null }> {
  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
    travelMode: mode,
    routingPreference: mode === "DRIVE" ? "TRAFFIC_AWARE" : undefined,
    polylineQuality: "OVERVIEW",
  };
  const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Routes ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as {
    routes?: Array<{ duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string } }>;
  };
  const r = j.routes?.[0];
  if (!r) throw new Error("No route");
  const secs = parseInt(String(r.duration ?? "0").replace(/s$/, ""), 10) || 0;
  return {
    duration_min: Math.max(1, Math.round(secs / 60)),
    distance_km: Math.round(((r.distanceMeters ?? 0) / 1000) * 10) / 10,
    polyline: r.polyline?.encodedPolyline ?? null,
  };
}

// ---------- Geocoding ----------

export async function geocode(address: string): Promise<{ lat: number; lng: number; formatted: string; place_id: string } | null> {
  const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    results?: Array<{
      formatted_address: string;
      place_id: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };
  const r = j.results?.[0];
  if (!r) return null;
  return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatted: r.formatted_address, place_id: r.place_id };
}

// ---------- Cache TTLs (in ms) ----------

export const TTL = {
  rating: 7 * 24 * 60 * 60 * 1000,
  reviews: 7 * 24 * 60 * 60 * 1000,
  photos: 7 * 24 * 60 * 60 * 1000,
  address: 30 * 24 * 60 * 60 * 1000,
  hours: 24 * 60 * 60 * 1000,
};

export function isStale(refreshedAt: string | null | undefined, ttlMs: number): boolean {
  if (!refreshedAt) return true;
  return Date.now() - new Date(refreshedAt).getTime() > ttlMs;
}
