-- Bus&Go Ltd: initial schema
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Every table has row-level security on. Status changes are guarded by triggers,
-- so a school can never approve its own bus and a hirer can never confirm their own booking.

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type public.user_role      as enum ('customer', 'school', 'admin');
create type public.school_status  as enum ('draft', 'submitted', 'verified', 'rejected', 'suspended');
create type public.bus_status     as enum ('draft', 'submitted', 'listed', 'rejected', 'paused');
create type public.booking_status as enum ('requested', 'accepted', 'declined', 'deposit_paid', 'completed', 'cancelled');
create type public.doc_kind       as enum ('school_registration', 'board_resolution', 'id_document', 'logbook', 'insurance', 'inspection', 'other');

-- ---------- helpers ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  phone       text not null default '',
  org_name    text not null default '',
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- True for admins, and for trusted server-side access (SQL editor, migrations, service key),
-- which carries no end-user JWT. Normal signed-in and anonymous requests are never privileged.
create or replace function public.is_privileged() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', 'service_role') = 'service_role';
$$;

-- New sign-ups get a profile. Role can only be customer or school from the sign-up form.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.user_role := 'customer';
begin
  if coalesce(new.raw_user_meta_data->>'role', '') = 'school' then r := 'school'; end if;
  insert into public.profiles (id, full_name, email, phone, org_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.email, ''),
          coalesce(new.raw_user_meta_data->>'phone', ''),
          coalesce(new.raw_user_meta_data->>'org_name', ''),
          r);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Users may edit their own name/phone/org but not their role.
create or replace function public.guard_profile() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_privileged() then
    raise exception 'Only an admin can change a user role';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile();

-- ---------- settings ----------
create table public.settings (
  id               int primary key default 1 check (id = 1),
  commission_pct   numeric(5,2) not null default 15,
  deposit_pct      numeric(5,2) not null default 30,
  driver_bonus_ugx int not null default 30000,
  support_phone    text not null default '',
  support_whatsapp text not null default '',
  support_email    text not null default '',
  -- Shown to a hirer once a school accepts: where to send the deposit and what reference to use.
  payment_instructions text not null default 'Send the deposit by MTN or Airtel Mobile Money to the Bus&Go number we share with you, and use your booking reference as the reason. We confirm within a few working hours.'
);
insert into public.settings (id) values (1);

