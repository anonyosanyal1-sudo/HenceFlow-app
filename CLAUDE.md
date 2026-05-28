# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Production build → dist/
npm run lint      # TypeScript type-check (tsc --noEmit) — this is the only linter
```

There is no test suite configured.

The `server.ts` file is an Express wrapper that serves the Vite SPA in production and provides a `/api/health` endpoint — it is not used for local development (Vite's own dev server handles that via `npm run dev`).

## Environment variables

Copy `.env.example` to `.env.local` and fill in:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — required for any data to load (find in Supabase project Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only, never expose to the browser
- `GEMINI_API_KEY` — injected at runtime by AI Studio

## Architecture

### Data hierarchy

```
Company
 └── Pods (team groupings)
      └── Projects (workspaces)
           └── Tasks
```

A user must appear in a company's `member_ids` array to access any data. Supabase Row Level Security enforces this at the database level — the RLS policies are the source of truth for access control (see `supabase/migrations/`).

### State management

`src/App.tsx` is the single root of all application state. There is no Redux, Zustand, or Context API — everything is `React.useState` in `AppContent` and passed down as props. All data-loading callbacks (`loadCompany`, `loadProjects`, `loadProjectData`, etc.) live there too.

The load cascade is:
1. Auth resolves → `loadCompany()`
2. Company resolves → `loadPods(companyId)` + `loadProjects()`
3. Active project selected → `loadProjectData(projectId)` (tasks, milestones, custom fields, templates in parallel)

### Real-time updates

`src/hooks/useServerEvents.ts` subscribes to Supabase Realtime `postgres_changes` channels. It creates one channel per (table, project_id) pair for project-scoped tables, and global channels for `pods` and `companies`. When a change arrives, App.tsx re-fetches the affected data. The hook avoids re-subscribing unless the set of project IDs changes (compared as a sorted comma-joined string).

### Data layer

`src/services/api.ts` is the **only** file that calls Supabase. The database uses `snake_case` column names; the frontend uses `camelCase` types. Every table has a dedicated `map*` function in api.ts that converts between them (e.g., `mapTask`, `mapProject`). Always go through these mappers — do not access raw DB rows elsewhere.

The `updateTask` function ignores its first argument (`_projectId`) because Supabase updates tasks by ID alone; the parameter exists only for API symmetry.

### UI conventions

- **Path alias**: `@` resolves to the repository root (not `src/`). Shadcn/ui components live at `components/ui/` (root level, not `src/components/ui/`).
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin). Class utilities use `clsx` + `tailwind-merge` via the `cn()` helper defined at the top of `App.tsx` and also exported from `lib/utils.ts`.
- **Theme**: Dark/light mode is toggled via the `light` class on `<html>`. The user's preference is persisted to `localStorage` under key `hf-theme`.
- **Animations**: `motion/react` (Framer Motion v12). Used for sidebar slide-in, loading spinner, and `AnimatePresence` transitions.
- **Icons**: `lucide-react` throughout.
- **Ambient glow**: The background layers of blur circles in `App.tsx` are intentional visual design — do not remove them.

### Task statuses (stages)

`TaskStatus` is typed as `string` (open-ended). `DEFAULT_STAGES` in `src/types.ts` defines the eight standard stages. Projects store their own `stages: Stage[]` array which overrides the defaults. The Tailwind safelist comment in `types.ts` ensures dynamically-constructed color classes are not purged — keep it in sync if new stages are added.

### Keyboard shortcuts

`src/hooks/useKeyboardShortcuts.ts` implements shortcuts active when no input is focused:
- `n` / `N` — new task
- `/` — focus search
- `?` — show shortcuts help
- `g` then `t` / `b` / `a` — navigate to Timeline / Board / Analytics

### Database migrations

Migrations in `supabase/migrations/` must be applied in order to a Supabase project via the Supabase SQL editor or CLI. They are not run automatically. The app itself never runs migrations — it assumes the schema is already in place.

Key DB-level behaviors:
- The `handle_new_user` trigger auto-creates a `public.users` row on Supabase Auth sign-up.
- The `set_updated_at` trigger keeps `tasks.updated_at` current automatically; the client also sets it explicitly in `updateTask` as a belt-and-suspenders measure.
- Recurring task instances are meant to be spawned server-side when a task is closed; the `createRecurringInstance` export in api.ts is a no-op stub.
