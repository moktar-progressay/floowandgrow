do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.focusos_tags'::regclass
      and contype = 'u'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.focusos_tags'::regclass and attname = 'user_id'),
        (select attnum from pg_attribute where attrelid = 'public.focusos_tags'::regclass and attname = 'id')
      ]::smallint[]
  ) then
    if to_regclass('public.focusos_tags_user_id_id_key') is not null then
      alter table public.focusos_tags
        add constraint focusos_tags_user_id_id_unique
        unique using index focusos_tags_user_id_id_key;
    else
      alter table public.focusos_tags
        add constraint focusos_tags_user_id_id_unique unique (user_id, id);
    end if;
  end if;
end
$$;

create table public.focusos_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  content text not null default '' check (char_length(content) <= 50000),
  project_id uuid,
  goal_id uuid,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint focusos_notes_project_owner_fkey
    foreign key (user_id, project_id)
    references public.focusos_projects (user_id, id)
    on delete set null (project_id),
  constraint focusos_notes_goal_owner_fkey
    foreign key (user_id, goal_id)
    references public.focusos_goals (user_id, id)
    on delete set null (goal_id)
);

create table public.focusos_note_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id),
  constraint focusos_note_tags_note_owner_fkey
    foreign key (user_id, note_id)
    references public.focusos_notes (user_id, id)
    on delete cascade,
  constraint focusos_note_tags_tag_owner_fkey
    foreign key (user_id, tag_id)
    references public.focusos_tags (user_id, id)
    on delete cascade
);

create index focusos_notes_user_updated_idx
  on public.focusos_notes (user_id, updated_at desc)
  where status = 'active';

create index focusos_note_tags_user_note_idx
  on public.focusos_note_tags (user_id, note_id);

alter table public.focusos_notes enable row level security;
alter table public.focusos_note_tags enable row level security;

create policy "Users can read own notes"
  on public.focusos_notes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own notes"
  on public.focusos_notes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own notes"
  on public.focusos_notes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own notes"
  on public.focusos_notes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read own note tags"
  on public.focusos_note_tags for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own note tags"
  on public.focusos_note_tags for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own note tags"
  on public.focusos_note_tags for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own note tags"
  on public.focusos_note_tags for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.focusos_notes from anon, authenticated;
revoke all on public.focusos_note_tags from anon, authenticated;
grant select, insert, update, delete on public.focusos_notes to authenticated;
grant select, insert, update, delete on public.focusos_note_tags to authenticated;
