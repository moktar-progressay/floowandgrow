create unique index if not exists focusos_integrations_google_email_unique
  on public.focusos_integrations (lower(provider_email))
  where provider = 'google' and provider_email is not null;
