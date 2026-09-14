alter table public.focusos_external_links
  drop constraint if exists focusos_external_links_provider_check;

alter table public.focusos_external_links
  add constraint focusos_external_links_provider_check
  check (provider in ('google_tasks', 'google_calendar', 'gmail'));
