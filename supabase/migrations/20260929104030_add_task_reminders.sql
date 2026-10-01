alter table public.focusos_tasks
  add column reminder_minutes_before smallint,
  add column reminder_channel text not null default 'in_app',
  add column reminder_at timestamptz,
  add column reminder_delivered_at timestamptz;

alter table public.focusos_tasks
  add constraint focusos_tasks_reminder_minutes_before_check
    check (reminder_minutes_before is null or reminder_minutes_before in (0, 5, 10, 15, 30, 60, 1440)),
  add constraint focusos_tasks_reminder_channel_check
    check (reminder_channel in ('in_app', 'browser', 'both'));

create index focusos_tasks_due_reminders_idx
  on public.focusos_tasks (user_id, reminder_at)
  where reminder_at is not null and reminder_delivered_at is null and status = 'open';

comment on column public.focusos_tasks.reminder_minutes_before is
  'Minutes before the task start to show a reminder; null means no reminder.';
comment on column public.focusos_tasks.reminder_channel is
  'Reminder delivery choice: in-app popup, browser notification, or both.';
comment on column public.focusos_tasks.reminder_at is
  'Absolute reminder instant calculated by the client from the user local task time.';
comment on column public.focusos_tasks.reminder_delivered_at is
  'Set after FocusOS has displayed the reminder so it is not repeated.';
