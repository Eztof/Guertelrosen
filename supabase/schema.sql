create extension if not exists "pgcrypto";

create table if not exists public.npcs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,

  name text not null,

  aka text,
  species text,
  culture text,
  profession text,
  titles text,

  birth_date date,
  death_date date,
  birthplace text,
  residence text,

  affiliations text,

  description text,
  appearance text,
  personality text,
  biography text,

  abilities text,
  equipment text,
  relationships text,

  notes text,
  sources text,

  tags text[]
);

create index if not exists npcs_name_idx on public.npcs (name);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.npcs;
create trigger set_updated_at
before update on public.npcs
for each row execute function public.set_updated_at();

alter table public.npcs enable row level security;

drop policy if exists "npcs_select_authenticated" on public.npcs;
create policy "npcs_select_authenticated"
on public.npcs for select
to authenticated
using (true);

drop policy if exists "npcs_insert_own" on public.npcs;
create policy "npcs_insert_own"
on public.npcs for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "npcs_update_own" on public.npcs;
create policy "npcs_update_own"
on public.npcs for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "npcs_delete_own" on public.npcs;
create policy "npcs_delete_own"
on public.npcs for delete
to authenticated
using (created_by = auth.uid());