-- ---------- schools ----------
create table public.schools (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null unique references public.profiles(id) on delete cascade,
  name           text not null,
  district       text not null,
  area           text not null default '',
  status         public.school_status not null default 'draft',
  admin_note     text not null default '',
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger schools_touch before update on public.schools for each row execute function public.touch_updated_at();

-- Owners may move draft/rejected -> submitted. Everything else is admin-only.
create or replace function public.guard_school() returns trigger
language plpgsql as $$
begin
  if public.is_privileged() then
    if new.status = 'verified' and old.status is distinct from 'verified' then new.verified_at := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted') then raise exception 'New schools start as draft or submitted'; end if;
    new.admin_note := ''; new.verified_at := null;
    return new;
  end if;
  if new.status is distinct from old.status
     and not (old.status in ('draft', 'rejected') and new.status = 'submitted') then
    raise exception 'Only Bus&Go can change this school''s status';
  end if;
  new.admin_note := old.admin_note; new.verified_at := old.verified_at; new.owner_id := old.owner_id;
  return new;
end $$;
create trigger schools_guard before insert or update on public.schools for each row execute function public.guard_school();

create or replace function public.owns_school(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.schools where id = sid and owner_id = auth.uid());
$$;

-- Contact and payout details are private: only the school and the Bus&Go team can read them,
-- so hirers can't bypass the platform. A hirer gets the school's contact once their deposit is paid.
create table public.school_private (
  school_id      uuid primary key references public.schools(id) on delete cascade,
  contact_name   text not null default '',
  contact_phone  text not null default '',
  contact_email  text not null default '',
  payout_method  text not null default 'mtn' check (payout_method in ('mtn', 'airtel', 'bank')),
  payout_account text not null default '',
  payout_name    text not null default '',
  updated_at     timestamptz not null default now()
);
create trigger school_private_touch before update on public.school_private for each row execute function public.touch_updated_at();

-- ---------- buses ----------
create table public.buses (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  make_model       text not null,
  plate            text not null,
  seats            int  not null check (seats between 7 and 90),
  year             int  check (year between 1980 and 2100),
  has_ac           boolean not null default false,
  has_seatbelts    boolean not null default true,
  has_gps          boolean not null default false,
  driver_included  boolean not null default true,
  driver_name      text not null default '',
  daily_ugx        int not null check (daily_ugx > 0),
  weekly_ugx       int check (weekly_ugx > 0),
  monthly_ugx      int check (monthly_ugx > 0),
  description      text not null default '',
  photos           text[] not null default '{}',
  insurer          text not null default '',
  insurance_expiry date,
  inspected_on     date,
  inspected_by     text not null default '',
  status           public.bus_status not null default 'draft',
  admin_note       text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (plate)
);
create index buses_school_idx on public.buses(school_id);
create index buses_listed_idx on public.buses(status, seats);
create trigger buses_touch before update on public.buses for each row execute function public.touch_updated_at();

-- Owners: draft/rejected -> submitted, listed <-> paused. Inspection fields and approval are admin-only.
create or replace function public.guard_bus() returns trigger
language plpgsql as $$
begin
  if public.is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted') then raise exception 'New buses start as draft or submitted'; end if;
    new.inspected_on := null; new.inspected_by := ''; new.admin_note := '';
    return new;
  end if;
  if new.status is distinct from old.status and not (
       (old.status in ('draft', 'rejected') and new.status = 'submitted') or
       (old.status = 'listed' and new.status = 'paused') or
       (old.status = 'paused' and new.status = 'listed')) then
    raise exception 'Only Bus&Go can change this bus''s status';
  end if;
  -- Changing the plate or seat count on a live bus sends it back for review.
  if old.status in ('listed', 'paused') and (new.plate is distinct from old.plate or new.seats is distinct from old.seats) then
    new.status := 'submitted';
  end if;
  new.inspected_on := old.inspected_on; new.inspected_by := old.inspected_by;
  new.admin_note := old.admin_note; new.school_id := old.school_id;
  return new;
end $$;
create trigger buses_guard before insert or update on public.buses for each row execute function public.guard_bus();

create or replace function public.bus_is_public(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.buses b join public.schools s on s.id = b.school_id
                 where b.id = bid and b.status = 'listed' and s.status = 'verified');
$$;
create or replace function public.owns_bus(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.buses b join public.schools s on s.id = b.school_id
                 where b.id = bid and s.owner_id = auth.uid());
$$;

-- ---------- availability (days the school keeps for itself) ----------
create table public.blackouts (
  bus_id uuid not null references public.buses(id) on delete cascade,
  day    date not null,
  primary key (bus_id, day)
);

-- ---------- documents ----------
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  bus_id      uuid references public.buses(id) on delete cascade,
  kind        public.doc_kind not null,
  path        text not null,
  file_name   text not null default '',
  uploaded_at timestamptz not null default now()
);
create index documents_school_idx on public.documents(school_id);

-- ---------- bookings ----------
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique default ('BG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  bus_id         uuid not null references public.buses(id) on delete restrict,
  customer_id    uuid not null references public.profiles(id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  pickup         text not null,
  destination    text not null,
  passengers     int not null check (passengers > 0),
  purpose        text not null,
  note           text not null default '',
  contact_name   text not null,
  contact_phone  text not null,
  quote_ugx      int not null check (quote_ugx >= 0),
  deposit_ugx    int not null check (deposit_ugx >= 0),
  commission_pct numeric(5,2) not null,
  status         public.booking_status not null default 'requested',
  school_note    text not null default '',
  admin_note     text not null default '',
  payment_ref    text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date >= start_date)
);
create index bookings_bus_idx on public.bookings(bus_id, start_date);
create index bookings_customer_idx on public.bookings(customer_id);
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

