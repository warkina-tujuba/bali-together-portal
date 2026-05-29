
# Discover page redesign — mobile-first

Reuses existing data, "Near me" geolocation, map (SnapMap), heart/save behaviour, and itinerary functions. No backend or schema changes; all work is in frontend components on `/discover` plus the activity detail drawer.

## 1. Mobile top bar (replaces big "Travel Link / Sign out" header)

Update `src/routes/_authenticated.tsx` mobile header to:
- Left: hamburger (opens a Sheet with: Profile, My plan, Saved, Host mode, Sign out)
- Centre: "Travel Link" wordmark
- Right: search icon (focuses hero search) + avatar
- Hide "Sign out" from the top bar; it moves into the hamburger sheet.

Desktop keeps the existing header.

## 2. New `/discover` layout (mobile order)

```
[ Mobile top bar ]
[ Hero card — "Discover Bali" w/ overlay + quick chips ]
[ Search row: input · Near me · Filters · Map ]
[ Horizontal-scroll category chip rail ]
[ View toggle: Grid | Map  (mobile) / Grid | Map | Split (≥md) ]
[ Activity card feed  OR  full-bleed map ]
[ Bottom nav ]
```

Removes the tall "FIND YOUR TRIP / Discover / Tap a card…" block and the inline sliders. Intro copy folds into the hero subtitle.

### Hero card (`DiscoverHero.tsx`)
- Large rounded image (use destination cover from `home.trip` if available, else a Bali fallback in `src/assets`)
- Overlay gradient + title "Discover Bali" / subtitle "Find experiences that fit your itinerary"
- Quick chips: **Near me**, **Today**, **Must do** — each toggles the matching filter and scrolls to results.

### Search row (`DiscoverSearchRow.tsx`)
Compact pill input + 3 icon buttons (Near me, Filters, Map). Replaces today's search+Near me only.

### Category rail
Refactor existing `FilterBar` chips into `CategoryRail.tsx` — single-row horizontally scrollable (snap-x, hidden scrollbar). Same chip list the spec calls for, plus a trailing "More" chip that opens the filter sheet on the Category section.

### View toggle (`ViewToggle.tsx`)
Segmented control: Grid / Map (and Split on `md+`).
- Grid → existing `ActivityCard` feed
- Map → full-height `SnapMap` with all visible seeds as pins; tapping a pin opens a compact `MapPinPreviewSheet` (image, title, ★, duration, price, distance, "View details", "Add to itinerary")
- Split (desktop) → cards left, map right; hover/select syncs highlight on both sides via a shared `hoveredId` state.

## 3. Filter bottom sheet (`FilterSheet.tsx`)

Replaces inline sliders. Uses shadcn `Sheet` (side="bottom" on mobile, "right" on `md+`). Sections:
- Trip day (Today, Tomorrow, Day 1…N derived from `home.trip` date range)
- Time of day (Morning / Afternoon / Evening / Night)
- Distance (Near me, Near hotel, 1 / 3 / 5 / 10 km)
- Category (Foodie, Adventure, Culture, Nightlife, Chill, Nature, Wellness)
- Price (Free, <$25, $25–75, $75–150, $150+)
- Duration (<1h, 1–2h, Half day, Full day)
- Traveller type (Solo, Couples, Friends, Family, Group)
- Indoor / Outdoor, Accessibility, Booking required, Fits itinerary (toggles)
- Footer: "Reset" + "Show N results"

The `DiscoverFilters` type in `FilterBar.tsx` is extended; existing server-side fields (categories, tags, price band, duration, near) keep wiring through `listDiscover`. New facets (time of day, traveller type, indoor/outdoor, etc.) are applied client-side against `seed.tags` / `seed.category` until backend fields exist — no DB changes today.

## 4. Activity card (`ActivityCard.tsx` refresh)

Keep the file; restructure to:
- Larger 4:5 image, category badge top-left, distance badge top-right, heart overlay (saves to backlog — calls `setActivityParked` clone path or a lightweight `saved` flag; for now reuses "Park it" so heart = park to backlog)
- Title (display font), 1-line sensory description
- Meta row: ★ rating · reviews · duration · `From ~$X`
- Sub-meta: area · "Best in the morning" (derived from tags: morning/sunset/evening)
- Two buttons: **Add to itinerary** (primary, opens add sheet) and **View details** (secondary, opens detail screen)

