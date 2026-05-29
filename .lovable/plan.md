# Google Maps Platform Migration — Phased Plan

Massive scope. Splitting into 5 phases so each is reviewable and shippable. Phase 1 must land before any UI changes.

## Decisions made for you
- **Server key**: `GOOGLE_MAPS_SERVER_API_KEY` — saved as runtime secret ✅
- **Browser key**: Lovable blocks user-defined `VITE_*` secrets. Since the browser key is referrer-restricted (safe to embed, same pattern as current `MAPBOX_TOKEN`), I'll create `src/lib/google-maps.ts` with the key as a `const`. You paste it once when you review Phase 2. If you'd rather, you can add it as a non-VITE secret (`GOOGLE_MAPS_BROWSER_API_KEY`) and I'll wire it via a small `/api/public/maps-config` route — slower, more roundtrips.
- **No connector**: per your choice. You manage referrer allowlists in Google Cloud Console (include `*.lovable.app`, `warkina.com`, `*.warkina.com`).

---

## Phase 1 — Data model & server foundation

**Migration** (`supabase--migration`):

```sql
ALTER TABLE public.activities ADD COLUMN
  google_place_id text,
  google_maps_url text,
  cached_google_rating numeric,
  cached_google_review_count integer,
  cached_google_reviews jsonb,
  cached_google_photo_url text,
  cached_google_address text,
  cached_google_opening_hours jsonb,
  cached_google_website_url text,
  google_data_last_refreshed_at timestamptz;

ALTER TABLE public.activity_seeds ADD COLUMN
  google_place_id text,
  google_maps_url text,
  cached_google_rating numeric,
  cached_google_review_count integer,
  cached_google_reviews jsonb,
  cached_google_photo_url text,
  cached_google_address text,
  cached_google_opening_hours jsonb,
  cached_google_website_url text,
  google_data_last_refreshed_at timestamptz;

ALTER TABLE public.accommodations ADD COLUMN
  google_place_id text,
  google_maps_url text;

ALTER TABLE public.activities ADD COLUMN
  booking_status text DEFAULT 'not_booked'
    CHECK (booking_status IN ('not_booked','need_to_book','booked')),
  confirmation_number text,
  travel_time_from_previous integer,
  distance_from_previous numeric,
  end_time_override time;

-- Flights: add manual-entry fields
ALTER TABLE public.flights ADD COLUMN
  booking_reference text,
  notes text,
  origin_airport_place_id text,
  destination_airport_place_id text;

CREATE INDEX IF NOT EXISTS idx_activities_google_place_id ON public.activities(google_place_id);
CREATE INDEX IF NOT EXISTS idx_activity_seeds_google_place_id ON public.activity_seeds(google_place_id);
```

Existing `route_legs` table already supports route caching — reused.

**New server files** (all under `src/lib/`, server key only):
- `src/lib/google-maps.server.ts` — fetch helpers: `placeDetails(placeId, fields)`, `placeAutocomplete(input, sessionToken)`, `placeSearchText(q)`, `computeRoute({origin,destination,mode})`, `geocode(address)`, `placePhoto(name, maxWidth)`.
  - All call `https://places.googleapis.com/v1/...`, `https://routes.googleapis.com/...`, `https://maps.googleapis.com/maps/api/geocode/json`.
  - Header: `X-Goog-Api-Key: process.env.GOOGLE_MAPS_SERVER_API_KEY` + `X-Goog-FieldMask`.
- `src/lib/places.functions.ts` (`createServerFn`):
  - `getPlaceDetails({ placeId, level: 'card'|'detail' })` — checks cache first, refreshes if stale per your TTLs (rating/reviews/photos 7d, address/coords 30d, hours 24h).
  - `refreshActivityGoogleData({ activityId })` — admin/manual refresh.
  - `searchPlacesAutocomplete({ input, sessionToken, types? })` — proxied through server (keeps server key safe; also enables consistent typing).
  - `searchPlacesByText({ query, locationBias? })`.
- `src/lib/routes.functions.ts`:
  - `computeLeg({ origin, dest, mode })` — already exists for Mapbox; rewrite to call Routes API; persist to `route_legs` cache.
  - `optimizeDayRoute({ trip_id, day_date })` — uses Route Optimization API.

**Note**: All new server fns use `requireSupabaseAuth`. Field masks are mandatory (cost control).

---

## Phase 2 — Google Maps rendering

