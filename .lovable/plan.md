# Refocus: Exposure → Plan → Share

Strip the existing surface area down to three feature pillars. Onboarding stays out of scope for this pass; we assume the user lands with a `trip_id` and a destination.

## 1. Exposure — `/discover`

A filterable, visual catalogue of activities for the current destination.

**UI**

- Top filter bar (chips, multi-select): `Near me`, `Must do`, `Cheap` (<$25), `Foodie`, `Adventure`, `Culture`, `Nightlife`, `Family`. Plus a duration slider and a price range.
- Grid of rich activity cards: hero image, title, 1-line description, ★ rating, $ cost, ⏱ duration, distance from stay.
- Click card → `ActivityDetailDrawer` (already exists, expand): gallery, full description, reviews, address, website, "Add to plan" CTA with day picker.
- "Near me" uses the user's live location (or the trip's stay coordinates as fallback) and sorts by distance via Haversine.

**Data**

- Use existing `activity_seeds` table — add columns: `rating numeric`, `review_count int`, `price_band smallint` (1–4), `tags text[]` already present.
- Server fn `listSeeds({ destination_slug, filters, near })` returns sorted, filtered seeds.
- Seed 30–50 high-quality entries for Bali (extend `src/data/bali-activities.ts` → migration insert).

## 2. Plan — `/plan` (replaces current dashboard)

**Layout**: 60% week calendar, 40% map (already scaffolded in `WeekCalendar` + `SnapMap`).

**Calendar behavior**

- Vertical day columns, 07:00–23:00, 15-min grid.
- Activity tile height ∝ `duration_min` (already wired).
- Drag tile vertically → reschedule (already wired); drag horizontally across days → move day.
- **Travel connectors**: between consecutive activities on the same day, render a dashed line + chip "🚗 18 min · 6 km" computed via `computeLeg` (existing). Cache hits make this instant on re-render.
- Click an empty slot → AddActivitySheet (existing). Activities added from `/discover` appear here. This is also when User can create their own event (UX simialr to facebook events)
- "✨ Optimise this day" button → `optimiseDay` server fn (existing) → diff dialog → accept rewrites times.
- A key focus on a user interface that mirrors Google Calendar. 

**Map**

- Pins for stay + every activity with coords. Each day is assumed to start and finsh at day (i.e. last activity needs to direct back home)
- Polyline connects the selected day's activities in scheduled order, colored by travel mode.
- Hover tile ↔ highlight pin (two-way).

**Backlog tray** (under calendar)

- Activities added from `/discover` without a time land here. Drag onto calendar to schedule.
- New column on `activities`: `parked boolean default false` (when true, ignore day_date/start_time in calendar render).

## 3. Share — crew visibility

**Model**

- `activities.scope` already exists (`core` | `personal`). Add a third: `shared` (personal but visible to crew).
- New table `activity_subscriptions(user_id, activity_id, created_at)` — when a crew member "subscribes", a personal copy is cloned into their schedule, linked back via `source_activity_id`.
- When users clicks link and is onboarded, request is sent to user to confirm subscription. 

**UI**

- Each activity tile shows mini-avatars of crew who've subscribed at bottom of tile. 
- `/plan` has a **Crew layer toggle**: "My plan" | "Crew" | "Both". In Crew/Both, render crew members' activities as translucent tiles in their owner's avatar color.
- In `ActivityDetailDrawer`: "Subscribe — add to my plan" button (hidden for own activities). Subscribing clones the activity into the user's schedule at the same time slot.
- RLS: crew members already read each other's activities via `trip_id = current_user_trip_id()`. We keep `personal` private to the owner; only `core` and `shared` are visible to other crew.

## Database migration

```sql
-- Seeds enrichment
ALTER TABLE activity_seeds
  ADD COLUMN rating numeric(2,1),
  ADD COLUMN review_count int DEFAULT 0,
  ADD COLUMN price_band smallint DEFAULT 2;

-- Backlog tray
ALTER TABLE activities ADD COLUMN parked boolean NOT NULL DEFAULT false;

-- Sharing
ALTER TYPE activity_scope ADD VALUE 'shared';
ALTER TABLE activities ADD COLUMN source_activity_id uuid REFERENCES activities(id) ON DELETE SET NULL;

CREATE TABLE activity_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_id)
);
ALTER TABLE activity_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subs" ON activity_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Trip members read subs" ON activity_subscriptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.trip_id = current_user_trip_id()));

-- Updated RLS for activities: personal stays private, shared is visible
DROP POLICY IF EXISTS "Authenticated read activities" ON activities;
CREATE POLICY "Trip read core+shared" ON activities FOR SELECT TO authenticated
  USING (trip_id = current_user_trip_id() AND (scope IN ('core','shared') OR owner_user_id = auth.uid()));
```

## Files

**New**

- `src/routes/_authenticated/discover.tsx` — refactor existing into grid-with-filters
- `src/routes/_authenticated/plan.tsx` — replaces `dashboard.tsx` as the planning surface
- `src/components/discover/FilterBar.tsx`, `ActivityCard.tsx`
- `src/components/plan/BacklogTray.tsx`, `CrewLayerToggle.tsx`
- `src/lib/discover.functions.ts` (listSeeds, addSeedToPlan)
- `src/lib/share.functions.ts` (subscribeToActivity, setActivityScope)

**Modified**

- `src/components/dashboard/WeekCalendar.tsx` — add travel-connector lines, crew layer
- `src/components/dashboard/SnapMap.tsx` — selected-day polyline, hover sync
- `src/components/dashboard/ActivityDetailDrawer.tsx` — subscribe CTA, crew mini-avatars
- `src/lib/trip.functions.ts` — wire `parked`, `scope='shared'`

**Out of scope**

- Onboarding redesign, avatar picker tweaks, flight/stay capture
- Public (non-crew) sharing
- Walking/transit modes — driving only via `computeLeg`

## Validation

- Manually walk Exposure → add to plan → reschedule → optimise → share → subscribe as crew member B (second browser).
- Check calendar travel chips appear for 2+ activities on same day with coords.