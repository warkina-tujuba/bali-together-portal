## Goal

Tighten the post-login journey: faster destination search, calmer date step, an anime-enabled avatar moment at the end of onboarding, then a redesigned dashboard built around a Google-Calendar-style week planner sitting next to a Snap-Map-style map. Activities carry real info, expand on click, and the day can be route-optimised by AI.

## A. User journey (post-login)

```text
Google login / signup
  → /start
     1. Where are you going?         (fast Google Places autocomplete)
     2. When?                        (compact date range, on-theme)
     3. Flights?                     (yes/skip)
     4. Stay?                        (yes/skip)
     5. Your vibe                    (sliders)
     6. Pick your avatar             ← NEW: Marvel / DC / Pokémon / Anime
  → /dashboard  (calendar + map)
```

## B. Onboarding fixes

**c) Destination search — replace slow server geocode with Google Places (New) browser autocomplete.**
The Google Maps connector is already linked. Use `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (browser key `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) for instant predictions; resolve the chosen place via gateway `places/v1/places/{id}` to get lat/lng. New file: `src/components/trip/PlaceAutocomplete.tsx` — debounced (150ms), keyboard-nav, recent searches in localStorage, loading shimmer instead of "…".

**d) Date step polish.** Replace the bordered 2-month inline calendar with a single-month range picker on a card matching the rest of the wizard (no `bg-secondary/30` slab), with a tidy "Mar 4 → Mar 11 · 7 nights" chip. Use the same Card/padding/typography tokens as the other steps so the whitespace feels consistent.

**a) Avatar step (NEW step 6).** Mount the existing `AvatarPicker` (Marvel / DC / Pokémon / **Anime**) as the final onboarding step. On finish, save `avatar_url` via existing `updateProfile` server fn alongside `onboarding_complete: true`, then redirect to `/dashboard` (not `/discover` — see §D below for what happens to discover).

**b) Smoother avatar UX.** Pre-select the avatar matching the user's Google name initial; show a big live preview tile above the grid; one tap to confirm. Keep upload-your-own as a small text link for later.

## C. Dashboard redesign

**Layout (e):**

```text
┌──────────────── Trip hero + day strip ────────────────┐
│                                                       │
│  ┌──────────────────────────────┬──────────────────┐  │
│  │  WEEK CALENDAR  (60%)        │  SNAP-MAP (40%)  │  │
│  │  7am → 11pm hourly grid      │  sticky, full    │  │
│  │  Mon–Sun columns             │  height of cal   │  │
│  │  drop activities onto slots  │  avatars on map  │  │
│  └──────────────────────────────┴──────────────────┘  │
│                                                       │
│  Recommendations rail (below)                         │
└───────────────────────────────────────────────────────┘
```

Mobile: calendar stacks above map; map collapses to a "View map" sticky pill.

### Calendar (`src/components/dashboard/WeekCalendar.tsx`)
- 7 columns × 17 rows (07:00–23:00), 60-min slots, sub-30 snap.
- Click an empty slot → opens "Add activity" sheet pre-filled with that day+time.
- Tiles are positioned absolutely; **tile height ∝ duration_min** (60 min = 1 row).
- Drag to move (within day) or resize bottom edge to change duration. Cross-day drag is later.
- Between consecutive activities render a slim **travel strip** showing `🚗 18 min · 6 km` (or `⚠ tight — 5 min buffer`).
- Default view = current trip-week, with prev/next week chevrons constrained to trip range.

### Snap-style map (`src/components/dashboard/SnapMap.tsx`)
- Reuse Mapbox setup from `ItineraryMap.tsx`.
- **f)** On mount, fly to the stay pin (or trip `map_center_*`). As activities are added their pins join and the map auto-fits.
- Crew avatars: round avatar markers from `live_locations`, with a soft pulse — Snap-Map style. Click avatar → popup with "last seen Xm ago".
- Hovering a calendar tile focuses the matching pin; clicking a pin highlights the tile.

### Activity tiles + expand (g)
Tile shows: time, title, duration bar, mini avatars of RSVPs.
Click → `ActivityDetailDrawer` (right-side sheet) with:
- Hero image, full description, **what / where / cost / duration / website link**, host notes, RSVP, edit, delete.
- "Open in Maps" + travel-from-previous-stop block.
- Source attribution if AI-recommended.

