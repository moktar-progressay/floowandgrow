create table if not exists public.focusos_whatsapp_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  waba_id text not null,
  phone_number_id text not null unique,
  business_id text,
  display_phone_number text,
  verified_name text,
  timezone text not null default 'Europe/London',
  access_token_ciphertext text not null,
  access_token_iv text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists focusos_whatsapp_connections_waba_phone_unique
  on public.focusos_whatsapp_connections (waba_id, phone_number_id);

alter table public.focusos_whatsapp_connections enable row level security;

revoke all on public.focusos_whatsapp_connections from anon, authenticated;
grant all on public.focusos_whatsapp_connections to service_role;

alter table public.whatsapp_messages
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists whatsapp_messages_user_timestamp_idx
  on public.whatsapp_messages (user_id, message_timestamp desc)
  where user_id is not null;

alter table public.focusos_external_links
  drop constraint if exists focusos_external_links_provider_check;

alter table public.focusos_external_links
  add constraint focusos_external_links_provider_check
  check (provider in ('google_tasks', 'google_calendar', 'gmail', 'whatsapp'));
