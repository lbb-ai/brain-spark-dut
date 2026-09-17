<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Base44 dev environment

## Stack
- **TanStack Start** (SSR) + React 19 + Vite 8, styled with Tailwind v4.
- Package manager: **bun** (`bun.lock`, `bunfig.toml`). Bun's `minimumReleaseAge`
  guard is active — pinned versions in the lockfile keep installs fast.
- Auth/data: **Supabase** (Lovable-hosted). The client reads
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (client) and
  `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (SSR) — all present in the
  committed `.env`.

## Running
```
docker compose -f docker-compose.base44.yml up -d --build
```
- Single `web` service: `oven/bun:1-debian`, source bind-mounted at `/app`,
  runs `bun install && bun run dev` (Vite dev server with SSR/HMR on port 3000).
- `node_modules` lives in a named volume so the container's install isn't
  clobbered by the host.
- Vite allowed-hosts: the platform sets `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`
  to the sandbox domain; it's passed through so the preview origin is accepted.

## Not needed at boot
- `SUPABASE_SERVICE_ROLE_KEY` (admin client) and `LOVABLE_CRON_SECRET` are lazy
  proxies / unused middleware — no route that renders on first load touches
  them, so the app boots and renders without them. Provide the service-role key
  only if you exercise admin-only server functions.

## Verify
- `curl -sH "Accept-Encoding: identity" http://localhost:3000/` returns the
  SkillQuest landing page (`<title>SkillQuest — Play. Learn.…`).
- Logs: `docker compose -f docker-compose.base44.yml logs web` — look for
  `VITE v8.x ready` and `(ssr) connected`.
