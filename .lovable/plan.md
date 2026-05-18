## Travel Link — full rebrand & portal rebuild

### 1. Brand

- Rename "Magic Link" → **Travel Link** everywhere (landing, nav, footer, login, meta tags, route `head()`, `WhatsAppDialog` copy, README-level strings).
- Replace `src/assets/logo.png` with a new mark (compass + link motif) generated via `imagegen` (transparent PNG, premium tier).
- Palette: **Coastal Horizon** — written into `src/styles.css` as oklch tokens:
  - `--background` ivory `#F7F4EC`, `--foreground` deep navy `#0B2545`
  - `--primary` ocean `#13315C`, `--primary-foreground` ivory
  - `--accent` coral `#EE6C4D`, `--secondary` sand `#E9D8A6`
  - `--muted` cool grey, `--ring` coral, plus `--gradient-horizon` and `--shadow-soft`
- Typography: **Sora** (display/headings) + **Inter** (body) via Google Fonts in `index.html`; map to `font-display` / `font-sans` in styles.css. Replace existing font tokens.
- Remove all hardcoded `text-white`, `bg-jungle`, etc. that don't map to the new system; refactor `LocationMarquee` overlay and landing sections to use semantic tokens.

### 2. Homepage layout fix (responsive)

Current hero forces a tall single viewport that scrolls awkwardly on mobile (767px viewport shows controls clipped). Rework `src/routes/index.tsx`:

- Hero becomes `min-h-[100svh]` flex column with **content fitting inside the viewport** at 375×667 and up — clamp typography (`text-[clamp(2.25rem,8vw,5rem)]`), tighten paddings on mobile, move "Got a magic link?" into a compact card.
- Scroll = reveal next section (How it works → Inside the portal → CTA), not "everything stacked in hero".
- Verify across 375, 414, 768, 1024, 1440. Replace `min-h-[100svh]` parallax that breaks on iOS by using `100dvh` + reduced parallax distance on `< md`.
- Keep marquee backdrop but reduce tile width on mobile and add `prefers-reduced-motion` guard.

### 3. Onboarding order (rewrite `src/routes/_authenticated/start.tsx`)

```
a. Sign in / create account     → /login (Google OAuth via lovable.auth, default)
b. Where are we going?          → destination autocomplete
c. How long are we going for?   → date-range picker (already exists, retain)
d. Add your flight details      → existing FlightPasteForm/Manual, "Skip" allowed
e. Add your accommodation       → existing Stay tabs, "Skip" allowed
f. Tell us your vibe            → sliders (Adventure↔Relax, Culture↔Party,
                                  Budget↔Luxury, Foodie↔Light, Plan-heavy↔Spontaneous)
   → LOADING SCREEN             → "Preparing recommendations for {country}"
                                  with rotating fun facts + Unsplash hero of country
g. Tinder swipe discovery       → 10-15 AI-generated activity cards, swipe
                                  right=save, left=skip, up=must-do
h. → /dashboard (portal)
```

Confirm Google OAuth is the default sign-in (`supabase--configure_social_auth providers:["google"]`), keep email as fallback.

### 4. AI recommendations (AI + curated seed)

- New table `activity_seeds` (destination_slug, title, category, est_cost_usd, est_duration_min, url, image_url, lat, lng, tags). Seed with ~40 Bali entries from existing `src/data/bali-activities.ts`.
- New server fn `recommendActivities({ tripId, vibe })` in `src/lib/recommend.functions.ts`:
  - Reads trip destination, dates, vibe sliders, and seed rows.
  - Calls Lovable AI (`google/gemini-3-flash-preview`) with seed list as context, returns 15 structured activities (Zod-validated via AI SDK `Output`).
  - Persists swipe results to new `activity_swipes` table (trip_id, user_id, activity_id, verdict: save/skip/must).
- Fallback: if destination has no seeds, AI generates from scratch.

### 5. New homepage portal (`/dashboard` rebuild)

Purpose: expose users to options. Replace current dashboard with a **two-pane "Discover + Plan"** layout:

```
┌─────────────────────── Top: trip summary, dates, crew avatars ──────────┐
│ Left (60%): masonry of expandable activity tiles                        │
│   - Tile sized by est_duration (small=≤1h, med=2-4h, large=half/full)   │
│   - Collapsed: image, title, price, duration, ★ saved-by-crew count    │
│   - Expanded (click): description, "Add" → drag to calendar, website ↗ │
│ Right (40%): week calendar (sticky), drop zones per day/time slot       │
│   Switch tab: "Shared itinerary" | "My side trips"                     │
└──────────────────────────────────────────────────────────────────────────┘
```

- Drag = `@dnd-kit/core` (already in deps if present, else install). Drop creates `itinerary_items` row with start_at, duration.
- Tile size mapped to duration via CSS grid spans.
- Mobile: calendar collapses to a bottom-sheet; tiles become single column.

### 6. Group model: Host core + personal side-trips

DB changes:
- `itinerary_items.scope` enum `'core' | 'personal'`.
- `itinerary_items.owner_user_id` (null for core; required for personal).
- RLS: anyone in trip reads core; only host writes core; users write only their own personal items.
- Host badge shown on core items in the calendar; personal items render in user's accent color.

### 7. Deletions / cleanup

- Drop "Magic Link" references and unused jungle-themed tokens in `styles.css`.
- Remove `LocationMarquee` text overlay tied to old brand if needed; reuse images.

---

### Technical task order

1. Brand + tokens: `styles.css`, `index.html` (fonts), new logo asset, `index.tsx` copy + nav, `_authenticated.tsx` nav, `WhatsAppDialog`, `login.tsx`, route `head()` meta.
2. Responsive homepage rewrite (`index.tsx`) — verify at 375/768/1440 via browser tool.
3. Migration: `activity_seeds`, `activity_swipes`, `itinerary_items.scope/owner_user_id`, RLS, seed Bali rows.
4. Onboarding rewrite (`start.tsx`) — add VibeSliders step, LoadingScreen, SwipeDeck.
5. `recommendActivities` server fn + Lovable AI wiring (`src/lib/recommend.functions.ts`).
6. Dashboard rebuild: DiscoverPane (tiles), CalendarPane (week, dnd-kit), scope toggle.
7. Configure Google OAuth via `supabase--configure_social_auth`.
8. QA pass: responsive screenshots, run through onboarding end-to-end.

### Out of scope (flag for later)

- Real activities API (GetYourGuide/Viator) — slot in once a key is provided.
- Public sharing of itineraries with non-members ("have others see your trip" read-only link) — design now, build after core works.
- Push/email notifications for itinerary changes.

Approve and I'll implement in the order above. The first batch (brand + responsive homepage) is safe to ship before the DB migration.