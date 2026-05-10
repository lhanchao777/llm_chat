# User Authentication & Data Isolation Design

## Goals

1. Add login/register functionality so multiple users can share the service
2. Each user has isolated conversations and settings
3. First registered user becomes admin and inherits existing data
4. Compatible with existing flat-file storage (no database)

## Data Model

```typescript
// lib/types.ts — add
export interface User {
  id: string;            // UUID
  username: string;      // unique, used for login
  passwordHash: string;  // bcrypt hash
  isAdmin: boolean;      // first user is admin
  tokenVersion: number;  // for JWT invalidation on logout
  createdAt: number;
}
```

## Storage Structure

```
data/
├── users.json                       # User accounts [{ id, username, passwordHash, isAdmin, tokenVersion, createdAt }]
├── users/
│   ├── {userId-1}/                  # First user (admin) — inherits old data
│   │   ├── settings.json            # AppSettings (personal, per-user)
│   │   └── conversations/
│   │       ├── {convId}.json
│   │       └── ...
│   ├── {userId-2}/
│   │   ├── settings.json
│   │   └── conversations/
│   └── ...
└── (legacy settings.json, conversations/ cleaned after migration)
```

## Authentication: JWT + httpOnly Cookie

- New dependencies: `bcryptjs`, `jsonwebtoken`
- JWT payload: `{ userId, username, isAdmin, tokenVersion }`
- Stored in httpOnly cookie: `llm_chat_token`, `Secure`, `SameSite=Lax`, 30-day expiry
- Secret: `JWT_SECRET` env var (fallback: auto-generated on first start, persisted in `data/.jwt-secret`)

### Logout: Token Version Invalidation

Each `User` has a `tokenVersion` field (default 0). JWT includes this version. On logout, server increments `tokenVersion` in `users.json`. Subsequent requests with the old token fail validation (version mismatch).

## API Routes

### New Auth Routes

| Route | Method | Body | Response | Notes |
|-------|--------|------|----------|-------|
| `/api/auth/register` | POST | `{ username, password }` | `{ user }` | Validates: username 3-20 chars, password 8+ chars. Sets cookie. |
| `/api/auth/login` | POST | `{ username, password }` | `{ user }` | Sets httpOnly cookie on success. |
| `/api/auth/logout` | POST | — | `{ ok }` | Increments tokenVersion, clears cookie. |
| `/api/auth/me` | GET | — | `{ user }` | Returns current user or 401. |

### Existing Routes — Add Auth Middleware

All `/api/conversations/*`, `/api/settings`, `/api/chat` routes extract `userId` from JWT cookie and scope data to `data/users/{userId}/`.

Shared helper: `getAuthUser(req)` → returns `User` or throws 401.

## Data Migration

On first startup after upgrade (detected by absence of `data/users.json`):

1. Auto-create admin user account with credentials provided via prompt or env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
2. Move `data/settings.json` → `data/users/{adminId}/settings.json`
3. Move `data/conversations/*.json` → `data/users/{adminId}/conversations/`
4. Create `data/users.json` with the admin user record

If `data/users.json` already exists, skip migration.

## Frontend Changes

### New Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | Username + password form, link to register |
| `/register` | `RegisterPage` | Username + password + confirm form, link to login |

### Modified Pages

- `app/layout.tsx`: Add `AuthProvider` context wrapping children
- `app/page.tsx`: On mount, call `/api/auth/me`. If 401, redirect to `/login`. Show username + logout button in top bar.
- `components/settings-dialog.tsx`: API Key and other settings now scoped to current user (no change needed — already stored per-user via new path)
- `components/chat/sidebar.tsx`: Show username in sidebar header

### Auth Context

```typescript
// lib/auth-context.tsx
interface AuthState {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}
```

Provides `useAuth()` hook. Fetches `/api/auth/me` on mount. Redirects to `/login` on 401.

## Security Considerations

- Passwords hashed with bcrypt (cost factor 12)
- JWT in httpOnly cookie (not accessible to JS)
- `SameSite=Lax` prevents CSRF on top-level navigations
- Token version invalidation for logout
- Input validation: username alphanumeric + underscore, 3-20 chars; password 8+ chars
- Rate limiting not included in v1 (can add later with a simple in-memory counter)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | No | JWT signing secret. Auto-generated if not set. |
| `ADMIN_USERNAME` | No | Admin username for auto-migration. |
| `ADMIN_PASSWORD` | No | Admin password for auto-migration. |

## Scope & Out of Scope

**In scope:**
- Username/password registration and login
- Per-user data isolation (conversations, settings)
- Data migration for existing data
- Login/register UI pages
- Auth context and route protection

**Out of scope:**
- OAuth/social login
- Email verification
- Password reset (admin can re-create account)
- Rate limiting
- Multi-instance deployment session sharing

## Files to Create/Modify

**New files:**
- `lib/auth.ts` — JWT sign/verify, password hash/verify, `getAuthUser()` helper
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `lib/auth-context.tsx` — AuthProvider + useAuth hook
- `lib/migrate.ts` — One-time data migration logic

**Modified files:**
- `lib/types.ts` — Add User interface
- `lib/server-storage.ts` — All functions accept `userId` param, paths change to `data/users/{userId}/`
- `app/api/conversations/route.ts` — Add auth, pass userId
- `app/api/conversations/[id]/route.ts` — Add auth, pass userId
- `app/api/settings/route.ts` — Add auth, pass userId
- `app/api/chat/route.ts` — Add auth, load user-specific settings
- `app/page.tsx` — Auth check, user display, logout
- `app/layout.tsx` — Wrap with AuthProvider
- `components/chat/sidebar.tsx` — Show username, logout button
- `package.json` — Add `bcryptjs`, `jsonwebtoken`, `@types/bcryptjs`, `@types/jsonwebtoken`
