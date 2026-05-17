
-- Invites: allow multi-use magic links
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS max_uses int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS uses_count int NOT NULL DEFAULT 0;

-- Helper: is caller admin of a given trip (any user_roles row of 'admin'
-- for this user combined with profiles.trip_id match). Simpler: caller has
-- created (and is linked to) this trip AND has admin role.
CREATE OR REPLACE FUNCTION public.is_trip_admin(_trip_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND p.trip_id = _trip_id
  );
$$;

-- Trips: allow authenticated users to create trips, and trip admins to manage their trip
CREATE POLICY "Authenticated create trips"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Trip admins update their trip"
  ON public.trips FOR UPDATE TO authenticated
  USING (public.is_trip_admin(id))
  WITH CHECK (public.is_trip_admin(id));

-- Itinerary days: trip admins can manage
CREATE POLICY "Trip admins manage days"
  ON public.itinerary_days FOR ALL TO authenticated
  USING (public.is_trip_admin(trip_id))
  WITH CHECK (public.is_trip_admin(trip_id));

-- Activities: trip admins can manage
CREATE POLICY "Trip admins manage activities"
  ON public.activities FOR ALL TO authenticated
  USING (public.is_trip_admin(trip_id))
  WITH CHECK (public.is_trip_admin(trip_id));
