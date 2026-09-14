create table if not exists public.focusos_daily_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  completion_date date not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id, completion_date),
  constraint focusos_daily_completions_task_owner_fkey
    foreign key (user_id, task_id)
    references public.focusos_tasks(user_id, id)
    on delete cascade
);

create index if not exists focusos_daily_completions_user_date_idx
  on public.focusos_daily_completions (user_id, completion_date);

alter table public.focusos_daily_completions enable row level security;

grant select, insert, delete on public.focusos_daily_completions to authenticated;

drop policy if exists "Users can read their daily completions" on public.focusos_daily_completions;
create policy "Users can read their daily completions"
  on public.focusos_daily_completions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their daily completions" on public.focusos_daily_completions;
create policy "Users can create their daily completions"
  on public.focusos_daily_completions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their daily completions" on public.focusos_daily_completions;
create policy "Users can remove their daily completions"
  on public.focusos_daily_completions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into public.focusos_daily_completions (user_id, task_id, completion_date, completed_at)
select
  user_id,
  id,
  (completed_at at time zone 'Europe/London')::date,
  completed_at
from public.focusos_tasks
where is_daily_anchor
  and status = 'completed'
  and completed_at is not null
on conflict (user_id, task_id, completion_date) do nothing;

update public.focusos_tasks
set status = 'open', completed_at = null, updated_at = now()
where is_daily_anchor
  and status = 'completed';
