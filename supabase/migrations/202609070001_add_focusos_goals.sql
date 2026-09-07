create table public.focusos_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  why_this_matters text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint focusos_goals_project_owner_fkey
    foreign key (user_id, project_id)
    references public.focusos_projects (user_id, id)
    on delete cascade
);

alter table public.focusos_tasks add column goal_id uuid;

alter table public.focusos_tasks
  add constraint focusos_tasks_goal_owner_fkey
  foreign key (user_id, goal_id)
  references public.focusos_goals (user_id, id)
  on delete set null (goal_id);

create index focusos_goals_user_project_idx
  on public.focusos_goals (user_id, project_id, status, sort_order);

create index focusos_tasks_user_goal_idx
  on public.focusos_tasks (user_id, goal_id)
  where goal_id is not null;

alter table public.focusos_goals enable row level security;

create policy "Users can read own goals"
  on public.focusos_goals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own goals"
  on public.focusos_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own goals"
  on public.focusos_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own goals"
  on public.focusos_goals for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.focusos_goals to authenticated;