## 5. Premium detail screen (`SeedDetailDrawer.tsx` overhaul)

Switch from side Sheet to a full-screen Drawer on mobile (shadcn `Drawer`), side Sheet on `md+`:
- Full-bleed hero image, overlay back (×) and heart buttons, "1/N" counter if multiple images
- Below image: category eyebrow → big title → emotional subtitle
- Meta row: ★ · reviews · duration · price · area · suitability chips
- Sections (each a card):
  - **Why you'll love it** — 3 bullets generated from tags + category template
  - **What's included** — bullets (entry, suggested route, guide note, local tips)
  - **Good to know** — best time, what to bring, weather, accessibility, suitability
  - **Location** — embedded `SnapMap` preview pin, distance from hotel, "Open in Maps" link, "Travel time from previous itinerary item" (uses existing `computeLeg`)
  - **Reviews** — rating summary bar + 2 sample snippets
  - **Booking** — Booking required y/n/optional, provider, external link, status select (Not booked / Need to book / Booked), confirmation # + notes inputs
- **Sticky bottom CTA bar**: left "★ 4.7 · 2h · ~$15", right primary **Add to itinerary**; secondary "Book activity" link when booking URL exists.

The current inline "ADD TO PLAN" card is removed from the detail screen — the sticky CTA opens the new add sheet.

## 6. Add-to-itinerary sheet (`AddToItinerarySheet.tsx`)

New bottom sheet opened from card / detail / map preview:
- Title: "Add to itinerary"
- Activity summary row
- Day selector (chips from trip date range; "Park it" first)
- Smart time slots (Morning / Afternoon / Evening + 3 specific slot suggestions based on tags + free calendar gaps)
- Start time + auto-computed end time (start + `est_duration_min`)
- Travel time from previous activity (via `computeLeg`) — shown as helper text "28 min from previous stop"
- Conflict warning if overlap with existing activity that day
- Visibility: Just me / Share with crew
- Attendees (multi-select from crew)
- Booking status + link + confirmation # + notes
- Final CTA: "Add to itinerary"
- On success: toast + transient success card "Added to Sun 21, 8:00 AM" with **View plan / Book now / Undo**

Wires to existing `addSeedToPlan` (extended to accept `start_time`, `end_time`, `booking_*`, `attendees` — already partially supported via the activity insert path).

## 7. Bottom nav

Reorder in `_authenticated.tsx` to: **Discover · Map · Plan · Saved · Chat**. Move Host into the hamburger menu. "Saved" routes to a new `/saved` route (lightweight list of parked activities — reuses `BacklogTray` grid layout).

## 8. Copy polish
Rewrite seed descriptions in `src/data/bali-activities.ts` to the sensory style in the brief (emerald terraces example) — short pass, no schema change.

## Files

**New**
- `src/components/discover/DiscoverHero.tsx`
- `src/components/discover/DiscoverSearchRow.tsx`
- `src/components/discover/CategoryRail.tsx`
- `src/components/discover/ViewToggle.tsx`
- `src/components/discover/FilterSheet.tsx`
- `src/components/discover/MapPinPreviewSheet.tsx`
- `src/components/discover/AddToItinerarySheet.tsx`
- `src/routes/_authenticated/saved.tsx`

**Modified**
- `src/routes/_authenticated/discover.tsx` — new layout, view state, sheet wiring
- `src/routes/_authenticated.tsx` — mobile top bar + bottom nav order + hamburger
- `src/components/discover/ActivityCard.tsx` — richer card
- `src/components/discover/SeedDetailDrawer.tsx` — premium detail + sticky CTA (remove inline add-to-plan)
- `src/components/discover/FilterBar.tsx` — extend `DiscoverFilters` type, export presets reused by `FilterSheet`
- `src/lib/discover.functions.ts` — extend `addSeedToPlan` payload (start/end time, booking, attendees), filter passthroughs where useful
- `src/data/bali-activities.ts` — sensory copy

## Out of scope
- Backend schema changes (new facets are client-side filters for now)
- Real reviews data (uses rating/count + 2 placeholder snippets)
- Multi-image galleries (single hero image; counter hidden when only 1 image)
- Onboarding, host flows, payments
