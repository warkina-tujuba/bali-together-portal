ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS booking_source text,
  ADD COLUMN IF NOT EXISTS booking_url text;

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS airline_iata text;