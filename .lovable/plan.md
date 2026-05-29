
# Travel Link Onboarding Redesign Plan

Goal: replace the current 6-step `/start` wizard with a polished, mobile-first, travel-native onboarding flow that produces an account, profile, trip, multiple stays, planned places, optional arrival info, and a starter day-shell itinerary. Landing page (`src/routes/index.tsx`) is untouched.

## 1. Current state (what we're replacing)

- Entry: `index.tsx` "Plan your trip" → `/login` → `/choose` → `/start` (under `_authenticated`, requires login first).
- `src/routes/_authenticated/start.tsx` is a single-file 6-step wizard: destination → dates → flight → stay → vibe → avatar.
- Login is forced before any trip input — friction.
- Date picker is a basic shadcn `Calendar` range.
- Stays are single-stay (one `accommodations` row via `saveAccommodation`).
- No "planned places" concept exists at all.
- Avatars use `AvatarPicker` (preset characters) — to be removed.
- Flights are a full step with smart/lookup/paste sub-forms — too central.
- No marker colour, no starter itinerary generation on completion.

DB today: `profiles` (no `marker_colour`, no `google_avatar_url`), `trips` (start/end required, no duration-only mode, no country/place_id), `accommodations` (good — already supports multi-stay per trip), no `planned_places` table, `itinerary_days` exists but isn't seeded by onboarding.

## 2. New flow & routes

New flow lives at `/plan` (so we can keep `/start` working until cutover, then redirect). It is a **public** route that allows draft entry before auth, then prompts Google sign-in before final save.

```text
Homepage "Plan your trip"
   ↓
/plan                 ← public, draft state in localStorage + Zustand
   step 1: Destination      (Google Places Autocomplete)
   step 2: Dates or Duration (range OR duration chips)
   step 3: Places on radar  (multi-add via Places Autocomplete, chips)
   step 4: Stays            (multi-add via Places Autocomplete, optional dates)
   step 5: Arrival          (optional, Jetstar-style search; AviationStack enrichment)
   step 6: Vibe             (optional sliders)
   ↓ "Save your trip"
/plan/auth            ← Continue with Google (only gate)
   ↓
/plan/profile         ← name + photo (prefilled from Google) + marker colour
   ↓ finalize
   → server: create trip + stays + planned_places + preferences + day shells
   ↓
/plan/ready           ← summary + "Start discovering"
   ↓
/dashboard            ← starter plan visible, prompts for skipped steps
```

Join flow (`/start?invite=...` → accept) is preserved unchanged. Invitees land on `/plan/profile` (name/photo/colour only) after Google sign-in.

## 3. Files to add / change

### New routes
- `src/routes/plan.tsx` — public layout (no auth wrapper), renders the wizard shell with progress dots, `<Outlet/>`, mobile-first bottom CTA bar.
- `src/routes/plan.index.tsx` — step 1 (destination).
- `src/routes/plan.dates.tsx`, `plan.places.tsx`, `plan.stays.tsx`, `plan.arrival.tsx`, `plan.vibe.tsx` — steps 2–6.
- `src/routes/plan.auth.tsx` — Google sign-in gate ("Save your trip").
- `src/routes/plan.profile.tsx` — name/photo/marker colour.
- `src/routes/plan.ready.tsx` — completion + summary + CTAs.
- Keep `/start` as a thin redirect to `/plan` (preserves invite param → routes to `/plan/auth?invite=...`).

### New components (`src/components/plan/`)
- `WizardShell.tsx` — progress bar (Jetstar-style segmented), back, skip, primary CTA.
- `DestinationStep.tsx` — wraps `PlaceAutocomplete`, large hero input, confirmation card with static map thumbnail.
- `DateRangeStep.tsx` — segmented toggle [Dates | Duration]. Dates mode = `react-day-picker` range, two-month on tablet, one-month mobile, big day cells, animated range fill. Duration mode = chip grid (3/5/7/10/14/Custom) + "Add exact dates later" link.
- `PlacesRadarStep.tsx` — Places Autocomplete + chip list with edit sheet (nights, optional date range).
- `StaysStep.tsx` — Places Autocomplete first; "Paste booking link" as secondary tab; chip list of stays with date assignment if trip dates exist.
- `ArrivalStep.tsx` — Jetstar-style From/To/Date card, optional flight number; AviationStack lookup; manual fallback.
- `VibeStep.tsx` — 7 sliders (refined from existing) with labelled poles.
- `ProfileStep.tsx` — avatar (Google photo / upload to Supabase Storage `profile-photos` bucket), name field, marker colour swatch (8 fixed colours).
- `ReadySummary.tsx` — summary card + "what we prepared" list.
- `StaticMapThumb.tsx` — Google Static Maps image for confirmation cards.

