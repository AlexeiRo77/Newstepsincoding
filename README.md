# Newstepsincoding

A starter web app: a **FastAPI** backend, a **React + TypeScript** frontend and a **Postgres** database,
with sign-up, login and logout already working and two placeholder pages (Home, Profile) behind the login.
The 1977 sky light matrix (`/sky`) and the waves drawings (`/waves`, `/body-waves`) are public.

## Getting started

You need only [Docker](https://docs.docker.com/get-docker/).

```bash
./dc up            # build and start everything, then open the URL it prints (default http://localhost:5173)
./dc down          # stop it (your data is kept)
./dc check quick   # lint, type-check and unit tests
./dc check full    # everything, including an end-to-end test on the running app
./dc deploy        # put the committed code on AWS and print its public HTTPS link
./dc help          # all commands
```

Sign up on the page that opens, and you are logged in. No configuration file is needed; to change a port
or a setting, copy `.env.example` to `.env` and edit it.

| Service | Default address |
|---|---|
| App (frontend) | http://localhost:5173 |
| API (backend) | http://localhost:8000 — interactive docs at `/docs` |
| Database | `localhost:5432`, user/password/database `app` |

How the code is organised, how login works and what to watch out for: [docs/codebase.md](docs/codebase.md).
