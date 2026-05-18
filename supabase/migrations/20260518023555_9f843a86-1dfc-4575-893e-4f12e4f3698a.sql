
-- Trip join requests
CREATE TABLE public.trip_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  UNIQUE (trip_id, user_id)
);
ALTER TABLE public.trip_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own join request"
  ON public.trip_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own join request"
  ON public.trip_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Trip admins read requests"
  ON public.trip_join_requests FOR SELECT TO authenticated
  USING (public.is_trip_admin(trip_id));

CREATE POLICY "Trip admins decide requests"
  ON public.trip_join_requests FOR UPDATE TO authenticated
  USING (public.is_trip_admin(trip_id))
  WITH CHECK (public.is_trip_admin(trip_id));

CREATE POLICY "Admins manage join requests"
  ON public.trip_join_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Join codes on trips
ALTER TABLE public.trips ADD COLUMN join_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8);
UPDATE public.trips SET join_code = substr(md5(random()::text || id::text), 1, 8) WHERE join_code IS NULL;

-- AI suggestions cache
CREATE TABLE public.ai_suggestions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination text NOT NULL,
  filters_hash text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination, filters_hash)
);
ALTER TABLE public.ai_suggestions_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ai cache"
  ON public.ai_suggestions_cache FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage ai cache"
  ON public.ai_suggestions_cache FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_join_requests_trip_status ON public.trip_join_requests (trip_id, status);
