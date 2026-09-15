create table public.focusos_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 1 and 240),
  kind text not null check (kind in (
    'task_completed',
    'anchor_completed',
    'email_read',
    'email_archived',
    'email_replied',
    'follow_up_created',
    'focus_sprint_completed',
    'inbox_zero',
    'legacy_reward'
  )),
  source text not null default 'focusos' check (char_length(source) between 1 and 60),
  points integer not null check (points between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create index focusos_reward_events_user_occurred_idx
  on public.focusos_reward_events (user_id, occurred_at desc);

alter table public.focusos_reward_events enable row level security;

grant select on public.focusos_reward_events to authenticated;

create policy "Users can read their own reward events"
  on public.focusos_reward_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.record_focusos_reward(
  p_event_key text,
  p_kind text,
  p_source text default 'focusos',
  p_metadata jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  reward_points integer;
  inserted_id uuid;
  updated_xp integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_event_key is null or char_length(p_event_key) not between 1 and 240 then
    raise exception 'Invalid reward key';
  end if;

  if p_source is null or char_length(p_source) not between 1 and 60 then
    raise exception 'Invalid reward source';
  end if;

  reward_points := case p_kind
    when 'task_completed' then 30
    when 'anchor_completed' then 20
    when 'email_read' then 10
    when 'email_archived' then 10
    when 'email_replied' then 30
    when 'follow_up_created' then 20
    when 'focus_sprint_completed' then 20
    when 'inbox_zero' then 50
    else null
  end;

  if reward_points is null then
    raise exception 'Unknown reward kind';
  end if;

  insert into public.focusos_reward_events (
    user_id,
    event_key,
    kind,
    source,
    points,
    metadata,
    occurred_at
  ) values (
    current_user_id,
    p_event_key,
    p_kind,
    p_source,
    reward_points,
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, now())
  )
  on conflict (user_id, event_key) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    select coalesce(xp, 0)
      into updated_xp
      from public.focusos_state
      where user_id = current_user_id;

    return jsonb_build_object(
      'awarded', false,
      'points', reward_points,
      'total_xp', coalesce(updated_xp, 0)
    );
  end if;

  update public.focusos_state
    set xp = coalesce(xp, 0) + reward_points,
        updated_at = now()
    where user_id = current_user_id
    returning xp into updated_xp;

  if updated_xp is null then
    raise exception 'FocusOS state is missing';
  end if;

  return jsonb_build_object(
    'awarded', true,
    'points', reward_points,
    'total_xp', updated_xp
  );
end;
$$;

revoke all on function public.record_focusos_reward(text, text, text, jsonb, timestamptz) from public;
revoke all on function public.record_focusos_reward(text, text, text, jsonb, timestamptz) from anon;
grant execute on function public.record_focusos_reward(text, text, text, jsonb, timestamptz) to authenticated;

insert into public.focusos_reward_events (
  user_id,
  event_key,
  kind,
  source,
  points,
  metadata,
  occurred_at
)
select
  state.user_id,
  legacy.event_key,
  'legacy_reward',
  'legacy',
  0,
  jsonb_build_object('migrated', true),
  coalesce(state.updated_at, now())
from public.focusos_state as state
cross join lateral jsonb_array_elements_text(
  coalesce(state.workspace -> 'taskTownRewards', '[]'::jsonb)
) as legacy(event_key)
on conflict (user_id, event_key) do nothing;
