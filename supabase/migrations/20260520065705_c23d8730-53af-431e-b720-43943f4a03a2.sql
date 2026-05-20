alter table public.activities
  add column if not exists cost_usd numeric,
  add column if not exists website_url text;

create table if not exists public.route_legs (
  id uuid primary key default gen_random_uuid(),
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  hour_bucket smallint not null,
  mode text not null default 'drive',
  duration_min integer not null,
  distance_km numeric not null,
  polyline text,
  fetched_at timestamptz not null default now()
);
create index if not exists route_legs_lookup
  on public.route_legs (origin_lat, origin_lng, dest_lat, dest_lng, hour_bucket, mode);
alter table public.route_legs enable row level security;
create policy "Authenticated read legs" on public.route_legs for select to authenticated using (true);
create policy "Authenticated insert legs" on public.route_legs for insert to authenticated with check (true);