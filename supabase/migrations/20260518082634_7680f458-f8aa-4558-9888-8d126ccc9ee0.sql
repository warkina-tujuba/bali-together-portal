
-- 1. activity_seeds
CREATE TABLE public.activity_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_slug text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'activity',
  description text,
  est_cost_usd numeric,
  est_duration_min integer,
  url text,
  image_url text,
  lat double precision,
  lng double precision,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_seeds_slug ON public.activity_seeds(destination_slug);
ALTER TABLE public.activity_seeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read seeds" ON public.activity_seeds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage seeds" ON public.activity_seeds FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. activity_swipes
CREATE TYPE swipe_verdict AS ENUM ('save', 'skip', 'must');
CREATE TABLE public.activity_swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  suggestion_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  verdict swipe_verdict NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, suggestion_key)
);
CREATE INDEX idx_activity_swipes_trip ON public.activity_swipes(trip_id);
ALTER TABLE public.activity_swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own swipes" ON public.activity_swipes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Trip members read swipes" ON public.activity_swipes FOR SELECT TO authenticated
  USING (trip_id = current_user_trip_id());

-- 3. activities.scope + owner_user_id
CREATE TYPE activity_scope AS ENUM ('core', 'personal');
ALTER TABLE public.activities ADD COLUMN scope activity_scope NOT NULL DEFAULT 'core';
ALTER TABLE public.activities ADD COLUMN owner_user_id uuid;

-- Personal items: guests manage their own
CREATE POLICY "Users manage own personal activities" ON public.activities FOR ALL TO authenticated
  USING (scope = 'personal' AND owner_user_id = auth.uid())
  WITH CHECK (scope = 'personal' AND owner_user_id = auth.uid() AND trip_id = current_user_trip_id());
