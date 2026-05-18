# Realignment Plan: Trip Portal → Crew → AI Planner

Reverse-engineer the app around three jobs. Strip anything that doesn't serve them.

---

## Feature 1 — Trip Setup Portal

**Goal:** New user lands → in ≤ 5 questions has a trip with flights + stay attached → arrives on the planning home.

### New onboarding flow (replaces `/trip/new` + `/onboarding`)

Single route `/start` with stepper:

1. **Where are you going?** — destination autocomplete (Mapbox geocoder). Selection sets a hero background image fetched from Unsplash (or a curated mapping for top destinations). Saves `trips.destination`, `map_center_lat/lng`.
2. **When?** — date range picker. Saves `start_date`, `end_date`.
3. **Trip name + occasion** — short, with chips (Birthday, Bachelor/ette, etc.). Saves `trips.name`, `occasion`.
4. **Booked flights?** — Yes → inline `FlightSmartForm` (AviationStack lookup, already built). No → skip, badge "We'll suggest flights later".
5. **Booked accommodation?** — Yes → paste address / Airbnb link (already built `StayPasteForm`). No → skip.
6. → redirect to `/` (the new planning home).

Existing components reused: `FlightSmartForm`, `StayPasteForm`, `OccasionPicker`. Delete `PreferencesQuiz` from onboarding (moves to home as sliders).

### Acceptance

- A logged-in user with no trip is forced through `/start`.
- Skipping flights/stay still creates the trip and lands on home.

---

## Feature 2 — AI-Assisted Planner Home (`/`)

**Goal:** Google-Calendar-meets-Inspirock. Split 50/50: **calendar left, map right**. Suggestions panel slides up from bottom.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  Top bar: trip name • dates • crew avatars • Invite • Chat │
├──────────────────────────┬─────────────────────────────────┤
│   Week calendar (60%)    │      Map (40%, sticky)          │
│   - day columns Sun-Sat  │   - stay pins 🏠                │
│   - host events locked   │   - activity pins per day       │
│   - crew activities      │   - crew member live pins       │
│     w/ colored avatars   │   - hover card ↔ calendar sync  │
│   - drag-to-reschedule   │                                 │
│   - click empty slot →   │                                 │
│     "Add activity"       │                                 │
├──────────────────────────┴─────────────────────────────────┤
│  AI Suggestions drawer (collapsible bottom sheet)          │
│  Sliders: Popular↔Hidden • Fast↔Slow • Adventure↔Relax     │
│  Cards: image, title, price est., rating, "+ Add" "Book"   │
└────────────────────────────────────────────────────────────┘
```

### Calendar (left)

Replace current day-list (user can change to "day view", when selcted day expands from week view) with a real week grid (use existing pattern from `/agenda` or `react-big-calendar`-style component built in-house with CSS grid).

- Hour rows 7am–11pm.
- Each activity = block colored by creator avatar.
- Host events have a 👑 badge and lock icon.
- Drag block to move time. Drop a suggestion card onto a slot → creates activity at that time.
- Clicking on activity also allows users to select and choose date from there.
- Toggle "All crew" / "Just me" / per-member filter.

### Map (right)

Reuse `ItineraryMap.tsx`. Filter pins by currently selected day(s). Add live-location pins (`live_locations` table, already exists). Have recommended events on map as well

### AI Suggestions (hybrid)

- Bali destinations → existing `BALI_CATALOGUE` + scoring (instant, free).
- Other destinations → server fn calls **Lovable AI Gateway** (`google/gemini-3-flash-preview`) with prompt:
  > "Suggest 12 activities in {destination} for {dates}. User wants pace={pace}/5, adventure={adv}/5, popularity={pop}/5. Return JSON: [{title, description, category, duration_min, price_est_usd, lat, lng, booking_search_query}]."
- Cache results per `(destination, slider hash)` in a new `ai_suggestions_cache` table to avoid re-calling Gemini.
- Each card: "+ Add to trip" opens calendar in drag mode; "Book" opens Google search for `{title} {destination} book` (or `booking_url` if present).

### Activity detail (expand on click)

Drawer with: image, full description, price estimate, rating placeholder, who's going (avatars + Join/Interested), booking link.

---

## Feature 3 - Crew & Events (Facebook-events style)

**Goal:** Trip is shareable. Joining is one-click. Crew is visible everywhere. 

### Invite link with host approval

- New table `trip_join_requests (id, trip_id, user_id, status: pending|approved|rejected, created_at)`.
- Public route `/join/$code` — if not signed in → signup → auto-create request → "Waiting for host approval" screen when users have logged in, added flights and accomodation. I.e. users can start creating trip before joining crew. View changes when host accepts. 
- Host gets a notification (in-app toast + `notifications` table row).
- Host approval screen at `/crew` lists pending → approve sets `profiles.trip_id` and inserts `event_rsvps` for any host events.

### Crew panel (sidebar on home + dedicated `/crew` page)

- Avatar stack of members (already in dashboard).
- Per-member card: name, flight (arrival time + number), stay name, "interested in X events".
- Pending invites list with approve/reject.
- "Invite" button → copies `/join/$code` link + WhatsApp share.

### Events = activities with `is_host_event=true`

Already in schema. Host-created events:

- Block the time slot on every member's calendar (visually fixed, can't be deleted by non-host).
- Auto-RSVP host as going; others get notification "You've been invited to {event}".
- Member click → event detail drawer with attendee list, location, "I'm going / Interested".

### Chat

Already wired (`messages` table). Surface it as a slide-over panel on home, not a separate page.

### Acceptance

- Host generates link → second user opens incognito → signs up → request appears in host's `/crew` → approve → second user lands on home with the trip's host events already on their calendar.

---

## Data model changes (one migration)

```sql
-- Crew approval
CREATE TABLE public.trip_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  UNIQUE (trip_id, user_id)
);
ALTER TABLE public.trip_join_requests ENABLE ROW LEVEL SECURITY;
-- policies: user can insert own; user can read own; trip admin can read/update for their trip

