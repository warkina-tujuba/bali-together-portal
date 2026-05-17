
-- =========================
-- Roles
-- =========================
create type public.app_role as enum ('admin', 'guest');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users read own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Trips
-- =========================
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  whatsapp_invite_url text,
  map_center_lat double precision default -8.8290,
  map_center_lng double precision default 115.0875,
  map_default_zoom integer default 12,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "Authenticated read trips"
  on public.trips for select
  to authenticated using (true);

create policy "Admins manage trips"
  on public.trips for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Invites
-- =========================
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token text not null unique,
  email text,
  full_name text not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

create policy "Admins manage invites"
  on public.invites for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Users see invite they used"
  on public.invites for select
  to authenticated
  using (used_by = auth.uid());

-- =========================
-- Profiles
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  dietary text,
  room_preference text,
  notes text,
  whatsapp_joined_at timestamptz,
  onboarding_step integer not null default 0,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Authenticated read group profiles"
  on public.profiles for select
  to authenticated
  using (
    trip_id is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.trip_id = profiles.trip_id
    )
  );

create policy "Admins read all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Admins update profiles"
  on public.profiles for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- Flights
-- =========================
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  direction text not null default 'arrival' check (direction in ('arrival', 'departure')),
  airline text,
  flight_number text not null,
  scheduled_at timestamptz,
  origin_iata text,
  origin_city text,
  destination_iata text,
  destination_city text,
  status text,
  raw_api jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flights enable row level security;

create policy "Users manage own flights"
  on public.flights for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Trip members read group flights"
  on public.flights for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.trip_id = flights.trip_id
    )
  );

create policy "Admins manage all flights"
  on public.flights for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Accommodations
-- =========================
create table public.accommodations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  check_in date,
  check_out date,
  place_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accommodations enable row level security;

create policy "Users manage own stays"
  on public.accommodations for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Trip members read group stays"
  on public.accommodations for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.trip_id = accommodations.trip_id
    )
  );

create policy "Admins manage all stays"
  on public.accommodations for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Itinerary
-- =========================
create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_date date not null,
  title text not null,
  summary text,
  cover_image_url text,
  sort_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (trip_id, day_date)
);

alter table public.itinerary_days enable row level security;

create policy "Authenticated read days"
  on public.itinerary_days for select to authenticated using (true);

create policy "Admins manage days"
  on public.itinerary_days for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_date date not null,
  start_time time,
  title text not null,
  description text,
  location text,
  cover_image_url text,
  tags text[],
  sort_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "Authenticated read activities"
  on public.activities for select to authenticated using (true);

create policy "Admins manage activities"
  on public.activities for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Updated-at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trips_updated before update on public.trips
  for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger flights_updated before update on public.flights
  for each row execute function public.set_updated_at();
create trigger accommodations_updated before update on public.accommodations
  for each row execute function public.set_updated_at();
