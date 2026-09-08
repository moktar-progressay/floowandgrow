create table public.focusos_external_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.focusos_tasks(id) on delete cascade,
  provider text not null check (provider in ('google_tasks', 'google_calendar')),
  external_container_id text,
  external_id text not null,
  external_updated_at timestamptz,
  last_synced_at timestamptz,
  sync_status text not null default 'pending' check (sync_status in ('synced', 'pending', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, provider),
  unique (user_id, provider, external_id)
);

create index focusos_external_links_user_task_idx
  on public.focusos_external_links (user_id, task_id);

alter table public.focusos_external_links enable row level security;

create policy "Users can read own external links"
  on public.focusos_external_links for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own external links"
  on public.focusos_external_links for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own external links"
  on public.focusos_external_links for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own external links"
  on public.focusos_external_links for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.focusos_external_links to authenticated;
