# FlowOS / FocusOS

Mobile-first productivity console for managing canonical tasks, projects, focus sessions and Google Workspace data.

## Architecture

- Static HTML and vanilla JavaScript frontend in `site/`
- Supabase Authentication and PostgreSQL persistence
- Supabase Edge Function for Google Workspace OAuth
- Netlify production hosting

## Deployment

Netlify publishes the `site` directory. The production site is:

https://floowandgrow.netlify.app

Server-side OAuth secrets belong in Supabase Edge Function secrets and must never be committed to this repository.

