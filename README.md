# FocusOS

FocusOS is a mobile-first productivity workspace for tasks, projects, goals, focus sessions and Google Workspace activity.

## Technology

- React 19 and TypeScript
- Material UI with a centralised theme and reusable application components
- TanStack Query for server-state caching and mutations
- React Router for page-level routing and code splitting
- Supabase Authentication, PostgreSQL and Edge Functions
- Vite for local development and production builds
- Vitest and Testing Library for automated tests

The previous single-file implementation remains in `site/` as a migration reference. The production application starts at `src/main.tsx`.

## Structure

```text
src/
  app/          providers, routing and application composition
  components/   reusable brand, layout and UI components
  features/     domain modules, including the Task Orb client and UI
  services/     external clients, including Supabase
  theme/        Material UI design tokens and component defaults
  types/        shared application models
supabase/
  functions/
    focus-agent/ secure OpenAI Agents SDK route and tools
```

Feature pages reuse `AppShell`, `PageHeader`, `SurfaceCard`, `EmptyState`, `TaskRow`, `TaskDialog`, `BrandMark` and `FocusOrb` so navigation, spacing and interactions stay consistent.

## Development

Requires Node.js 20.19 or newer.

```bash
npm ci
npm run dev
```

The default Supabase URL and public publishable key are safe browser configuration values. They can be overridden locally with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put service-role keys or OAuth client secrets in frontend environment variables.

## Task Orb agent

The Task Orb uses the current OpenAI Agents SDK inside the authenticated `focus-agent` Supabase Edge Function. The browser never receives provider API keys. When OmniRoute is configured it becomes the assistant's OpenAI-compatible gateway; the existing OpenAI configuration remains the fallback when OmniRoute is not configured.

Configure the server secrets before deploying:

```bash
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set OPENAI_MODEL=gpt-5.6-luna
supabase functions deploy focus-agent
```

To route the assistant through a secured OmniRoute deployment instead:

```bash
supabase secrets set OMNIROUTE_BASE_URL=https://your-omniroute-host.example/v1
supabase secrets set OMNIROUTE_API_KEY=your_omniroute_key
supabase secrets set OMNIROUTE_MODEL=auto/smart
supabase functions deploy focus-agent
```

Keep `REQUIRE_API_KEY=true` on OmniRoute. These secrets belong only in Supabase's encrypted server-side secret store, never in browser environment variables.

The agent streams newline-delimited JSON with status, tool progress, text deltas, approval proposals and completion events. Its tools can review the signed-in user's task stream, inspect an owned task and prepare a proposed change. They cannot mutate data. FocusOS performs a change only after the user presses the proposal's approval button.

Email and future WhatsApp content is treated as untrusted input. The agent can draft a reply in-app, but sending remains a separate **Approve and send** action.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

The production build is written to `dist/`. A matching `404.html` is created for GitHub Pages client-side route fallback.

## Validation checklist

- [ ] A Gmail task on Today opens the full message inside FocusOS.
- [ ] **Draft with AI** fills the reply editor without sending.
- [ ] **Approve and send** is the only action that sends a reply.
- [ ] A Task Orb request emits at least one `tool` event and one `text_delta` event.
- [ ] Agent proposals do not change data before approval.
- [ ] Task, email and message text cannot override the agent instructions.
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass.

## Deployment

GitHub Pages deploys `dist/` from `.github/workflows/pages.yml`. Netlify uses the same build output through `netlify.toml`.

Google OAuth secrets remain in Supabase Edge Function secrets and must never be committed to this repository.
