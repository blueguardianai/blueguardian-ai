-- Community database, as applied to the Supabase project. Run in order on a fresh project.
-- The public can read rows marked 'public'. Nobody writes from the browser: inserts, deletes and
-- reports go through the "share" edge function (service role).
create table public.shared_visits (
  id uuid primary key default gen_random_uuid(),
  edit_key_hash text not null,          -- sha256 of a key kept on the sharing device; lets it delete its own entry
  ip_hash text not null,                -- salted hash, only for rate limiting
  school text not null check (char_length(school) between 2 and 80),
  site text not null check (char_length(site) between 1 and 80),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  visited_at timestamptz not null,
  stage text not null check (stage in ('monitor', 'before', 'action', 'after')),
  temp real check (temp between -5 and 45),
  ph real check (ph between 0 and 14),
  litter integer check (litter between 0 and 100000),
  notes text not null default '' check (char_length(notes) <= 500),
  counts jsonb not null default '{}',   -- photos per class, e.g. {"plastic": 3}
  reports integer not null default 0,
  status text not null default 'public' check (status in ('public', 'hidden')),
  created_at timestamptz not null default now()
);

create table public.shared_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.shared_visits (id) on delete cascade,
  path text not null,                   -- object path in the storage bucket
  class text check (class in ('clean', 'plastic', 'other', 'natural')),
  created_at timestamptz not null default now()
);
create index shared_photos_visit on public.shared_photos (visit_id);
create index shared_visits_rate on public.shared_visits (ip_hash, created_at);

-- One report per visitor per visit, so a single person cannot hide an entry alone.
create table public.shared_reports (
  visit_id uuid not null references public.shared_visits (id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (visit_id, ip_hash)
);

alter table public.shared_visits enable row level security;
alter table public.shared_photos enable row level security;
alter table public.shared_reports enable row level security; -- no policies: server only

create policy "public visits are readable" on public.shared_visits
  for select to anon, authenticated using (status = 'public');
create policy "photos of public visits are readable" on public.shared_photos
  for select to anon, authenticated using (
    exists (select 1 from public.shared_visits v where v.id = visit_id and v.status = 'public'));

-- The edit key hash and IP hash must never leave the server: grant the public columns one by one.
-- `status` is included because the photos policy reads it as the visitor.
revoke all on public.shared_visits, public.shared_photos, public.shared_reports from anon, authenticated;
grant select (id, school, site, lat, lon, visited_at, stage, temp, ph, litter, notes, counts, created_at, status)
  on public.shared_visits to anon, authenticated;
grant select on public.shared_photos to anon, authenticated;

-- Public bucket: photos are readable by URL. No storage policies, so only the server can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shared', 'shared', true, 1048576, array['image/jpeg']);
