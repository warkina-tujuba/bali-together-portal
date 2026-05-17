# Trip Itinerary Portal — Build Plan

A private, invite-only portal where guests onboard via magic link, register flights & accommodation, join the group WhatsApp, and see a shared map + itinerary. Mobile-first, Airbnb-style polish.  
  
We will begin by creating a test trip; "Warkina 30th Bali"

## Design system (locked)

- Palette: jungle `#1B2B21`, terracotta `#D97757`, sand `#F5F2ED`, paper `#FDFBFA`.
- Fonts: **DM Serif Display** (headings) + **Fira Sans** (body).
- Large rounded cards (rounded-2xl/3xl), soft shadows, image-led layouts, sticky bottom action bar on mobile.
- Tokens defined in `src/styles.css` with `oklch` semantic vars; no hardcoded hex in components.

## Routes

```text
/                    Invite landing (accepts ?token=…)
/login               Magic-link request (fallback / re-entry)
/onboarding          Wizard (5 steps) — _authenticated
/dashboard           Guest dashboard — _authenticated
/itinerary           Full day-by-day timeline — _authenticated
/map                 Full-screen Mapbox stays view — _authenticated
/admin               Host dashboard — _authenticated/_admin
  /admin/invites     Create & revoke invites
  /admin/itinerary   CRUD trip days, activities
  /admin/guests      View all guests, flights, stays
```

Architecture: TanStack Start file routes, `_authenticated` layout guard, `_admin` nested guard checking `user_roles`.

## Onboarding wizard steps

1. **Identify** — confirm name from invite.
2. **Profile** — phone, dietary, room preference, avatar.
3. **Flight** — airline + flight number + date → AeroDataBox lookup → confirm arrival time/airport.
4. **Accommodation** — Mapbox Places autocomplete → pin location + nights.
5. **WhatsApp** — deep link to the group invite (stored as admin setting), mark joined.

Each step writes to its respective table immediately so guests can resume.

## Backend (Lovable Cloud)

**Auth**: Email magic link via Supabase. Invites carry a one-time token that, on accept, calls `/api/public/accept-invite` to bind the auth user to the invite row.

**Tables** (RLS on, `user_roles` pattern for admin):

- `invites` — id, token (unique), email, name, trip_id, used_at, created_by
- `profiles` — id (= auth.users.id), full_name, phone, avatar_url, dietary, notes, whatsapp_joined_at
- `user_roles` — id, user_id, role (`admin` | `guest`) — RLS via SECURITY DEFINER `has_role()`
- `trips` — id, name, destination, start_date, end_date, whatsapp_invite_url, mapbox_default_center
- `flights` — id, user_id, trip_id, airline, flight_number, scheduled_arrival, origin_iata, dest_iata, raw_api_json
- `accommodations` — id, user_id, trip_id, name, address, lat, lng, check_in, check_out, place_id
- `activities` — id, trip_id, day_date, start_time, title, description, location, cover_image_url
- `itinerary_days` — id, trip_id, day_date, title, summary

RLS: guests read trip-scoped data and write only their own flight/accommodation/profile rows; admins read/write all via `has_role(auth.uid(), 'admin')`.

**Server functions** (`src/lib/*.functions.ts`):

- `acceptInvite`, `getMyProfile`, `updateProfile`
- `lookupFlight` (calls AeroDataBox via RapidAPI, server-only key)
- `saveFlight`, `saveAccommodation`
- `getDashboard` (trip + my flight/stay + group flights + group stays + next-up activities)
- `getItinerary`, admin: `createInvite`, `listGuests`, `upsertActivity`, `upsertDay`

**Server route**: `src/routes/api/public/accept-invite.ts` for token validation.

## External APIs (real, via secrets)

- **Mapbox** — `VITE_MAPBOX_PUBLIC_TOKEN` (client) for map + Places autocomplete.
- **AeroDataBox** (RapidAPI) — `RAPIDAPI_KEY` (server-only) for flight lookup. Robust fallback: if lookup fails, guest can enter details manually.

I will request these via the secret tool after Cloud is enabled.

## Mobile-first dashboard composition

Matches the chosen prototype exactly: sticky paper-blur nav → countdown hero card with cover image → Flight Board card → Stay Map card (preview with pins, taps into `/map`) → Itinerary timeline (next 2 days) → fixed bottom pill with avatar stack + "Open WhatsApp".

## Admin

Simple guarded views: invite generator (creates token + copyable link), guest table with flight/stay status, itinerary editor (day → activities CRUD), trip settings (WhatsApp URL, dates, map default).

## Build sequence

1. Enable Lovable Cloud; create schema + RLS + `has_role`.
2. Tokens in `styles.css`, base layout (root, `_authenticated`, `_admin`), nav, fonts.
3. Auth: magic-link login + invite acceptance flow.
4. Onboarding wizard (5 steps) with resume.
5. Server fns + Mapbox & AeroDataBox integrations.
6. Dashboard, full map page, full itinerary page.
7. Admin surfaces.
8. Seed a demo trip + sample activities for preview.

## Out of scope (this pass)

Push notifications, payments, two-way WhatsApp sync, multi-trip support (single active trip), per-user OAuth into WhatsApp.