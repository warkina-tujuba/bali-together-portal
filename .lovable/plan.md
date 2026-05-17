## Goal

Fix the four pain points in order: (1) booking UX, (2) replace AI itinerary chat with a structured questionnaire + manual "+" event builder, (3) events feed + chat on dashboard, (4) invitee onboarding → RSVP agenda. Default trip is the Bali trip — invitees inherit the host's locked events and confirm attendance.

**Token-saving directive**: no AI calls anywhere in the new flows. Flight lookup uses a real flight API (booking-ref autocomplete). Stay = paste address → geocode → pin. Itinerary = pick chips + recommendations, no LLM.

---

## 1. Booking UX overhaul

### Flights — "by flight number" first

```
[Flight number]  [Date]   →  Look up
   AA123         2026-06-20
```

- New `lookupFlight({ flight_number, date })` server fn calls a flight-data API and returns airline, route, scheduled times.
- Recommended API: **AeroDataBox via RapidAPI** (cheap pay-per-call, no AI tokens). Free tier covers testing.
- Falls back to manual form if API fails or returns nothing.
- "Have a booking ref instead?" link → small text field; we look up via the same provider's PNR endpoint when available, else collapse to manual.
- Removes paste-email-blob flow entirely (it relied on LLM).

**Action needed from you:** sign up at rapidapi.com → subscribe to AeroDataBox (free) → I'll request `AERODATABOX_RAPIDAPI_KEY` via the secret tool. If you'd rather use a different provider, name it.

### Stays — paste address is primary

- Single tab: **Paste address or booking link**.
- Geocode via Mapbox (token already in project).
- Show preview card + draggable pin to fine-tune location.
- Save → pin appears on map with a clear **house icon** (already done) and distinct color per stay type if we add hotel/villa/apartment dropdown.
- Remove the AI booking-parser code path.

### Map pin clarity

- Stays: 🏠 white circle, orange border (existing).
- Events: 📍 colored circle by category (food / activity / transit).
- Live members: avatar with green ring (existing).
- Add a small legend in the top-left of the map.

---

## 2. Structured itinerary planner (no AI)

Replace "Draft my days with AI" with a **trip preferences questionnaire** that fills the days deterministically from a curated Bali catalogue.

### Questionnaire (5 quick steps)

1. **Vibe** — chips: Adventure / Relaxed / Cultural / Foodie / Party (multi-select)
2. **Pace** — slider: Chill (1 event/day) ↔ Packed (4+ events/day)
3. **Must-do** — chips: Beach, Surf, Rice terraces, Temples, Spa, Nightlife, Diving, Yoga
4. **Avoid** — chips: Early starts, Long drives, Crowds
5. **Budget per activity** — slider $ / $$ / $$$

### Output

- We ship a hand-curated **Bali activity catalogue** (~40 entries) as a static JSON file (`src/data/bali-activities.ts`) with: title, location (lat/lng), tags, category, vibe, intensity, est. cost, image URL, duration.
- Pure-JS scoring function picks N activities per day matching their answers, slots them by time (morning/afternoon/evening), respects pace.
- Result renders as editable day cards.

### Manual "+" event builder

- Big **"+ Add event"** button on each day card.
- Form: title, day, time, location (Mapbox search), category, optional image upload, notes.
- For locations: same paste-address search as stays.
- **Image**: pick from category-matched stock images (already in catalogue) OR upload custom (Supabase Storage bucket `event-images`).
- Saves to `activities` table with the new fields.

---

## 3. Dashboard: events + chat

- New **"Upcoming events" feed** at top of `/dashboard` (next 3 events from the host's locked itinerary, with image, time, location, RSVP count).
- **Chat shortcut** card: "Group chat (4 unread)" → links to `/chat`.
- Existing trip summary moves below.

---

## 4. Invitee flow & RSVP

### Default trip = Bali

- New users invited via Magic Link auto-join the host's Bali trip (already works via `acceptInvite`).
- After accepting → forced onboarding wizard (their flight + stay) → land on **`/agenda`**.

### `/agenda` (new route)

- Lists every host-locked event in chronological order.
- Each event shows: image, title, time, location, host avatar.
- Three RSVP buttons per event: ✅ Going / 🤔 Maybe / ❌ Can't make it.
- Top progress: "5 of 12 events confirmed".
- Once all RSVP'd → "Continue to dashboard" CTA.

### RSVP backend

- New table `event_rsvps` (`activity_id`, `user_id`, `status`, `responded_at`).
- RLS: trip members read all RSVPs for their trip's events; users write only own.
- Event cards everywhere show attendance counts ("8 going").

---

## Files

**New**
- `src/lib/flight-api.server.ts` — AeroDataBox client
- `src/lib/flight.functions.ts` — `lookupFlight` server fn
- `src/data/bali-activities.ts` — curated catalogue
- `src/lib/itinerary-planner.ts` — scoring + slotting (pure JS)
- `src/components/trip/FlightLookupForm.tsx` — number+date lookup UI
- `src/components/trip/StayAddressForm.tsx` — paste-address + Mapbox geocode + pin tuner
- `src/components/trip/PreferencesQuiz.tsx` — 5-step chip/slider questionnaire
- `src/components/trip/EventBuilder.tsx` — manual "+" form (replaces current minimal EventForm)
- `src/components/trip/EventCard.tsx` — shared card w/ RSVP
- `src/components/dashboard/UpcomingEvents.tsx`
- `src/components/dashboard/ChatPreview.tsx`
- `src/routes/_authenticated/agenda.tsx`
- `supabase/migrations/<ts>_rsvps_and_event_fields.sql`

**Edited**
- `src/lib/trip.functions.ts` — `lookupFlight` removed (moved), new `setRsvp`, `listAgenda`, `getEventCatalogue`, `applyPreferences`; AI-itinerary fn deleted or stubbed
- `src/components/trip/FlightPasteForm.tsx` — deleted
- `src/components/trip/StayPasteForm.tsx` — deleted
- `src/routes/_authenticated/trip.new.tsx` — wizard step 3 uses `FlightLookupForm`, step 4 uses `StayAddressForm`, step 5 uses `PreferencesQuiz`
- `src/routes/_authenticated/onboarding.tsx` — joiner flow ends on `/agenda`
- `src/routes/_authenticated/dashboard.tsx` — adds `UpcomingEvents` + `ChatPreview` at top
- `src/routes/_authenticated/itinerary.tsx` — adds "+ Add event" per day, RSVP counts
- `src/routes/_authenticated/map.tsx` — event pins + legend

---

## Suggested ship order (separate PRs so you can test each)

1. **Booking UX** — flight lookup + stay address (needs your RapidAPI key)
2. **Structured planner + "+" events** — replaces AI itinerary
3. **Dashboard events feed + chat shortcut**
4. **RSVP + invitee `/agenda`**

---

## Out of scope (this pass)

- Editing trip basics after creation
- Event editing/deletion UI (still add-only; delete via admin)
- Push notifications for RSVPs
- Hotel rate lookups
- Real boarding-pass scan

---

## One blocker before I start

To wire flight number → details, I need a flight data API key. **AeroDataBox via RapidAPI** is the cheapest fit (free tier, no AI tokens). Want me to proceed with that and prompt you for the key, or do you have a different provider in mind?