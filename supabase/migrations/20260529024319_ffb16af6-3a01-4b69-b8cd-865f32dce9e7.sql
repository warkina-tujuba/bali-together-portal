
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS cached_google_rating numeric,
  ADD COLUMN IF NOT EXISTS cached_google_review_count integer,
  ADD COLUMN IF NOT EXISTS cached_google_reviews jsonb,
  ADD COLUMN IF NOT EXISTS cached_google_photo_url text,
  ADD COLUMN IF NOT EXISTS cached_google_address text,
  ADD COLUMN IF NOT EXISTS cached_google_opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS cached_google_website_url text,
  ADD COLUMN IF NOT EXISTS google_data_last_refreshed_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_status text NOT NULL DEFAULT 'not_booked',
  ADD COLUMN IF NOT EXISTS confirmation_number text,
  ADD COLUMN IF NOT EXISTS travel_time_from_previous integer,
  ADD COLUMN IF NOT EXISTS distance_from_previous numeric;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_booking_status_check'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_booking_status_check
      CHECK (booking_status IN ('not_booked','need_to_book','booked'));
  END IF;
END $$;

ALTER TABLE public.activity_seeds
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS cached_google_rating numeric,
  ADD COLUMN IF NOT EXISTS cached_google_review_count integer,
  ADD COLUMN IF NOT EXISTS cached_google_reviews jsonb,
  ADD COLUMN IF NOT EXISTS cached_google_photo_url text,
  ADD COLUMN IF NOT EXISTS cached_google_address text,
  ADD COLUMN IF NOT EXISTS cached_google_opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS cached_google_website_url text,
  ADD COLUMN IF NOT EXISTS google_data_last_refreshed_at timestamptz;

ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_maps_url text;

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS booking_reference text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS origin_airport_place_id text,
  ADD COLUMN IF NOT EXISTS destination_airport_place_id text;

CREATE INDEX IF NOT EXISTS idx_activities_google_place_id ON public.activities(google_place_id);
CREATE INDEX IF NOT EXISTS idx_activity_seeds_google_place_id ON public.activity_seeds(google_place_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_google_place_id ON public.accommodations(google_place_id);
