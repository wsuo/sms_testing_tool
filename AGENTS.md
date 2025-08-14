# Repository Guidelines

## Project Structure & Module Organization
- Source: `app/` (routes, pages, API), `components/` (UI), `lib/` (services/utils), `contexts/`, `hooks/`, `data/`, `public/`, `styles/`, `scripts/`, `docs/`.
- Next.js routing: `app/*/page.tsx`, `layout.tsx`; API handlers in `app/api/*/route.ts`; middleware in `middleware.ts`.
- Config: `next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`. Environment: copy `.env.example` to `.env.local`.

## Build, Test, and Development Commands
- `npm run dev`: Start dev server on `http://localhost:3030` with HMR.
- `npm run build`: Production build (Next.js + TypeScript).
- `npm start`: Serve the production build.
- `npm run lint`: Run ESLint (Next.js config).
- `npm run dev:watch`: Rebuild and restart on changes (concurrently + nodemon).
- `npm run dev:build` / `npm run start:build`: Convenience build+run combos.

## Coding Style & Naming Conventions
- Language: TypeScript + React functional components; 2‑space indentation.
- Files: kebab-case for filenames (e.g., `tool-card.tsx`); export components in PascalCase.
- Folders: co-locate UI in `components/`; domain/services in `lib/`; routes under `app/`.
- Styling: Tailwind CSS utilities; prefer composition over deep overrides.
- Linting: keep `npm run lint` clean before pushing.

## Testing Guidelines
- Framework: not configured yet; `test/` currently stores fixtures. Recommended stack: Vitest + Testing Library with `jsdom`.
- Naming: `*.test.ts(x)` or `*.spec.ts(x)` beside sources or in `__tests__/`.
- Running: add an `npm test` script when tests are introduced; include smoke tests for critical flows (auth, SMS send, imports).

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat`, `fix`, `refactor`, `style`, `chore`, `assets`, …) as seen in Git history.
- PRs: clear summary, linked issue, screenshots/GIFs for UI, steps to verify, and risk/rollback notes. Keep scope focused (< ~300 lines when possible).

## Security & Configuration Tips
- Do not commit secrets; use `.env.local`. See `docs/ENV_CONFIG.md` for variables.
- External services: Alibaba Cloud SMS clients are used; ensure required env vars are set before running locally or deploying.

## Agent-Specific Notes
- Refer to `CLAUDE.md` and `.claude/` for prompt/workflow context. Generate deterministic, small diffs and follow the conventions above.
