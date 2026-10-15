# Newstepsincoding — agent hub

The canonical agent context for this repo (`AGENTS.md` points here). Hard rules and a router only;
detail lives in the docs routed below. What the project is and how to run it: [README.md](README.md).

## Hard rules

- **Gates:** `./dc check quick` while working; `./dc check full` must be green before a PR. Both need
  only Docker. Never weaken or skip a check to go green.
- **Stack:** `./dc up` / `./dc down`. `down` never deletes the database volume; `./dc reset` is the
  only (confirmed) wipe.
- **Ports are variables:** every host port in `docker-compose.yml` is `${VAR:-default}`. Never hard-code
  one, never pass `-p` to compose; per-worktree values come from this checkout's `.env`.
- **Schema changes** need an Alembic revision in `backend/migrations/versions/` alongside the model change.
- **Auth is security-sensitive:** changes to `backend/app/auth.py` or `backend/app/routes/auth.py` keep
  the invariants listed in [docs/codebase.md](docs/codebase.md#login-and-sessions).
- **Secrets** never go in git: `.env` is ignored; `SESSION_SECRET` is required outside `APP_ENV=local`.

## Router

| Topic | Read |
|---|---|
| Layout, how it runs, tests, conventions, landmines, login/session design | [docs/codebase.md](docs/codebase.md) |
| Running the app, ports, settings | [README.md](README.md), [.env.example](.env.example) |
| Stack and gate commands | [dc](dc) |
| How agent context files are shaped here | `/usr/lib/skynetd/docs/policies/context-architecture.md` |
| Instrumentation standard (what tooling this repo should carry) | `/usr/lib/skynetd/docs/policies/agentic-instrumentation.md` |
| Worktree / port contract for Jaah runners | `/usr/lib/skynetd/docs/policies/worktree-pool-policy.md` |
