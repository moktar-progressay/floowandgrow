alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_webhook_events enable row level security;
alter table public.whatsapp_send_requests enable row level security;
alter table public.focusos_whatsapp_connections enable row level security;

revoke all on public.whatsapp_messages from anon, authenticated;
revoke all on public.whatsapp_webhook_events from anon, authenticated;
revoke all on public.whatsapp_send_requests from anon, authenticated;
revoke all on public.focusos_whatsapp_connections from anon, authenticated;

grant all on public.whatsapp_messages to service_role;
grant all on public.whatsapp_webhook_events to service_role;
grant all on public.whatsapp_send_requests to service_role;
grant all on public.focusos_whatsapp_connections to service_role;
