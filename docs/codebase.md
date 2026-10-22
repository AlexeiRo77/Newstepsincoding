# Codebase guide

The orientation for anyone (person or agent) changing this repo. The run commands themselves are in
[README.md](../README.md); the hard rules are in [CLAUDE.md](../CLAUDE.md).

## What it is

A starter web app with working accounts: visitors sign up with an email and password, log in and log out,
and see two placeholder pages (Home, Profile) only while logged in. It has no product features yet; it is
the base to build them on. The login/logout design is a trimmed copy of the one in `jaah-ai/jaah`.

## Layout

| Path | What |
|---|---|
| `backend/app/main.py` | FastAPI app: mounts the routers, `GET /api/health` (checks the database) |
| `backend/app/auth.py` | Password hashing, session cookie, `current_user` dependency |
| `backend/app/routes/auth.py` | `POST /api/auth/signup`, `/login`, `/logout`; `GET /api/auth/me` |
| `backend/app/routes/sky.py` | `GET /api/sky` (public, no login): Sun, Moon and bright stars (mag ≤ 2.5) over Almaty at 1977-02-03 21:35 (UTC+6), plus the 32 × 32 LED light matrix of the visible sky |
| `backend/app/sky/` | Pure-Python astronomy (`astro.py`, Meeus algorithms), light-matrix projection and brightness (`lightmap.py`), star catalogue (`bright_stars.csv`, Yale BSC5 trimmed to mag ≤ 2.5) |
| `backend/app/models.py` | SQLAlchemy tables (`users`) |
| `backend/app/db.py`, `backend/app/config.py` | Engine/session dependency; settings from env vars |
| `backend/migrations/` | Alembic revisions — applied automatically when the backend container starts |
| `backend/tests/` | pytest suite (`test_*.py`) and the end-to-end `smoke.py` |
| `frontend/src/auth.tsx` | `AuthProvider` / `useAuth()`: current user, login, signup, logout |
| `frontend/src/api.ts` | `get` / `post` JSON helpers; errors become `ApiError` |
| `frontend/src/App.tsx` | Routes: public `/login`, `/signup`, `/sky`, `/sky-body`, `/waves`, `/body-waves`, `/sound-em`, `/brain-emitters`; `/` and `/profile` behind `RequireAuth` |
| `frontend/src/pages/Sky.tsx` | The 1977 sky page: draws the light matrix as SVG LEDs and lists the positions |
| `frontend/src/pages/SkyBody.tsx` | The light matrix's light (from `GET /api/sky`) against the body's own radiation: one log-log chart of power per m² vs frequency, the numbers, and whether each body wave matches |
| `frontend/src/pages/Waves.tsx` | Static SVG drawing of a brain, radio, sound and light wave with their real frequencies (frontend only) |
| `frontend/src/pages/BodyWaves.tsx` | Body figure plus SVG panels of the body's electromagnetic waves and organ sounds; Garyaev's "wave genome" shown as an unconfirmed hypothesis (frontend only) |
| `frontend/src/pages/SoundEm.tsx` | Sound that makes EM waves: sonoluminescence, piezoelectric and seismoelectric effects, each as sound and EM traces on one time axis plus a chart of EM output vs sound amplitude (frontend only) |
| `frontend/src/pages/BrainEmitters.tsx` | EM fields at the brain's frequencies (0.5–100 Hz): one log-log chart of field vs frequency against the EEG bands and the ICNIRP limit, then a card per emitter with its numbers and what studies say about effects (frontend only) |
| `frontend/src/components/WavePanel.tsx` | The captioned wave panel and path helper both wave pages draw with |
| `frontend/src/pages/`, `frontend/src/components/` | Pages and the shared layout, form and login guard |
| `frontend/src/styles.css` | All styling (plain CSS, no framework) |
| `docker-compose.yml`, `*/Dockerfile` | The local stack: `db`, `backend`, `frontend` |
| `deploy/` | Production stack and the AWS deploy script — see [Deployment](#deployment) |
| `dc` | The one entry point for the stack and the two gates |

## How it runs

`./dc up` builds two images and starts three containers:

- **db** — Postgres 17; data in the named volume `<project>-pgdata`, which survives `./dc down`.
- **backend** — runs `alembic upgrade head`, then `uvicorn --reload`. `backend/app`, `migrations` and
  `tests` are bind-mounted, so Python edits reload live.
- **frontend** — the Vite dev server. `frontend/src` and `index.html` are bind-mounted (hot reload). It
  proxies `/api/*` to the backend, so the browser talks to one origin and the cookie needs no CORS.

A change to `requirements*.txt`, `package.json`, a Dockerfile or `vite.config.ts` needs a rebuild:
`./dc up` always rebuilds (cached), and both gates build first.

## How it is tested

| Suite | Runs in | Covers |
|---|---|---|
| `ruff check` + `ruff format --check` | quick | Python lint and formatting (config in `backend/pyproject.toml`) |
| `pytest` (`backend/tests/test_*.py`) | quick | Sign-up, login, logout, cookie tampering, health; sky positions against Skyfield/DE421 reference values — against in-memory SQLite |
| `tsc` | quick | Frontend type-check |
| `vitest` (`frontend/src/*.test.tsx`) | quick | Login redirect, login/logout flow, the sky page and the wave pages, with a mocked backend |
| `vite build` | full | The production bundle builds |
| `deploy/` web image + `caddy validate` | full | The production web image builds and its Caddyfile is valid |
| `backend/tests/smoke.py` | full | Real stack end to end: frontend proxy → API → Postgres (signup, me, logout, login) |

Not covered yet: browser-level end-to-end tests (e.g. Playwright) and any migration-vs-model drift check.

## Login and sessions

- A session is an **HttpOnly, SameSite=Lax cookie** holding a signed, timestamped `{user_id, epoch}`
  (itsdangerous, 7-day expiry). It is `Secure` unless `APP_ENV=local` with a plain-http `FRONTEND_URL`.
- **Logout ends the session everywhere** by incrementing `users.session_epoch`; every cookie carrying an
  older epoch is refused by `current_user`.
- Passwords are **bcrypt**-hashed (input truncated to bcrypt's 72-byte limit). Rule: 8–128 characters,
  single-homed in `password_problem`.
- Login answers an unknown email and a wrong password **identically, at the same bcrypt cost** (a dummy
  hash), so it does not reveal which emails have accounts. Sign-up necessarily does reveal a taken email
  (409).
- **Per-IP rate limits** (`backend/app/ratelimit.py`, which holds the thresholds): at most 10 *failed*
  logins per 5 minutes per address and email, 50 per address across all emails, and 60 sign-ups per hour
  per address; beyond that the API answers **429 `too_many_attempts`** with `Retry-After`, before any
  bcrypt work. A successful login is not counted; unknown email and wrong password count alike. An IPv6
  client is keyed by its /64. The counters are in-memory in the single API process (reset on restart); the
  client address is the real one because Caddy overwrites `X-Forwarded-For` and uvicorn runs with
  `--proxy-headers`. Tests reset them in the `client` fixture.
- Emails are stored lower-cased; the unique index therefore behaves case-insensitively.
- The backend **refuses to start** with the built-in dev signing key unless `APP_ENV=local` and
  `FRONTEND_URL` is a localhost URL; outside local, `SESSION_SECRET` must be at least 32 characters. The
  API docs (`/docs`) are served only when `APP_ENV=local`.
- Protect a new API route with `user: User = Depends(current_user)`; protect a new page by placing its
  `<Route>` inside the `RequireAuth` element in `App.tsx`.

Deliberately left out of this basic version (present in jaah): per-account lockout, password reset,
email verification, MFA and OAuth sign-in. CSRF protection rests on SameSite=Lax plus JSON-only bodies; an
Origin check would also cover a hostile sibling subdomain. The local stack (compose file, dev Dockerfiles)
is not a production deployment; that is `deploy/` (below).

## Deployment

`./dc deploy` runs `deploy/aws-deploy.sh`: it ships the committed code (HEAD) to one EC2 server and prints
the public link, `https://<elastic-ip-with-dashes>.sslip.io/`, plus the full link to every page changed since
`DEPLOY_SINCE` (a commit; default `HEAD^`). `deploy/changed-pages.py` finds those pages: a route in
`frontend/src/App.tsx` that is new, or whose `frontend/src/pages/` file changed. AWS credentials come from the environment
or `Directory/Secrets/aws.env` ([Directory/Secrets/README.md](../Directory/Secrets/README.md)). It is
idempotent — the first run creates everything, later runs update the same server — and its header lists
the AWS resources it creates (all named `newstepsincoding-…`). Unlike the stack and the gates, it needs the AWS CLI v2, git, curl and
python3 on the machine it runs from.

- **No SSH.** The script reaches the server through AWS Systems Manager; the code travels as a bundle in a
  private S3 bucket behind a short-lived presigned link.
- **On the server** (`/opt/newstepsincoding`), `deploy/docker-compose.prod.yml` runs Postgres, the API
  (no reload, `APP_ENV=production`) and Caddy (`deploy/web.Dockerfile`, `deploy/Caddyfile`), which serves
  the built frontend, proxies `/api` and gets the Let's Encrypt certificate. Only ports 80/443 are open.
- **Secrets** (`POSTGRES_PASSWORD`, `SESSION_SECRET`) are generated on the server at first deploy into
  `deploy/.env` there; they never leave it and later deploys keep them. The database volume survives deploys.
- **Automatic on merge.** `.github/workflows/deploy.yml` runs on every push to `develop` (and by hand from
  the Actions tab): `./dc check full`, then `./dc deploy` on a GitHub runner. Deploys queue, never overlap.
  It reads the repo secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_DEFAULT_REGION` (Settings >
  Secrets and variables > Actions; same values as `Directory/Secrets/aws.env`). Until they are set, the deploy
  step is skipped with a warning. The run's summary lists the full link to each page the push changed (the
  workflow sets `DEPLOY_SINCE` to the commit before the push).

## Conventions

- Python: typed, small modules, ruff-formatted (line length 110); FastAPI dependencies for the session and
  the current user; error `detail` values are short snake_case codes the frontend maps to messages
  (`frontend/src/components/AuthForm.tsx`).
- TypeScript: strict mode, function components and hooks, React Router v6 with v7 future flags on.
- Every setting is an env var with a working local default, documented in `.env.example`.

## Landmines

- The tests use **SQLite**, not Postgres: Postgres-only behaviour is exercised only by `./dc check full`.
- Changing a model without a migration passes the unit tests (they call `create_all`) but breaks the real
  stack — the full gate's smoke test is what catches it.
- The Vite dev server only answers the host names it allows (`localhost` and the compose service name
  `frontend`, set in `vite.config.ts`); a new hostname gets HTTP 403.
- `./dc` deliberately ignores `COMPOSE_PROJECT_NAME`, `*_PORT` and `FRONTEND_URL` exported in your shell;
  set them in `.env` instead.
