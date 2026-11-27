# Web-e-Thon Starter (Next.js + TypeScript + PostgreSQL)

Generic, theme-agnostic starter: auth, layered backend, validated CRUD example, LLM wrapper, UI kit, Docker, and documentation templates for the case-study part of the judging.

## Start in 5 minutes (needs internet once)
```bash
npm install
cp .env.example .env.local          # set SESSION_SECRET (see comment inside) + at least one AI key (optional)
npm run db:up                       # local Postgres in Docker  (no Docker? use a hosted DB URL instead, see docs/DEPLOY.md)
npm run db:setup                    # migrations + demo data (safe to re-run)
npm run dev                         # http://localhost:3000
```
Demo logins: `user@demo.test` and `admin@demo.test`, password `Demo1234`. Check `http://localhost:3000/api/health`.

## Architecture (what to explain to the judges)
```
Browser (React forms, zod)  ->  Route handler (src/app/api/**)  ->  Service (rules + access)  ->  Repository (SQL)  ->  PostgreSQL
                                   src/server/http.ts                src/server/services          src/server/repositories
```
| Layer | Folder | Responsibility |
|---|---|---|
| Shared validation | `src/shared/schemas` | One zod schema used by forms AND API (front-end + back-end validation) |
| Route | `src/app/api/**/route.ts` | Thin: declares auth, body/query schema, calls a service |
| HTTP helper | `src/server/http.ts` | Auth check, zod parsing, rate limit, one consistent error format |
| Service | `src/server/services` | Business rules, ownership/role access (hidden rows return 404) |
| Repository | `src/server/repositories` | Parameterized SQL only, no business rules |
| Database | `db/migrations/*.sql` | Schema with constraints, indexes, FKs; `npm run db:migrate` |
| UI | `src/components`, `src/app/(app)` | Pages, forms, tables; every page has loading, empty, error states |

## Turn the example into your theme (the "items" module is the pattern)
1. Write the new tables in `db/migrations/002_<name>.sql` (never edit applied migrations).
2. Copy `src/shared/schemas/item.ts`, adjust fields and rules.
3. Copy `item.repo.ts` -> `<entity>.repo.ts`, `item.service.ts` -> `<entity>.service.ts`.
4. Copy `src/app/api/items/**` and `src/components/items-manager.tsx` / `item-form.tsx`.
5. Add the page under `src/app/(app)/<entity>/page.tsx` and the link in `src/components/app-shell.tsx`.
Roles: `ADMIN | USER` today; add more in `001_init.sql`'s CHECK and `shared/schemas/auth.ts`.

## Commands
`npm run dev` | `npm run check` (types + lint + build) | `npm run db:migrate` | `npm run db:seed` | `npm run db:reset` (drops everything) | `npm run db:up/db:down`

## Already installed
react-hook-form + zod, TanStack Query + Table, dnd-kit (drag and drop / kanban), Recharts, Leaflet maps, Framer Motion, sonner toasts, lucide icons, next-themes (dark mode), date-fns, papaparse (CSV), jspdf (PDF export), qrcode, react-markdown, Zustand, Radix primitives, openai SDK (Gemini/Groq/OpenRouter via `src/lib/llm.ts`).

## Read next
`docs/PLAYBOOK.md` (timeline and tips) | `docs/THEMES.md` | `docs/DEPLOY.md` | `docs/AGENT_PROMPT.md` | `docs/submission/*` (requirements analysis, design, traceability templates)