create or replace function public.days_taken(bid uuid, d1 date, d2 date, ignore uuid default null)
returns table(day date, reason text)
language sql stable security definer set search_path = public as $$
  select x.day, 'school'::text from public.blackouts x where x.bus_id = bid and x.day between d1 and d2
  union
  select g::date, 'booked' from public.bookings k, generate_series(greatest(k.start_date, d1), least(k.end_date, d2), interval '1 day') g
  where k.bus_id = bid and k.status in ('accepted', 'deposit_paid') and k.start_date <= d2 and k.end_date >= d1
    and (ignore is null or k.id <> ignore);
$$;

-- Price is always worked out here from the bus's own rates, never trusted from the browser.
create or replace function public.quote_for(bid uuid, d1 date, d2 date) returns int
language plpgsql stable security definer set search_path = public as $$
declare b public.buses; n int := d2 - d1 + 1; q int;
begin
  select * into b from public.buses where id = bid;
  if b.monthly_ugx is not null and n >= 30 then
    q := (n / 30) * b.monthly_ugx + least((n % 30) * b.daily_ugx, b.monthly_ugx);
  elsif b.weekly_ugx is not null and n >= 7 then
    q := (n / 7) * b.weekly_ugx + least((n % 7) * b.daily_ugx, b.weekly_ugx);
  else
    q := n * b.daily_ugx;
  end if;
  return q;
end $$;
grant execute on function public.quote_for(uuid, date, date) to anon, authenticated;

-- Who may move a booking where:
--   hirer:  requested|accepted -> cancelled
--   school: requested -> accepted|declined, accepted -> cancelled, deposit_paid -> completed
--   admin:  anything
create or replace function public.guard_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare is_owner boolean; s public.booking_status; sn text;
begin
  if tg_op = 'INSERT' then
    if public.is_privileged() then return new; end if;
    if new.customer_id <> auth.uid() then raise exception 'Bookings must be made by the signed-in user'; end if;
    if not public.bus_is_public(new.bus_id) then raise exception 'This bus is not available for hire'; end if;
    if new.start_date <= current_date then raise exception 'Choose a start date after today'; end if;
    if exists (select 1 from public.days_taken(new.bus_id, new.start_date, new.end_date)) then
      raise exception 'The bus is not free on some of those days';
    end if;
    new.status := 'requested'; new.school_note := ''; new.admin_note := ''; new.payment_ref := '';
    new.commission_pct := (select commission_pct from public.settings where id = 1);
    new.quote_ugx := public.quote_for(new.bus_id, new.start_date, new.end_date);
    new.deposit_ugx := round(new.quote_ugx * (select deposit_pct from public.settings where id = 1) / 100, -3);
    return new;
  end if;

  if public.is_privileged() then return new; end if;
  is_owner := public.owns_bus(old.bus_id);

  if new.status is distinct from old.status then
    if old.customer_id = auth.uid() and new.status = 'cancelled' and old.status in ('requested', 'accepted') then
      null;
    elsif is_owner and (
         (old.status = 'requested' and new.status in ('accepted', 'declined')) or
         (old.status = 'accepted' and new.status = 'cancelled') or
         (old.status = 'deposit_paid' and new.status = 'completed')) then
      if new.status = 'accepted' and exists (select 1 from public.days_taken(old.bus_id, old.start_date, old.end_date, old.id)) then
        raise exception 'Those days are already taken by another booking or school use';
      end if;
    else
      raise exception 'You cannot change this booking to %', new.status;
    end if;
  end if;

  -- Outside admin, only the status (checked above) and the school's note can change.
  s := new.status; sn := new.school_note;
  new := old;
  new.status := s;
  if is_owner then new.school_note := sn; end if;
  return new;
end $$;
create trigger bookings_guard before insert or update on public.bookings for each row execute function public.guard_booking();

-- ---------- row level security ----------
alter table public.profiles  enable row level security;
alter table public.settings  enable row level security;
alter table public.schools   enable row level security;
alter table public.school_private enable row level security;
alter table public.buses     enable row level security;
alter table public.blackouts enable row level security;
alter table public.documents enable row level security;
alter table public.bookings  enable row level security;

create policy "own profile"        on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin());
-- Schools see the name and phone of hirers who booked their buses.
create policy "school sees hirers" on public.profiles for select using (
  exists (select 1 from public.bookings k where k.customer_id = profiles.id and public.owns_bus(k.bus_id)));

