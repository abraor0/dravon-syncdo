# Dravon SyncDo

Internal task board for Grupo Dravon. Members sign in, manage their own tasks, and follow teammates' boards in real time.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- TanStack Query (server state) and Zustand (session + persisted board layout)
- Supabase (auth, Postgres with RLS, realtime)
- Deployed on Vercel as a SPA

## Features

- **My Tasks**: your own tasks, created inline.
- **Company View**: one column per teammate; columns and per-column sort order persist in localStorage.
- Inline editing of title, description, and priority; tasks can be handed over to another member.
- Completion audit (`completed_at`, `completed_by`) and a metrics bar filtered by Today / Week / Month / All.
- Live sync of every change through Supabase realtime.

## Data model and permissions

`tasks.assignee` and `tasks.completed_by` store the user's **email**, which is what RLS checks against.

| Action | Allowed for |
| --- | --- |
| Read | Any signed-in user |
| Create | Signed-in user, only with themselves as assignee |
| Update / delete | The current assignee (an update may reassign the task) |

`get_all_users()` lists members for the column picker and is callable only by signed-in users.

Accounts are created by an admin in the Supabase dashboard; public sign-up is disabled.

## Setup

Requires Node.js 20+ and Docker. Everything runs locally; no Supabase account is needed.

1. `npm install`
2. `npx supabase start`: starts the local Supabase stack and applies `supabase/migrations` and `supabase/seed.sql`.
3. `cp .env.example .env.local`

   The values in `.env.example` are local test values only, not secrets. The key is the default publishable key built into the Supabase CLI: it is the same on every machine and only works against the local stack started by `npx supabase start`.
4. `npm run dev` and sign in with `example1@example.com` / `password123` (or `example2@example.com`).

To reset the database to the seed: `npx supabase db reset`. To stop: `npx supabase stop`.

## Scripts

- `npm run dev`: dev server
- `npm run build`: type-check and production build
- `npm run typecheck`: TypeScript only
- `npm run lint`: ESLint

## Architecture

Feature-based modules.

- `src/features/<feature>/{components,hooks,services}`: feature code
- `src/components`, `src/hooks`, `src/services`: shared across features
- `src/pages`: thin route containers

## License

MIT. See [LICENSE](LICENSE).