- Add `src/lib/google-maps.ts` with `GOOGLE_MAPS_BROWSER_API_KEY` constant (you paste the key here).
- New `src/components/maps/GoogleMap.tsx`:
  - Loads `https://maps.googleapis.com/maps/api/js?key=...&libraries=places,marker&loading=async&callback=__initGmap`.
  - Singleton loader so the script only loads once.
  - Props mirror current `SnapMap.tsx`: `center`, `zoom`, `pins`, `avatars`, `focusedId`, `onPinClick`, `routeCoords`.
  - Uses `google.maps.Marker` (NOT AdvancedMarkerElement — no mapId).
  - Pins styled by category via custom icon (SVG circle with emoji label, matching current Mapbox style).
  - Polyline for route via `google.maps.Polyline`.
  - Graceful fallback `<div>` with "Map unavailable" if script load fails.
- Replace usages of `SnapMap`/`ItineraryMap` with `GoogleMap`. Keep old Mapbox files until Phase 5 cleanup.

---

## Phase 3 — Discovery, Map tab, Activity Detail rewire

**Discovery** (`src/routes/_authenticated/discover.tsx`):
- Card data: read `cached_google_rating`, `cached_google_review_count`, `cached_google_photo_url` from `activity_seeds`. Hide rows when null.
- Map view toggle uses new `GoogleMap`.
- Search bar: add Places Autocomplete (server-proxied) for places/landmarks — selecting recenters map + filters by distance.
- Near me: browser geolocation → distance sort, falls back to accommodation.

**Map tab** (`src/routes/_authenticated/map.tsx`): swap Mapbox for `GoogleMap`. Mobile pin tap → existing `MapPinPreviewSheet`.

**Activity detail** (`SeedDetailDrawer.tsx`):
- New sections: Why you'll love it / What's included / Good to know / Location (embedded `GoogleMap` mini) / Reviews / Booking.
- On open: call `getPlaceDetails({ level: 'detail' })` once; render rating, reviews snippets (3–5), opening hours, photos, Google Maps link.
- Sticky bottom CTA already exists — keep, add "Book activity" when `booking_url` set.

**Add to itinerary sheet** (`AddToItinerarySheet.tsx`):
- Already shipped. Wire `computeLeg` (Routes API) when day/time selected → show "28 min from your accommodation" and conflict warning.

---

## Phase 4 — Accommodation, Admin helper, Flights

- **Accommodation search**: replace `PlaceAutocomplete.tsx` (Mapbox geocoder) with new `GooglePlaceAutocomplete.tsx` using server-proxied `searchPlacesAutocomplete`. Save place_id, name, address, lat/lng, maps URL.
- **Admin Place ID helper** at `/admin`: per activity, search → pick → save → "Refresh Google data" button.
- **Flights**: add manual entry form using Google Places autocomplete for airports (types: `airport`). No third-party flight API.

---

## Phase 5 — Mapbox removal + QA

After verifying Phases 2–4 visually:
- Remove `src/components/dashboard/SnapMap.tsx`, `ItineraryMap.tsx`, `src/lib/mapbox.ts`, `src/components/trip/PlaceAutocomplete.tsx`, `StaySearchForm.tsx` Mapbox calls.
- `bun remove mapbox-gl`.
- Audit imports.

---

## Caching strategy (Phase 1 helper)
`getPlaceDetails` reads `google_data_last_refreshed_at`. If null OR older than the smallest relevant TTL for the requested fields, re-fetch and update row. `route_legs` cache: hour-bucketed (existing schema).

## Error handling
Every server fn returns `{ data, error: string|null }` shape. Components hide Google-dependent UI on null. Map renders fallback box on script load failure.

## Out of scope (per your spec)
- Onboarding flow changes
- Third-party flight API
- Mapbox-equivalent live-location avatar pulse (will be re-implemented atop GoogleMap in Phase 2)

---

## Acceptance checkpoints
- After Phase 1: server fns callable, migration applied, no UI change.
- After Phase 2: maps render in all 3 places, no console errors.
- After Phase 3: cards show ratings, detail drawer shows reviews/map/hours.
- After Phase 4: accommodation autocomplete works, admin can attach place IDs.
- After Phase 5: zero mapbox-gl imports.

**Estimated files touched**: ~30 (Phase 1: migration + 3 files; Phase 2: 1 new + 3 replacements; Phase 3: 4 routes/components; Phase 4: 3 new + 2 modified; Phase 5: 5 deletions).

Approve and I'll execute Phase 1 immediately, then pause for the browser key before Phase 2.
