-- Profiles: marker colour, google/uploaded avatar split, auth provider
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marker_colour text,
  ADD COLUMN IF NOT EXISTS google_avatar_url text,
  ADD COLUMN IF NOT EXISTS uploaded_avatar_url text,
  ADD COLUMN IF NOT EXISTS auth_provider text;

-- Trips: support duration-only mode + structured destination
ALTER TABLE public.trips
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS duration_days int,
  ADD COLUMN IF NOT EXISTS duration_nights int,
  ADD COLUMN IF NOT EXISTS dates_flexible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS destination_place_id text,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lng double precision,
  ADD COLUMN IF NOT EXISTS destination_google_maps_url text;

-- itinerary_days: placeholder flag + prompt for starter shells
ALTER TABLE public.itinerary_days
  ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt text;

-- New: planned_places (areas/towns/neighbourhoods on the user's radar)
CREATE TABLE IF NOT EXISTS public.planned_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  google_place_id text,
  lat double precision,
  lng double precision,
  nights int,
  start_date date,
  end_date date,
  source text NOT NULL DEFAULT 'google_places',
  sort_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_places TO authenticated;
GRANT ALL ON public.planned_places TO service_role;

ALTER TABLE public.planned_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew read planned places"
  ON public.planned_places FOR SELECT TO authenticated
  USING (trip_id = current_user_trip_id());

CREATE POLICY "Crew insert planned places"
  ON public.planned_places FOR INSERT TO authenticated
  WITH CHECK (trip_id = current_user_trip_id() AND created_by = auth.uid());

CREATE POLICY "Owner updates own planned places"
  ON public.planned_places FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owner deletes own planned places"
  ON public.planned_places FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Trip admins manage planned places"
  ON public.planned_places FOR ALL TO authenticated
  USING (is_trip_admin(trip_id))
  WITH CHECK (is_trip_admin(trip_id));

CREATE INDEX IF NOT EXISTS idx_planned_places_trip ON public.planned_places(trip_id);

-- Storage bucket for uploaded profile photos (public read, owner write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Profile photos are publicly readable'
  ) THEN
    CREATE POLICY "Profile photos are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users upload own profile photo'
  ) THEN
    CREATE POLICY "Users upload own profile photo"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users update own profile photo'
  ) THEN
    CREATE POLICY "Users update own profile photo"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1])
      WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users delete own profile photo'
  ) THEN
    CREATE POLICY "Users delete own profile photo"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Update handle_new_user to also persist google avatar + auth provider
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name, avatar_url, google_avatar_url, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    coalesce(
      new.raw_app_meta_data->>'provider',
      'email'
    )
  )
  on conflict (id) do update
    set
      full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      google_avatar_url = coalesce(public.profiles.google_avatar_url, excluded.google_avatar_url),
      auth_provider = coalesce(public.profiles.auth_provider, excluded.auth_provider),
      email = coalesce(public.profiles.email, excluded.email);
  return new;
end;
$function$;