insert into public.focusos_projects (user_id, name, colour, status)
select distinct task.user_id, 'Daily Anchors', '#7c5cff', 'active'
from public.focusos_tasks task
where task.is_daily_anchor = true
  and not exists (
    select 1
    from public.focusos_projects project
    where project.user_id = task.user_id
      and project.name = 'Daily Anchors'
      and project.status = 'active'
  );

update public.focusos_tasks task
set project_id = project.id,
    updated_at = now()
from public.focusos_projects project
where task.user_id = project.user_id
  and task.is_daily_anchor = true
  and project.name = 'Daily Anchors'
  and project.status = 'active'
  and task.project_id is distinct from project.id;
