## Scope

Five things in one pass. Mapbox is being set up by you separately — I'll keep the current OpenStreetMap pin for stays for now, and wire Mapbox in a follow-up once the token lands.

### 1. New Magic Link logo
Generate a fresh transparent-PNG logo that reads as "magic link" (envelope + pin/sparkle), drop into `src/assets/logo.png`, reuse on home + header.

### 2. Homepage — sliding global locations background
- Replace the static Unsplash hero with a CSS keyframe marquee of 6–8 destination photos (Bali, Tokyo, Lisbon, Marrakech, Reykjavik, NYC, Cape Town, Queenstown) sliding horizontally behind a dark gradient overlay.
- Tighten copy and flow: hero → "How it works" (3 steps) → portal preview → real-trip showcase. Drop redundant "what's in the portal" 4-up since "how it works" already covers it.
- Single primary CTA per section.

### 3. Onboarding — PNR / booking-reference first, manual secondary (flights)
- Replace `StepFlight` with two tabs: **"Paste booking" (default)** and **"Add manually"**.
- "Paste booking" = single big textarea — user pastes the confirmation email body, booking reference, or even a flight number + date line. New server fn `parseFlightText` calls Lovable AI Gateway (`google/gemini-2.5-flash`, JSON mode) → returns `{airline, flight_number, scheduled_at, origin_iata, destination_iata, confidence}`. Show parsed fields in editable preview, user confirms → saves.
- Be honest in copy: "Paste your airline confirmation email — we'll pull out the flight number, date and route. If it's a booking reference only (e.g. `XYZ123`), add the airline name with it so we can look it up."
- Manual tab = the existing form, kept as fallback.

### 4. Onboarding — paste-a-link stays (best UX for accommodation)
- Replace `StepStay` with two tabs: **"Paste booking" (default)** and **"Search by name"**.
- "Paste booking" = textarea/url field. New server fn `parseStayText` runs AI extraction on pasted confirmation text or URL → returns `{name, address, check_in, check_out, booking_source, booking_url}`. We then geocode the address via the existing `geocode` fn to get lat/lng for the pin.
- Detect source (booking.com, airbnb.com, agoda, etc.) from URL host for the badge.
- "Search by name" tab = existing geocode search, kept.

### 5. Remove WhatsApp, add native group chat
- New table `messages` (id, trip_id, user_id, body, created_at) with RLS — trip members read/write only their trip. Realtime enabled.
- New server fns: `listMessages`, `sendMessage`.
- New route `/_authenticated/chat` — full-height chat UI with avatars (heroes!), live updates via Supabase Realtime subscription.
- Dashboard: replace WhatsApp tile/banner/dialog with **"Group chat"** tile linking to `/chat`. Remove `WhatsAppDialog` imports. Drop WhatsApp from onboarding (now 4 steps: Welcome → Profile → Flight → Stay; chat is discoverable from the dashboard, no forced step).
- Keep `whatsapp_invite_url` column for now (don't break existing data); just stop surfacing it in UI.

## Technical notes

- AI parsing uses existing `LOVABLE_API_KEY` (already in secrets). Strict JSON mode. Returns `confidence: "high"|"medium"|"low"` so the UI can warn if low.
- Locations marquee uses pure CSS `@keyframes` + duplicated track for seamless loop. No JS.
- Messages table migration is the only DB change.
- No boarding-pass scan (per your instruction).
- Mapbox swap deferred until you share the token — current Leaflet/OSM map keeps working.

## Files

**New**
- `src/routes/_authenticated/chat.tsx` — group chat UI
- `src/components/trip/FlightPasteForm.tsx`, `FlightManualForm.tsx`
- `src/components/trip/StayPasteForm.tsx`, `StaySearchForm.tsx`
- `src/components/home/LocationMarquee.tsx`
- `supabase/migrations/<ts>_messages.sql`

**Edited**
- `src/lib/trip.functions.ts` — add `parseFlightText`, `parseStayText`, `listMessages`, `sendMessage`
- `src/routes/_authenticated/onboarding.tsx` — new flight/stay steps, drop WhatsApp step
- `src/routes/_authenticated/dashboard.tsx` — group chat replaces WhatsApp
- `src/routes/index.tsx` — marquee hero, flow rework
- `src/assets/logo.png` — regenerated

Approve to ship.
