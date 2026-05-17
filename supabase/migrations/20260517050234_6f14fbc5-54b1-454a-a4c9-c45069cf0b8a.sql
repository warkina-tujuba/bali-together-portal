
CREATE OR REPLACE FUNCTION public.current_user_trip_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trip_id FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Authenticated read group profiles" ON public.profiles;

CREATE POLICY "Authenticated read group profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  trip_id IS NOT NULL AND trip_id = public.current_user_trip_id()
);

DROP POLICY IF EXISTS "Trip members read group stays" ON public.accommodations;
CREATE POLICY "Trip members read group stays"
ON public.accommodations
FOR SELECT
TO authenticated
USING (trip_id = public.current_user_trip_id());

DROP POLICY IF EXISTS "Trip members read group flights" ON public.flights;
CREATE POLICY "Trip members read group flights"
ON public.flights
FOR SELECT
TO authenticated
USING (trip_id = public.current_user_trip_id());