create policy "read settings"  on public.settings for select using (true);
create policy "admin settings" on public.settings for update using (public.is_admin());

create policy "public verified schools" on public.schools for select using (status = 'verified' or owner_id = auth.uid() or public.is_admin());
create policy "create own school"       on public.schools for insert with check (owner_id = auth.uid());
create policy "update own school"       on public.schools for update using (owner_id = auth.uid() or public.is_admin());
create policy "admin delete school"     on public.schools for delete using (public.is_admin());

create policy "own private details"    on public.school_private for select using (public.owns_school(school_id) or public.is_admin());
create policy "add private details"    on public.school_private for insert with check (public.owns_school(school_id));
create policy "update private details" on public.school_private for update using (public.owns_school(school_id) or public.is_admin());

create policy "public listed buses" on public.buses for select using (public.bus_is_public(id) or public.owns_school(school_id) or public.is_admin());
create policy "add own bus"         on public.buses for insert with check (public.owns_school(school_id));
create policy "update own bus"      on public.buses for update using (public.owns_school(school_id) or public.is_admin());
create policy "delete own draft"    on public.buses for delete using ((public.owns_school(school_id) and status in ('draft', 'rejected')) or public.is_admin());

create policy "read blackouts"  on public.blackouts for select using (public.bus_is_public(bus_id) or public.owns_bus(bus_id) or public.is_admin());
create policy "set blackouts"   on public.blackouts for insert with check (public.owns_bus(bus_id) or public.is_admin());
create policy "clear blackouts" on public.blackouts for delete using (public.owns_bus(bus_id) or public.is_admin());

create policy "own documents"    on public.documents for select using (public.owns_school(school_id) or public.is_admin());
create policy "upload documents" on public.documents for insert with check (public.owns_school(school_id));
create policy "remove documents" on public.documents for delete using (public.owns_school(school_id) or public.is_admin());

create policy "see bookings"  on public.bookings for select using (customer_id = auth.uid() or public.owns_bus(bus_id) or public.is_admin());
create policy "make booking"  on public.bookings for insert with check (customer_id = auth.uid());
create policy "move booking"  on public.bookings for update using (customer_id = auth.uid() or public.owns_bus(bus_id) or public.is_admin());

-- The school's contact, for the hirer of a paid booking (and for admins).
create or replace function public.school_contact(bk uuid)
returns table(school_name text, contact_name text, contact_phone text)
language sql stable security definer set search_path = public as $$
  select s.name, p.contact_name, p.contact_phone
  from public.bookings k join public.buses b on b.id = k.bus_id join public.schools s on s.id = b.school_id
  left join public.school_private p on p.school_id = s.id
  where k.id = bk and ((k.customer_id = auth.uid() and k.status in ('deposit_paid', 'completed')) or public.is_admin());
$$;
grant execute on function public.school_contact(uuid) to authenticated;

-- Public can check which days a listed bus is taken, without seeing who booked it.
grant execute on function public.days_taken(uuid, date, date, uuid) to anon, authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('bus-photos', 'bus-photos', true)  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents',  'documents',  false) on conflict (id) do nothing;

-- Files live under <school_id>/..., so the first folder decides who owns them.
create policy "photos readable"   on storage.objects for select using (bucket_id = 'bus-photos');
create policy "photos upload"     on storage.objects for insert with check (bucket_id = 'bus-photos' and public.owns_school(((storage.foldername(name))[1])::uuid));
create policy "photos delete"     on storage.objects for delete using (bucket_id = 'bus-photos' and (public.owns_school(((storage.foldername(name))[1])::uuid) or public.is_admin()));
create policy "documents read"    on storage.objects for select using (bucket_id = 'documents' and (public.owns_school(((storage.foldername(name))[1])::uuid) or public.is_admin()));
create policy "documents upload"  on storage.objects for insert with check (bucket_id = 'documents' and public.owns_school(((storage.foldername(name))[1])::uuid));
create policy "documents delete"  on storage.objects for delete using (bucket_id = 'documents' and (public.owns_school(((storage.foldername(name))[1])::uuid) or public.is_admin()));
