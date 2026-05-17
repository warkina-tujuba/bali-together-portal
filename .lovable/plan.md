# Bali Group Trip Portal — Free-API Build Plan

Same product, design direction (Uluwatu Luxe), and DM Serif Display + Fira Sans typography as already approved. Only change: external APIs are swapped to **free, key-less** options.

## API swaps (vs. original plan)

| Need | Old (paid/key) | New (free, no key) |
|---|---|---|
| Map tiles | Mapbox GL JS + token | **Leaflet** + **OpenStreetMap** raster tiles |
| Accommodation lookup | Mapbox Places | **Nominatim** (OSM geocoding, public endpoint) |
| Flight lookup | AeroDataBox via RapidAPI | **Manual entry**, with a built-in slot for AviationStack later if desired |

No secrets need to be added. Everything runs out of the box.

### Why these are safe to use directly

- **OpenStreetMap tiles** — free for low/moderate use; we set a proper `User-Agent`-style attribution and reasonable zoom limits.
- **Nominatim** — free public geocoder; we throttle queries (300ms debounce, min 3 chars), set a descriptive `Referer`, and call it from a server function so we control rate and can swap providers later without touching the UI.
- **Leaflet** — MIT-licensed JS lib, installed via npm.

## Onboarding wizard (unchanged steps, free-API behavior)

1. **Identify** — confirm name from invite.
2. **Profile** — phone, dietary, room preference, avatar.
3. **Flight** — guest enters airline, flight number, date, arrival airport, arrival time. Clean form, no lookup required. (Later we can wire an optional lookup behind a feature flag.)
4. **Accommodation** — type a hotel/villa name or address → Nominatim suggestions → pick → we store name, address, lat, lng.
5. **WhatsApp** — deep link to the trip's group invite (set by admin), mark joined.

## Map experience

- Group accommodation map uses **Leaflet** with OSM tiles, custom round terracotta pins for guest stays, popup with guest name + stay name.
- Dashboard shows a small map preview; `/map` shows the full-screen version.
- Default center comes from the trip row (Bali coords pre-seeded).

## Everything else unchanged from approved plan

- Schema, RLS, roles, has_role, profile auto-creation trigger — already migrated.
- Routes: `/`, `/login`, `/onboarding`, `/dashboard`, `/itinerary`, `/map`, `/admin/*`.
- Auth: email magic link + invite token acceptance via `/api/public/accept-invite`.
- Server functions: `acceptInvite`, `updateProfile`, `geocode` (Nominatim proxy), `saveFlight`, `saveAccommodation`, `getDashboard`, `getItinerary`, admin CRUD.
- Design tokens (jungle/terracotta/sand/paper), fonts (DM Serif Display + Fira Sans), mobile-first composition exactly matching the chosen prototype.
- Seed: trip "Warkina 30th Bali" + sample itinerary days/activities.
- Admin: invite generator, guest table, itinerary editor, trip settings (incl. WhatsApp URL).

## Build sequence

1. Tokens + base layout (root, `_authenticated`, `_admin`, nav, fonts).
2. Magic-link login + invite landing + `/api/public/accept-invite`.
3. Onboarding wizard (with Nominatim lookup in step 4).
4. Dashboard + full `/map` (Leaflet) + full `/itinerary`.
5. Admin views.
6. Seed sample data for the Warkina trip.

## Out of scope

Real-time flight status, push notifications, payments, multi-trip, two-way WhatsApp sync.
