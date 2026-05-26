
ALTER TABLE public.activity_seeds
  ADD COLUMN IF NOT EXISTS rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS review_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_band smallint NOT NULL DEFAULT 2;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS parked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL;

-- Add 'shared' to activity_scope enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'shared' AND enumtypid = 'public.activity_scope'::regtype) THEN
    ALTER TYPE public.activity_scope ADD VALUE 'shared';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.activity_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_id)
);

ALTER TABLE public.activity_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own subs" ON public.activity_subscriptions;
CREATE POLICY "Users manage own subs" ON public.activity_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Trip members read subs" ON public.activity_subscriptions;
CREATE POLICY "Trip members read subs" ON public.activity_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.id = activity_id AND a.trip_id = public.current_user_trip_id()
  ));

-- Replace broad read with trip-scoped read that hides personal from others
DROP POLICY IF EXISTS "Authenticated read activities" ON public.activities;
CREATE POLICY "Trip read core and shared" ON public.activities
  FOR SELECT TO authenticated
  USING (
    trip_id = public.current_user_trip_id()
    AND (scope <> 'personal'::activity_scope OR owner_user_id = auth.uid())
  );
