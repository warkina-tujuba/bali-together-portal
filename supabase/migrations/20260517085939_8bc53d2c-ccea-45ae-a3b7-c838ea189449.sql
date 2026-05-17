ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS is_host_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_url text,
  ADD COLUMN IF NOT EXISTS scale_adventure smallint,
  ADD COLUMN IF NOT EXISTS scale_pace smallint,
  ADD COLUMN IF NOT EXISTS scale_popularity smallint;

CREATE INDEX IF NOT EXISTS idx_activities_trip_day ON public.activities(trip_id, day_date);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_activity ON public.event_rsvps(activity_id);