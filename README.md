# Good Things Archive

An [Omeka Classic](https://omeka.org/classic/) digital archive with a modern
React frontend, connected by JWT cookie authentication.

## Structure

| Path | What it is |
|---|---|
| `frontend/` | React 19 + TypeScript + Vite SPA (Archive Explorer). Talks to the backend via HttpOnly-cookie auth. |
| `backend/` | Docker build for Omeka Classic. **Contains no Omeka source** — the Dockerfile fetches Omeka core and stock plugins/themes from GitHub, pinned by commit SHA. See `backend/README.md`. |
| `backend/plugins/JwtAuth/` | The auth plugin — a separate git repo ([omeka-plugin-JwtAuth](https://github.com/zz-james/omeka-plugin-JwtAuth)), gitignored here, COPY'd into the Docker image from the local checkout. |
| `prd/`, `plans/` | Product requirements and the implementation plan for the JWT auth work. |

## Run locally

Backend (Omeka + MySQL on <http://localhost:8080>):

```bash
cd backend
docker compose up -d --build
```

Frontend dev server (<http://localhost:5173>):

```bash
cd frontend
npm install
npm run dev
```

## Auth

Authentication is JWT-in-HttpOnly-cookies, implemented by the JwtAuth Omeka
plugin: `POST /auth/login`, `/auth/logout`, `/auth/register`, `GET /auth/me`,
with silent refresh handled server-side. Design in `plans/jwt-auth.md`;
security review and hardening record in the plugin repo's `security.md`.

Key environment variables (see `backend/docker-compose.yml`): `JWT_SECRET`
(≥32 random chars in production), `JWT_ALLOWED_ORIGINS`, `APPLICATION_ENV`.

## Tests

Backend plugin suite (PHPUnit in Docker):

```bash
cd backend
docker compose -f docker-compose.test.yml build test
docker compose -f docker-compose.test.yml run --rm test \
  sh -c "cd application/tests && ../../vendor/bin/phpunit ../../plugins/JwtAuth/tests"
```

Frontend:

```bash
cd frontend
npm test
```
