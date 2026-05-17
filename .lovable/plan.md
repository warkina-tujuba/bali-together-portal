# Group-First Itinerary Planner

Turn the home/dashboard into a Klarna-Trips / Inspirock-style day-by-day planner with an Airbnb split (list left, map right), powered by what the group is already doing.

## 1. Flow change
After onboarding step "flights + stay", redirect to **`/`** (dashboard) instead of `/agenda`. Dashboard becomes the new home.

## 2. Data model additions (migration)
- `activities.is_host_event boolean default false` — flag for host-created "book-out" events (e.g. "Birthday dinner").
- `activities.booking_url text` — link to complete booking (Viator, GetYourGuide, restaurant, etc.).
- `activities.scale_adventure smallint` (1–5), `scale_pace smallint` (1–5), `scale_popularity smallint` (1–5) — Klarna-style sliders for filtering.
- Reuse existing `event_rsvps` (status: `going` | `interested`).

## 3. Server functions (`src/lib/trip.functions.ts`)
- `listTripActivities` — returns activities grouped by day with RSVP counts + current-user status + creator profile. Host events ordered first within each day.
- `createHostEvent` — host-only; inserts activity with `is_host_event=true`, auto-RSVPs host as going.
- `setRsvp({ activityId, status })` — upsert into `event_rsvps`.
- `recommendActivities({ tripId, filters })` — filters `BALI_CATALOGUE` by adventure/pace/popularity scales + must-do tags; returns top N not yet in trip.
- `addRecommendationToTrip({ catalogueId, dayDate })` — inserts catalogue entry as a trip activity (non-host).

## 4. New homepage (`src/routes/_authenticated/dashboard.tsx`)
Split layout (desktop) / stacked (mobile):
- **Left panel**:
  - Trip header (dates, destination, group size).
  - Day tabs / scrollable date strip.
  - For each day: host events first (badge "Hosted by X"), then group activities, then "Suggested for your group".
  - Each card: title, time, who's going (avatars), Join / Interested buttons, "Add booking" link if `booking_url`.
- **Right panel**: Map with accommodation pins (group stays) + activity pins for selected day. Hover/click syncs with cards.
- **Top filter bar**: 3 sliders (Adventure↔Relax, Fast↔Slow, Popular↔Hidden) + must-do chips → updates recommendations live.
- **"+ Host event" button** (host only) → dialog reusing `EventForm` with `is_host_event` toggle.

## 5. Recommendations panel
Below the day list: horizontal carousel of suggested catalogue activities filtered by the slider state. Each card has "Add to trip" (date picker) + "Book" (opens `booking_url` if present, else Google search fallback).

## 6. Components to create
- `src/components/dashboard/DayColumn.tsx`
- `src/components/dashboard/ActivityCard.tsx` (avatars + RSVP buttons)
- `src/components/dashboard/RecommendationCarousel.tsx`
- `src/components/dashboard/ScaleFilters.tsx`
- `src/components/dashboard/TripMap.tsx` (Leaflet — already-used pattern in `/map`)
- `src/components/trip/HostEventDialog.tsx`

## 7. Onboarding redirect
In `src/routes/_authenticated/onboarding.tsx` final step, navigate to `/` (dashboard) not `/agenda`.

## Out of scope (for this pass)
- Real third-party booking integrations (Viator API etc.) — just link out.
- AI-generated recommendations beyond the catalogue + slider scoring.
- Realtime RSVP push (uses query invalidation on action).

## Test plan after build
1. Complete onboarding → land on dashboard.
2. See seeded activities grouped by day; host events first.
3. Toggle RSVP → avatar appears on card.
4. Move sliders → recommendation carousel changes.
5. Add a recommendation → it appears in the day list.
6. As host: create "Birthday dinner 1 July" → shows with host badge, blocks that slot.
7. Map pins for stays + activities render and match the selected day.

Ready to build?
