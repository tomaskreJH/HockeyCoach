-- Spusť jednou v Supabase: SQL Editor -> New query -> vložit -> Run
create table if not exists public.docs (
  coll text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create or replace function public.docs_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs
  for each row execute function public.docs_touch();
alter table public.docs enable row level security;
drop policy if exists "hokej access" on public.docs;
create policy "hokej access" on public.docs for all to anon using (true) with check (true);
