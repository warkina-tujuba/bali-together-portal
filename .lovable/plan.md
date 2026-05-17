## Goal

End-to-end host journey: sign up with Google → pick avatar → choose **Create a trip** or **Join with a magic link** → if creating, build the trip (name, occasion, destination, dates), add your own flight + stay (with house pin on map), let AI draft the days, add events, then publish a Magic Link to invite the crew.

Today the app assumes one admin-created trip and invite-only joining. We're turning every user into a potential host.

## Flow

```
Login (Google / email)
   │
   ├─ has invite token in URL?  ──► Join flow (existing): accept invite → onboarding → dashboard
   │
   └─ no invite ──► /choose
                      ├─ "Create a trip"  → /trip/new (multi-step wizard)
                      └─ "Join with a code" → paste token → join flow
```

### Create-a-trip wizard (`/trip/new`)

Single route, 5 short steps, progress bar, save-as-you-go.

1. **Trip basics** — name, occasion (Birthday / Bachelorette / Honeymoon / Reunion / Just because — chips), destination (geocoded), start + end dates, optional description. Creates the `trips` row, links host's `profiles.trip_id`, grants host the `admin` role.
2. **Your hero** — avatar picker (Marvel / DC / Pokémon) + full name. Reuses existing `AvatarPicker`.
3. **Your flight** — paste-booking-first (existing `FlightPasteForm`), manual fallback. Optional ("Skip — I'll add later").
4. **Your stay** — paste-booking-first (existing `StayPasteForm`), search fallback. Auto-geocoded → becomes a house-icon pin on the trip map. Optional.
5. **Plan & invite** — "Draft my days with AI" button calls `suggestItinerary`, shows day cards, host can **Add event** to any day (inline form: title, time, location). Then **Publish & copy Magic Link** generates the invite token and copies `https://…/?invite=TOKEN` to clipboard.

After publish → `/dashboard`.

### Map house pin

Replace the generic green dot for stays in `/map` with a house emoji marker on a white circle so accommodations read differently from live-location avatars.

## Backend changes

New server functions in `src/lib/trip.functions.ts`:

- `createTrip({ name, occasion, destination, lat, lng, start_date, end_date, description })` — inserts trip, sets caller as `admin` in `user_roles`, sets `profiles.trip_id`.
- `createMagicLink({ full_name?, email?, max_uses? })` — host-only (checks admin); returns `{ token, url }`. Loosen current admin-only `adminCreateInvite` by adding this host-scoped variant that uses caller's `trip_id` instead of the single `is_active` trip.
- `addActivity({ day_date, title, start_time?, location?, description? })` — inserts into `activities`, host-only on their trip.
- `saveItineraryDays({ days: [{date,title,summary?}] })` — persists AI-drafted days into `itinerary_days` so they survive reload.

DB migration:
- `invites`: add `max_uses int default 1`, `uses_count int default 0`. Tweak `acceptInvite` to check `uses_count < max_uses` instead of single-use `used_at`. Keep `used_at` for backwards compat.
- `activities`: add RLS policy `Trip admins manage activities` (currently only global admin can write).
- `itinerary_days`: same — trip admins can write their own trip's days.
- `trips`: allow authenticated insert (with check that caller becomes admin via app logic).

## Files

**New**
- `src/routes/choose.tsx` — post-login fork (Create vs Join)
- `src/routes/_authenticated/trip.new.tsx` — wizard
- `src/components/trip/EventForm.tsx` — inline add-event form
- `src/components/trip/OccasionPicker.tsx` — chip selector
- `supabase/migrations/<ts>_host_flow.sql`

**Edited**
- `src/lib/trip.functions.ts` — add `createTrip`, `createMagicLink`, `addActivity`, `saveItineraryDays`; relax `acceptInvite` for multi-use tokens
- `src/routes/login.tsx` — redirect to `/choose` (not `/onboarding`) when no invite
- `src/routes/_authenticated/onboarding.tsx` — keep for joiners; if profile has no `trip_id`, redirect to `/choose`
- `src/routes/_authenticated/dashboard.tsx` — surface "Copy magic link" button for hosts (replaces send-magic-link CTA)
- `src/routes/_authenticated/map.tsx` — house emoji markers for stays
- `src/routes/_authenticated.tsx` — add "New trip" entry in top nav for signed-in users without a trip

## Out of scope (this pass)

- Multi-trip per user (still one trip per profile via `profiles.trip_id`)
- Editing trip basics after creation
- Event editing/deletion UI (only add)
- Email-send of magic link (copy-to-clipboard only — matches your "copy and paste anywhere" requirement)

Approve to ship.
