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
  features/     domain modules and feature pages
  services/     external clients, including Supabase
  theme/        Material UI design tokens and component defaults
  types/        shared application models
```

Feature pages reuse `AppShell`, `PageHeader`, `SurfaceCard`, `EmptyState`, `TaskRow`, `TaskDialog`, `BrandMark` and `FocusOrb` so navigation, spacing and interactions stay consistent.

## Development

Requires Node.js 20.19 or newer.

```bash
npm ci
npm run dev
```

The default Supabase URL and public publishable key are safe browser configuration values. They can be overridden locally with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put service-role keys or OAuth client secrets in frontend environment variables.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

The production build is written to `dist/`. A matching `404.html` is created for GitHub Pages client-side route fallback.

## Deployment

GitHub Pages deploys `dist/` from `.github/workflows/pages.yml`. Netlify uses the same build output through `netlify.toml`.

Google OAuth secrets remain in Supabase Edge Function secrets and must never be committed to this repository.
