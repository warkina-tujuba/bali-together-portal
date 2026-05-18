## Goal

Replace the current `/trip/new` "Start your trip" form (one big card with all fields at once) with a guided, one-question-per-screen onboarding that mirrors the user's intended journey:

1. Where are you going?
2. When are you going?
3. What's the occasion? (+ trip name)
4. Have you booked flights? → if yes, add flight; if no, skip
5. Have you booked accommodation? → if yes, add stay; if no, skip

After step 5 → land directly on the new home (`/dashboard` calendar+map split) — no "Plan & invite" step in onboarding.

## New route

Create `src/routes/_authenticated/start.tsx` as the single onboarding entry. Delete the old `trip.new.tsx` and `onboarding.tsx` once `/start` is wired (login redirect + any internal links updated to `/start`).

## Step-by-step UX

Each step is a full-screen card, large heading, one primary control, Back/Next footer, progress dots at top. Smooth fade transition between steps.

**Step 1 — Where are you looking to go?**
- Big text input + Mapbox-style geocoder results dropdown (reuse `geocode` server fn already in `trip.functions.ts`)
- Picking a result stores `destination`, `lat`, `lng`
- Hero image (Unsplash by destination string) fades in once selected
- Next disabled until a destination is picked

**Step 2 — When are you going?**
- Two date pickers (shadcn DatePicker with `pointer-events-auto`) — Start / End
- Inline preview: "5 nights in Canggu"
- Next disabled until both dates set and end ≥ start

**Step 3 — What's the occasion?**
- `OccasionPicker` chips (reuse existing component)
- Trip name input below ("Sara's 30th in Bali") — pre-filled with `"{occasion} in {destination}"` editable
- Optional description textarea
- "Create trip" CTA → calls `createTrip` server fn, stores `tripId` in local state, advances

**Step 4 — Have you booked flights?**
- Two large choice cards: "Yes, I've booked" / "Not yet — skip"
- "Yes" expands `FlightPasteForm` + `FlightManualForm` tabs (reuse existing), saving via `saveFlight`
- "Skip" advances immediately
- After save → advance to step 5

**Step 5 — Have you booked accommodation?**
- Same yes/skip pattern with `StayPasteForm` + `StaySearchForm` tabs
- After save or skip → call `updateProfile({ onboarding_complete: true })` and `navigate({ to: "/dashboard" })`

## What gets removed

- The "Pick your hero" profile step inside the wizard — move avatar/name capture to the existing `/choose` flow that already runs before `/start` (it's already there per route list). Confirm and skip in onboarding to keep flow focused on the trip itself.
- The "Plan & invite" step (AI draft + magic link) — this belongs on the dashboard, not in onboarding. The dashboard already has invite + AI suggestions.

## Routing changes

- New: `src/routes/_authenticated/start.tsx`
- Update redirect targets: anywhere that navigates to `/trip/new` or `/onboarding` (login post-auth, `_authenticated.tsx` guard, dashboard "create trip" button) → point to `/start`
- Delete: `src/routes/_authenticated/trip.new.tsx`, `src/routes/_authenticated/onboarding.tsx`

## Reused (no changes)

- Server fns: `geocode`, `createTrip`, `updateProfile`, `saveFlight`, `saveAccommodation`, `parseFlightText`, `parseStayText`
- Components: `OccasionPicker`, `FlightPasteForm`, `FlightManualForm`, `StayPasteForm`, `StaySearchForm`

## Out of scope

- No changes to dashboard, calendar, map, crew, or AI hybrid recommender — those stay as last built.
- No new server fns or migrations.

## Test plan

1. Fresh signup → lands on `/choose` → `/start` step 1
2. Type "Canggu" → pick from dropdown → Next
3. Pick dates → Next
4. Pick occasion + name → Create trip → trip row created
5. "Yes, booked flight" → paste BA0007 confirmation → saved → step 5
6. "Skip accommodation" → lands on `/dashboard` with trip dates visible on calendar