### Draft state
- `src/lib/plan-draft.ts` — Zustand store + `localStorage` persistence under key `tl:plan:draft:v1`. Shape mirrors final payload. Survives Google OAuth round-trip (read after redirect on `/plan/profile`).

### Server functions (`src/lib/plan.functions.ts`, new)
- `finalizeTripDraft({ draft, profile })` — single transactional server fn, protected by `requireSupabaseAuth`. Does:
  1. Upsert profile (display_name, avatar_url, marker_colour).
  2. Insert `trips` row (handles duration-only by setting end_date = start_date + duration or leaving flexible flag).
  3. Bulk insert `accommodations` (stays).
  4. Bulk insert `planned_places`.
  5. Insert `flights` row if arrival provided.
  6. Insert `trip_preferences` if vibe provided.
  7. Generate day shells into `itinerary_days` (one row per trip day; if duration-only, anchor to today as placeholder until exact dates set; flag `is_placeholder = true`).
  8. Update `profiles.trip_id` + `onboarding_complete=true`.
  9. Return `{ tripId }`.
- `generateStarterPlan(tripId)` — pure helper, called inside `finalizeTripDraft`. Heuristic only (no AI yet): Day 1 = "Arrival & settle in"; if planned_places exist, distribute them as area labels across days; last day = "Departure"; intermediate days get generic prompts ("Explore near {place}", "Food, beach, or local discovery").
- `uploadProfilePhoto({ file })` — signed upload to `profile-photos` bucket (path `{userId}/avatar.jpg`).

### Removed / deprecated
- `AvatarPicker.tsx` — drop from flow (keep file for now, unused).
- `OccasionPicker`, `FlightSmartForm` usage in onboarding — flight components stay for in-trip use, just not in onboarding hot path.

## 4. Data model changes (single migration)

```sql
-- profiles
ALTER TABLE public.profiles
  ADD COLUMN marker_colour text,
  ADD COLUMN google_avatar_url text,
  ADD COLUMN uploaded_avatar_url text,
  ADD COLUMN auth_provider text;

-- trips
ALTER TABLE public.trips
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL,
  ADD COLUMN duration_days int,
  ADD COLUMN duration_nights int,
  ADD COLUMN dates_flexible boolean NOT NULL DEFAULT false,
  ADD COLUMN destination_place_id text,
  ADD COLUMN destination_country text,
  ADD COLUMN destination_lat double precision,
  ADD COLUMN destination_lng double precision,
  ADD COLUMN destination_google_maps_url text;

-- planned_places (new)
CREATE TABLE public.planned_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  google_place_id text,
  lat double precision,
  lng double precision,
  nights int,
  start_date date,
  end_date date,
  source text NOT NULL DEFAULT 'google_places',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_places TO authenticated;
GRANT ALL ON public.planned_places TO service_role;
ALTER TABLE public.planned_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Crew read planned places" ON public.planned_places FOR SELECT TO authenticated
  USING (trip_id = current_user_trip_id());
CREATE POLICY "Crew insert planned places" ON public.planned_places FOR INSERT TO authenticated
  WITH CHECK (trip_id = current_user_trip_id() AND created_by = auth.uid());
CREATE POLICY "Owner updates/deletes" ON public.planned_places FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner deletes" ON public.planned_places FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- itinerary_days: ensure placeholder flag exists
ALTER TABLE public.itinerary_days
  ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt text;

-- storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true)
  ON CONFLICT DO NOTHING;
-- (RLS storage policies for owner write, public read added in migration)
```

`handle_new_user` trigger updated to also persist `google_avatar_url` and `auth_provider = 'google'` from `raw_app_meta_data`.

## 5. Auth & draft persistence

- Draft Zustand store hydrates on `/plan` mount from `localStorage`.
- "Save your trip" CTA on any step → check `supabase.auth.getUser()`. If unauthenticated, push to `/plan/auth?next=/plan/profile`.
- `/plan/auth` calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/plan/profile" })`.
- On return, `/plan/profile` reads draft from localStorage (survives redirect), prefills name/photo from `user.user_metadata`, gates Finalize until marker_colour selected.
- Finalize calls `finalizeTripDraft`, clears draft on success, navigates to `/plan/ready`.

