# Backend — Omeka Classic + JwtAuth

This directory contains **no Omeka source**. The Docker build fetches Omeka core
and the stock plugins/themes from GitHub, pinned by commit SHA in the
`Dockerfile` `ARG`s, and layers our customisations on top.

## Layout

| Path | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build (`prod` / `test`); fetches pinned Omeka + plugins/themes |
| `docker-entrypoint.sh` | Writes `db.ini` from `DB_*` env vars at container start |
| `docker-compose.yml` | Local dev stack (app + mysql) on port 8080 |
| `docker-compose.test.yml` | PHPUnit stack (test image + `omeka_test` db) |
| `overlay/config.ini.jwtauth.ini` | `[jwtauth]` config section appended to Omeka's `config.ini.changeme` |
| `overlay/phpunit.xml` | Omeka's phpunit.xml + the JwtAuth `Plugin Tests` suite |
| `plugins/JwtAuth/` | Local checkout of [omeka-plugin-JwtAuth](https://github.com/zz-james/omeka-plugin-JwtAuth) — its own git repo, COPY'd into the image |

## Run

```bash
docker compose up -d --build       # app on http://localhost:8080
```

Environment (see `docker-compose.yml`): `JWT_SECRET` (≥32 chars in production),
`APPLICATION_ENV`, `JWT_ALLOWED_ORIGINS`, `DB_*`.

## Tests

```bash
docker compose -f docker-compose.test.yml build test
docker compose -f docker-compose.test.yml run --rm test \
  sh -c "cd application/tests && ../../vendor/bin/phpunit ../../plugins/JwtAuth/tests"
```

## Upgrading Omeka

Bump `OMEKA_REF` (and plugin/theme refs) in the `Dockerfile` to the desired
upstream commit/tag SHA and rebuild. Current pin: Omeka 3.2
(`f1c7353a4`, upstream master 2026-04-30).
