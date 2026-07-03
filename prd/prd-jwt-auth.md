# PRD: JWT Authentication with HttpOnly Cookies

## Problem Statement

The Archive Explorer frontend needs to make authenticated requests to the Omeka Classic REST API, but Omeka's only built-in API authentication is a static `?key=` query parameter — a secret exposed in URLs, server logs, and browser history. There is no login flow, no token issuance, and no way to identify the current user from the frontend. The app needs a secure, standards-compliant auth layer that supports both public browsing and authenticated features without requiring API keys to be embedded in client-side code.

## Solution

Build an Omeka Classic plugin (`JwtAuth`) that:
1. Exposes `/auth/*` endpoints (login, logout, me, register) that issue short-lived JWTs and long-lived refresh tokens as httponly cookies
2. Intercepts all `/api/*` requests and authenticates them via the JWT cookie instead of the `?key=` param
3. Handles CORS correctly for the separate-subdomain deployment (frontend and backend on different subdomains of the same root domain)

On the frontend, implement an auth layer (React context + API client) that handles the cookie-based flow transparently, supports public (unauthenticated) browsing, and gates authenticated features behind login.

## User Stories

1. As a public visitor, I want to browse archive items and collections without logging in, so that I can explore the archive freely.
2. As a public visitor, I want to see a login button in the UI, so that I know authenticated features exist.
3. As a registered user, I want to submit my email and password to log in, so that I can access authenticated features.
4. As a registered user, I want my login to persist across browser sessions (until I explicitly log out), so that I don't have to re-authenticate every visit.
5. As a registered user, I want my session to automatically refresh in the background, so that I'm not logged out mid-session without warning.
6. As a registered user, I want to log out and have all tokens immediately invalidated, so that I can securely end my session.
7. As a registered user, I want to see my name/role displayed in the UI after logging in, so that I know I'm authenticated.
8. As a new user, I want to register for an account, so that I can gain access to authenticated features.
9. As a registered user, I want API requests to the Omeka REST API to be authenticated automatically via my session cookie, so that I don't need to manage API keys.
10. As an admin, I want the registration endpoint to create Omeka user accounts, so that registered users can also access the Omeka admin panel with the same credentials.
11. As a developer, I want CORS configured correctly for cross-subdomain requests, so that the React frontend can communicate with the PHP backend without browser errors.
12. As a security-conscious operator, I want JWTs stored in httponly cookies (not localStorage), so that XSS attacks cannot steal session tokens.
13. As a security-conscious operator, I want access tokens to be short-lived (≤15 min), so that stolen tokens have a limited window of abuse.
14. As a security-conscious operator, I want refresh tokens to be long-lived but stored in a separate httponly cookie, so that the UI can silently re-authenticate without user friction.
15. As a security-conscious operator, I want the backend to validate JWT signatures on every `/api/*` request, so that forged or tampered tokens are rejected.

## Implementation Decisions

### Backend Plugin (`JwtAuth`)

- **Plugin type**: Omeka Classic plugin extending `Omeka_Plugin_AbstractPlugin`
- **JWT library**: `firebase/php-jwt` (via Composer, added to plugin's own `vendor/`)
- **Hooks used**:
  - `define_routes` — register `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/register` routes pointing to plugin's `AuthController`
  - `api_call` or front controller plugin — intercept all `/api/*` dispatches to validate JWT cookie before Omeka's own ACL runs; inject `current_user` into the registry so Omeka's existing permission checks work unchanged
- **Token strategy**:
  - Access token: short-lived JWT (15 min), signed with HS256, payload includes `user_id`, `role`, `exp`
  - Refresh token: opaque random token (64 hex chars), stored in DB table `jwt_refresh_tokens` (`token_hash`, `user_id`, `expires_at`, `revoked`), issued as a separate httponly cookie with longer TTL (e.g. 30 days)
  - On logout: refresh token row is marked `revoked = 1`; access token expiry handled passively (short TTL)
- **New DB table**: `jwt_refresh_tokens` — added via plugin's `install()` hook and migration

### Auth Endpoints

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| POST | `/auth/login` | No | Validates credentials, issues access + refresh cookies |
| POST | `/auth/logout` | Yes (access JWT) | Revokes refresh token, clears cookies |
| GET | `/auth/me` | Yes (access JWT) | Returns `{id, name, email, role}` |
| POST | `/auth/register` | No | Creates Omeka user (role: `contributor` by default), issues cookies |

### Cookie Config

Both cookies set with: `HttpOnly`, `Secure`, `SameSite=None`, `Domain=.example.com` (root domain so subdomains share it).

- Access token cookie name: `auth_token`
- Refresh token cookie name: `refresh_token`

### CORS

The plugin sets `Access-Control-Allow-Origin` to the frontend subdomain, `Access-Control-Allow-Credentials: true`, and handles `OPTIONS` preflight for all `/auth/*` and `/api/*` routes.

### Existing REST API (`/api/*`) Auth Change

- The plugin hooks into request dispatch (via a Zend front controller plugin registered in the `initialize` hook)
- If the `auth_token` cookie is present and valid: extract `user_id`, load the `User` record, store it as `current_user` in `Zend_Registry` — Omeka's `ApiController::_validateUser` then sees an authenticated user
- If the `auth_token` cookie is absent/expired but a `refresh_token` cookie is present: automatically issue a new access token cookie in the response and continue
- If neither is present: the request proceeds as anonymous (public items remain accessible; restricted operations return 403 as before)
- The legacy `?key=` param continues to work for backward compatibility (server-to-server / CLI use)

### Frontend Auth Layer

- **Auth context**: React context (`AuthContext`) wrapping the app, exposing `{ user, login, logout, register, loading }`
- **API client**: thin wrapper around `fetch` with `credentials: 'include'` on every request, so cookies are always sent
- **Silent refresh**: on 401 response, the client calls `POST /auth/refresh` (or detects expired access token via `/auth/me`) and retries once
- **Public routes**: all browse/search pages render without auth; components gate privileged UI (edit, save, admin links) on `user !== null`

### Schema Changes

New table added by plugin install hook:

```sql
CREATE TABLE jwt_refresh_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL
);
```

## Out of Scope

- Password reset / forgot-password flow
- Email verification on registration
- OAuth / social login
- Role management UI (roles remain managed via Omeka admin panel)
- Rate limiting on auth endpoints
- Multi-factor authentication
- Token rotation on every refresh (single refresh token per session is sufficient for now)

## Further Notes

- The JWT secret key should be stored in Omeka's `db.ini` or a dedicated config file — never hardcoded in plugin source
- Registration endpoint should default new users to the `contributor` role; super-admin promotion stays in the Omeka admin panel
- The plugin should be developed as a standalone directory under `backend/plugins/JwtAuth/`
- In dev, the Vite dev server (typically `localhost:5173`) and the PHP backend (typically `localhost:8080` or Apache) are different origins — the CORS config must also allow `localhost` origins in non-production environments