## 6. Google Places & AviationStack

- Destination, planned places, stays all use existing `PlaceAutocomplete` + `placeAutocomplete`/`placeDetails` server fns (already on Lovable connector gateway). No new API keys.
- Static Maps thumbnails go through a new tiny server route `/api/public/static-map` that proxies the connector (or via existing browser key since it's allowlisted).
- AviationStack: keep current `flightLookup` server fn; called only when user enters flight number + date in `ArrivalStep`. Manual fallback writes directly to `flights`.

## 7. Starter plan generation (v1, heuristic)

Inside `finalizeTripDraft`, after trip insert:
- Determine day count: explicit dates → `differenceInCalendarDays + 1`; duration-only → `duration_days`; missing → 0 (no shells, dashboard prompt shown).
- For each day, insert `itinerary_days` row with `day_number`, `date` (or null if flexible), `prompt`:
  - Day 1: "Arrival & settle in" — link to arrival flight if present.
  - Day N (last): "Departure" — link to outbound if present.
  - Middle days: round-robin assign planned_places as area labels; prompt = "Explore near {place}" or fallback prompts.
- `is_placeholder = true` so dashboard can style/replace later.

This is intentionally simple; AI enrichment is a later phase.

## 8. Dashboard prompts for skipped steps

`src/components/dashboard/SetupPrompts.tsx` (new) — queries trip/profile and renders dismissible cards:
- No `marker_colour` or `uploaded_avatar_url` → "Add your profile photo and colour".
- 0 stays → "Add your stay to unlock route planning".
- 0 planned_places → "Add places you want to visit".
- No flights and no manual arrival → "Add arrival details so your crew knows when you land".
- `dates_flexible = true` → "Lock in exact dates when you're ready".

Slot it at top of `/dashboard` above existing content. Dismissed state in localStorage per user.

## 9. Risks & breakage to watch

- `trips.start_date` / `end_date` becoming nullable affects every read in `trip.functions.ts`, `discover.functions.ts`, `recommend.functions.ts`, dashboard, agenda, week calendar. Need a pass to coalesce to `null` and render "Dates TBD" + use `duration_days` as fallback.
- Existing `/start` route still referenced from `login.tsx`, `choose.tsx`, `WhatsAppDialog.tsx`. Update redirects to `/plan` (invite param → `/plan/auth?invite=...`).
- `itinerary_days` may already have rows for legacy trips — additive columns only, safe.
- `accommodations` already supports multi-stay; no migration needed there, just UI.
- RLS on `planned_places` uses `current_user_trip_id()` — works for crew model.
- Storage bucket policies: writes scoped to `auth.uid()` folder; reads public.
- `handle_new_user` trigger change must be backward compatible (use `coalesce`).

## 10. Implementation phases (deliverable order)

1. **Migration + draft store + `/plan` shell + redirect from `/start`** — no UX regression, foundation in place.
2. **Destination + Dates/Duration steps** with new visual language.
3. **Places on radar step** + `planned_places` writes.
4. **Multi-stay step** + dashboard pin updates.
5. **Optional arrival step** (Jetstar-style, AviationStack soft-enrich).
6. **Profile step** (Google photo / upload + marker colour) + remove `AvatarPicker`.
7. **Finalize server fn + starter day-shell generator + `/plan/ready`**.
8. **Dashboard `SetupPrompts`** + coalesce nullable dates across reads.
9. Cleanup: delete deprecated `/start` wizard once `/plan` is stable.

## 11. Acceptance check (mapping to your criteria)

- Landing untouched ✅ (no edits to `index.tsx`).
- Account before save, draft survives login ✅ (Zustand + localStorage + Google redirect).
- Google profile photo + marker colour, no generated avatars ✅.
- Destination required, Places-first ✅.
- Dates OR duration ✅ (schema + UI).
- Multi planned places ✅ (new table).
- Multi stays, Places-first, shared by default ✅ (already crew-visible via trip_id).
- Flights de-emphasised + optional + manual fallback ✅.
- Vibe optional ✅.
- Starter day shells generated ✅.
- Skipped → dashboard prompts ✅.
- Invite flow preserved ✅ (`/start?invite=` redirect).
- Existing maps/discover/itinerary/chat untouched (only additive schema + new routes).

Ready to switch to build mode and start with Phase 1 (migration + shell). I'll pause after the migration for your approval before continuing.
