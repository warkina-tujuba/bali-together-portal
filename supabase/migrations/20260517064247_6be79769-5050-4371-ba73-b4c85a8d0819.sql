CREATE TABLE public.live_locations (
  user_id UUID NOT NULL PRIMARY KEY,
  trip_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  sharing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members read live locations"
ON public.live_locations FOR SELECT TO authenticated
USING (trip_id = current_user_trip_id());

CREATE POLICY "Users upsert own location"
ON public.live_locations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND trip_id = current_user_trip_id());

CREATE POLICY "Users update own location"
ON public.live_locations FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own location"
ON public.live_locations FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins manage all locations"
ON public.live_locations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.live_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;