Data already on `activities`: title, description, location, lat/lng, duration_min, image_url, booking_url. Add two nullable columns (small migration):
- `cost_usd numeric` — typical price per person
- `website_url text` — separate from booking_url for the "info site" link

### Recommendations
Keep the Tinder-style `/discover` flow but reposition it as **"Find activities"** entered from a dashboard CTA. Picks from `/discover` land in a **Parked** tray under the calendar; from there the user drags onto a slot. Auto-add-to-day stays as a one-click shortcut.

## D. Routes & travel (e, h)

**Travel calculation — Google Routes API via the existing connector.**
New server fn `computeLeg` in `src/lib/routing.functions.ts`:
- Input: `{ origin: {lat,lng}, dest: {lat,lng}, depart_at?: iso }`.
- Calls `routes/directions/v2:computeRoutes` through the gateway with `travelMode: DRIVE`, `routingPreference: TRAFFIC_AWARE`.
- Returns `{ duration_min, distance_km, polyline }`.
- Cached in a new `route_legs` table (composite key on origin+dest+hour-bucket) to keep API usage low.

Wired into:
1. The calendar travel strip between consecutive activities.
2. The map: when day is "optimised", draws the polyline through the day's stops.

**h) "Optimise this day" button** on the day header.
- Server fn `optimiseDay({ trip_id, day_date })`: pulls that day's activities, calls Routes Matrix to build a travel-time matrix, runs a nearest-neighbour + 2-opt pass (fast, deterministic, < 50ms for ≤8 stops), preserves any time-locked activities (host events).
- Returns a **proposed** reordered schedule. UI shows a side-by-side diff ("Before 2h 40m driving → After 1h 05m"). User clicks **Accept** to write back start/end times; otherwise discard. No silent re-ordering.

## E. Database migration

```sql
-- Add richer activity info
alter table public.activities
  add column if not exists cost_usd numeric,
  add column if not exists website_url text;

-- Cache route legs to limit Routes API spend
create table if not exists public.route_legs (
  id uuid primary key default gen_random_uuid(),
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  hour_bucket smallint not null,            -- 0..23 local hour
  mode text not null default 'drive',
  duration_min integer not null,
  distance_km numeric not null,
  polyline text,
  fetched_at timestamptz not null default now()
);
create index if not exists route_legs_lookup
  on public.route_legs (origin_lat, origin_lng, dest_lat, dest_lng, hour_bucket, mode);
alter table public.route_legs enable row level security;
create policy "Authenticated read legs" on public.route_legs for select to authenticated using (true);
create policy "Authenticated insert legs" on public.route_legs for insert to authenticated with check (true);
```

(Seeds get richer `est_cost_usd` / `url` already — those propagate when `addCatalogueToTrip` runs; extend it to also fill `cost_usd`/`website_url`.)

## F. Files touched

**New**
- `src/components/trip/PlaceAutocomplete.tsx`
- `src/components/dashboard/WeekCalendar.tsx`
- `src/components/dashboard/SnapMap.tsx`
- `src/components/dashboard/ActivityDetailDrawer.tsx`
- `src/components/dashboard/AddActivitySheet.tsx`
- `src/components/dashboard/TravelStrip.tsx`
- `src/components/dashboard/OptimiseDialog.tsx`
- `src/lib/routing.functions.ts`

**Modified**
- `src/routes/_authenticated/start.tsx` — Places autocomplete, calmer dates, **avatar step 6**, redirect to `/dashboard`.
- `src/routes/_authenticated/dashboard.tsx` — new 60/40 layout, calendar + SnapMap, optimise button, drawer.
- `src/lib/trip.functions.ts` — `addCatalogueToTrip` writes cost/website; new `updateActivitySchedule`, `optimiseDay`.

## G. Out of scope (this pass)
- Public itinerary share page ("others see your trip").
- Group host/personal scope toggle in calendar tiles (data is already there; UI later).
- Walking/transit travel modes (drive only for now).

## H. Validation
- Manual: full Google-login → onboarding (with new search + avatar) → land on dashboard with stay pin → click empty 09:00 Tuesday → add activity → drag to 10:30 → see travel strip update → Optimise day → accept.
- Responsive checks at 375, 820, 1440.
