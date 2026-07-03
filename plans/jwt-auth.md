# Plan: JWT Authentication with HttpOnly Cookies

> Source PRD: `prd/prd-jwt-auth.md`

## Architectural decisions

- **Auth endpoints**: `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/register` — served by a plugin `AuthController`, not the core Omeka API controller
- **API gating**: Zend front controller plugin intercepts all `/api/*` dispatches; validates `auth_token` cookie; injects `current_user` into `Zend_Registry` so Omeka's existing ACL runs unchanged
- **Token strategy**: Access token = short-lived JWT (HS256, 15 min) in `auth_token` cookie; refresh token = opaque hash stored in `jwt_refresh_tokens` DB table, in `refresh_token` cookie (30 days)
- **Cookie config**: `HttpOnly; Secure; SameSite=None; Domain=.<root-domain>` in production; `SameSite=Lax` + no `Secure` flag in localhost dev
- **CORS**: `Access-Control-Allow-Credentials: true` + explicit `Access-Control-Allow-Origin` (frontend subdomain or localhost); handled in plugin, not `.htaccess`
- **Schema**: New table `jwt_refresh_tokens` (`id`, `token_hash`, `user_id`, `expires_at`, `revoked`, `created_at`); added via plugin `install()` hook
- **JWT secret**: Read from `db.ini` or a dedicated config file — never hardcoded
- **Legacy `?key=` param**: Continues to work for server-to-server use; cookie auth takes precedence when both are present
- **New user role**: Registration defaults to `contributor`; promotion stays in Omeka admin panel
- **Frontend HTTP client**: Native `fetch` with `credentials: 'include'` on every request

---

## Phase 1: Plugin Scaffold + Login + CORS

**User stories**: 3, 11, 12, 13, 14

### What to build

Create the `JwtAuth` Omeka plugin under `backend/plugins/JwtAuth/`. On activation, run the DB migration to create `jwt_refresh_tokens`. Expose `POST /auth/login`: accept `{email, password}`, verify against Omeka's user table (bcrypt), on success issue a signed JWT in `auth_token` and a hashed refresh token in `refresh_token` as httponly cookies. Add CORS preflight handling for all `/auth/*` and `/api/*` routes, supporting both the frontend subdomain and `localhost` origins.

### Acceptance criteria

- [ ] Plugin activates without errors; `jwt_refresh_tokens` table exists after activation
- [ ] `POST /auth/login` with valid credentials returns 200 + sets `auth_token` and `refresh_token` httponly cookies
- [ ] `POST /auth/login` with invalid credentials returns 401, no cookies set
- [ ] `OPTIONS /auth/login` from the frontend origin returns correct CORS headers including `Access-Control-Allow-Credentials: true`
- [ ] JWT payload contains `user_id`, `role`, `exp` (15 min from issue time)
- [ ] Refresh token row is written to `jwt_refresh_tokens` with correct `user_id` and `expires_at`

---

## Phase 2: JWT Gating on `/api/*` with Public Fallback

**User stories**: 1, 9, 15

### What to build

Register a Zend front controller plugin in the `JwtAuth` plugin's `initialize` hook. On every `/api/*` dispatch: if `auth_token` cookie is present and the JWT signature + expiry are valid, load the corresponding `User` record and store it in `Zend_Registry` as `current_user`. If the cookie is absent or invalid, let the request proceed unauthenticated (public items remain accessible; Omeka's ACL returns 403 for restricted operations as it always has). Legacy `?key=` param is preserved as a fallback.

### Acceptance criteria

- [ ] `GET /api/items` without any cookie returns 200 with public items
- [ ] `GET /api/items` with a valid `auth_token` cookie returns 200 and the response reflects the authenticated user's permissions
- [ ] `POST /api/items` without auth returns 403
- [ ] `POST /api/items` with a valid cookie for an admin-role user returns 200/201
- [ ] A tampered or expired `auth_token` cookie is rejected (treated as unauthenticated, not 500)
- [ ] Legacy `?key=` param still authenticates requests when no cookie is present

---

## Phase 3: Logout + `/auth/me` + Silent Refresh

**User stories**: 5, 6, 7

### What to build

Add `POST /auth/logout`: validate the `auth_token` cookie, look up the `refresh_token` cookie's hash in `jwt_refresh_tokens`, mark it `revoked = 1`, and clear both cookies in the response. Add `GET /auth/me`: validate the `auth_token` cookie and return `{id, name, email, role}`. Add silent refresh: if an `/api/*` request (or `/auth/me`) arrives with an expired `auth_token` but a valid, non-revoked `refresh_token`, issue a new `auth_token` cookie in the response and continue processing the original request.

### Acceptance criteria

- [ ] `GET /auth/me` with valid cookie returns `{id, name, email, role}`
- [ ] `GET /auth/me` without cookie returns 401
- [ ] `POST /auth/logout` clears both cookies and marks the refresh token row `revoked = 1`
- [ ] After logout, the revoked `refresh_token` cookie cannot be used to obtain a new access token
- [ ] Request with expired `auth_token` + valid `refresh_token` succeeds and a new `auth_token` cookie is set in the response
- [ ] Request with expired `auth_token` + revoked `refresh_token` returns 401

---

## Phase 4: Registration

**User stories**: 8, 10

### What to build

Add `POST /auth/register`: accept `{name, email, password}`, validate input (email uniqueness, password min length), create an Omeka `User` record with role `contributor` and active status, then immediately issue access + refresh cookies (same flow as login). The new user can log into both the React frontend and the Omeka admin panel with these credentials.

### Acceptance criteria

- [ ] `POST /auth/register` with valid unique email creates a `User` row with role `contributor` and `active = 1`
- [ ] Response sets `auth_token` and `refresh_token` cookies (same as login)
- [ ] `GET /auth/me` immediately after register returns the new user's info
- [ ] `POST /auth/register` with a duplicate email returns 422 with a clear error message
- [ ] New user can log into the Omeka admin panel at `/admin` with the registered credentials

---

## Phase 5: Frontend Auth Layer

**User stories**: 1, 2, 3, 4, 5, 7

### What to build

In `frontend/src/`, implement an `AuthContext` that stores `{ user, loading }` and exposes `login(email, password)`, `logout()`, `register(name, email, password)`. Wrap the app in this provider; on mount, call `GET /auth/me` to restore session state. Create a fetch wrapper that sets `credentials: 'include'` and retries once on 401 by attempting silent refresh. Build a minimal login/register UI (modal or page) accessible via a persistent login button in the nav. Public browse (item listings, item detail) renders without auth; privileged UI elements (edit links, admin nav) render only when `user !== null`.

### Acceptance criteria

- [ ] Public browse works with no cookies — item listings load
- [ ] Login button is visible in the nav when unauthenticated
- [ ] Submitting valid credentials via the login form sets session state and updates the UI to show the user's name
- [ ] Refreshing the page restores the authenticated session (via `/auth/me` on mount)
- [ ] Clicking logout clears session state and the UI returns to the anonymous state
- [ ] A fetch to a protected `/api/*` route made while authenticated sends the cookie automatically
- [ ] Privileged UI elements are hidden when the user is not logged in