-- Public join codes
ALTER TABLE public.trips ADD COLUMN join_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8);

-- AI cache
CREATE TABLE public.ai_suggestions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination text NOT NULL,
  filters_hash text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination, filters_hash)
);

-- Notifications (in-app)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid,
  kind text NOT NULL, -- join_request|join_approved|new_event|event_rsvp
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: users read own
```

---

## Server functions to add (`src/lib/trip.functions.ts`)

- `requestJoinTrip({ code })`
- `listJoinRequests()` / `decideJoinRequest({ id, approve })`
- `recommendActivitiesAI({ destination, sliders })` — hybrid catalogue + Gemini fallback with cache.
- `moveActivity({ id, day_date, start_time })` — drag-drop persistence.
- `getNotifications` / `markNotificationRead`.

## Routes

- New: `/start` (replaces `/trip/new` + `/onboarding`), `/join/$code`, `/crew`.
- Rewrite: `/` (dashboard → full split planner).
- Delete: `/onboarding`, `/trip/new`, `/agenda` (folded into `/`), `/itinerary` (folded into `/`).

## Components

- New: `src/components/planner/WeekCalendar.tsx`, `SuggestionDrawer.tsx`, `CrewPanel.tsx`, `JoinRequestsList.tsx`, `EventDetailDrawer.tsx`, `DestinationPicker.tsx`.
- Reuse: `ItineraryMap`, `FlightSmartForm`, `StayPasteForm`, `HostEventDialog`.

---

## Out of scope (this pass)

- Real booking integrations (Viator/Booking.com APIs) — links out to Google.
- Realtime location streaming UX polish (table exists, basic pins only).
- Push notifications / email — in-app only.
- Price prediction accuracy — AI estimate only, no live pricing.

## Test plan

1. New user → `/start` → 5 steps → lands on `/` with empty calendar + map centered on destination.
2. Add flight via AviationStack → appears on calendar at arrival time + pin on map at airport.
3. Move slider sliders on Sydney trip → Gemini returns 12 suggestions → drag one onto Wed 2pm → activity persists, pin appears.
4. Host creates "Birthday dinner Fri 7pm" → locked block on calendar.
5. Copy `/join/{code}` → incognito signup → request appears in `/crew` → approve → second user sees same calendar with locked host event.
6. Second user RSVPs "Going" → avatar appears on host's event block.

---

Ready to build. Confirm and I'll start with the migration + new `/start` flow, then rebuild `/` as the split planner.