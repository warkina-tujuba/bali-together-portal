-- Event categories enum
DO $$ BEGIN
  CREATE TYPE public.event_category AS ENUM ('food','activity','culture','nightlife','transit','chill','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rsvp_status AS ENUM ('going','maybe','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stay_kind AS ENUM ('hotel','villa','apartment','hostel','resort','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend activities with category, image, location, timing
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS category public.event_category NOT NULL DEFAULT 'activity',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS end_time time without time zone,
  ADD COLUMN IF NOT EXISTS duration_min integer,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Extend accommodations with kind
ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS kind public.stay_kind NOT NULL DEFAULT 'other';

-- RSVPs
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  status public.rsvp_status NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_rsvps_activity_idx ON public.event_rsvps(activity_id);
CREATE INDEX IF NOT EXISTS event_rsvps_trip_idx ON public.event_rsvps(trip_id);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members read rsvps" ON public.event_rsvps;
CREATE POLICY "Trip members read rsvps" ON public.event_rsvps
  FOR SELECT TO authenticated
  USING (trip_id = public.current_user_trip_id());

DROP POLICY IF EXISTS "Users insert own rsvp" ON public.event_rsvps;
CREATE POLICY "Users insert own rsvp" ON public.event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND trip_id = public.current_user_trip_id());

DROP POLICY IF EXISTS "Users update own rsvp" ON public.event_rsvps;
CREATE POLICY "Users update own rsvp" ON public.event_rsvps
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own rsvp" ON public.event_rsvps;
CREATE POLICY "Users delete own rsvp" ON public.event_rsvps
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage rsvps" ON public.event_rsvps;
CREATE POLICY "Admins manage rsvps" ON public.event_rsvps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trip preferences (host's quiz answers)
CREATE TABLE IF NOT EXISTS public.trip_preferences (
  trip_id uuid PRIMARY KEY,
  vibes text[] NOT NULL DEFAULT '{}',
  must_do text[] NOT NULL DEFAULT '{}',
  avoid text[] NOT NULL DEFAULT '{}',
  pace integer NOT NULL DEFAULT 3,
  budget integer NOT NULL DEFAULT 2,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members read prefs" ON public.trip_preferences;
CREATE POLICY "Trip members read prefs" ON public.trip_preferences
  FOR SELECT TO authenticated
  USING (trip_id = public.current_user_trip_id());

DROP POLICY IF EXISTS "Trip admins write prefs" ON public.trip_preferences;
CREATE POLICY "Trip admins write prefs" ON public.trip_preferences
  FOR ALL TO authenticated
  USING (public.is_trip_admin(trip_id))
  WITH CHECK (public.is_trip_admin(trip_id));

CREATE TRIGGER trg_event_rsvps_updated
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_trip_preferences_updated
  BEFORE UPDATE ON public.trip_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();