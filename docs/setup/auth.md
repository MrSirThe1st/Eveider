# Auth Setup

Eveider uses **Supabase Auth** + **PostgreSQL user profiles** (via `packages/data-access`).

## Unified web portal

All web roles share one app (`apps/web-manager`, port **3000**):

| URL | Purpose |
|-----|---------|
| `/` | Public landing page |
| `/connexion` | Shared login (all web roles) |
| `/inscription` | Organization self-registration |
| `/organisation/tableau-de-bord/verification` | Optional KYC / Get verified |
| `/onboarding` | Redirects to organization verification |
| `/tableau-de-bord/*` | Admin dashboard (role: `admin`) |
| `/entreprise/tableau-de-bord/*` | Business dashboard (role: `business`) |

After login, users are redirected automatically based on their role. Customer and courier accounts must use the mobile app.

## Web (business + admin)

Email and password only:

- **Sign up** (business): `signUp({ email, password })` → `POST /api/auth/onboard`
- **Sign in**: `signInWithPassword({ email, password })` → `GET /api/auth/me` → redirect by role

Session resolution:

- **Middleware** — `supabase.auth.getUser()` when a session cookie exists. No Postgres.
- **RSC** — `getCurrentUser()` (`React.cache()` → `getUser()` + one `findByAuthId`). Layout and page share that cache **within the same request only**.
- **Cookie API routes** — `resolveCurrentUser()` already includes `profile`. Do not call `findByAuthId` / `findProfileByAuthId` again.
- **Bearer API routes** — `getUser(token)` then **one** profile lookup.

Keep `getUser()` for session validation. Do not switch to `getSession()` without a dedicated auth review. See `docs/blueprint/ai/data-fetching.md`.

## Mobile (customer + courier)

Email and password (same as web — no SMS provider required for dev):

1. `signUp({ email, password })` or `signInWithPassword({ email, password })`
2. `POST /api/auth/onboard` on register (role: `customer` only)
3. `GET /api/auth/me` on login

Customers should register with the **same phone** used as `recipientPhone` on business parcels so colis appear in the app. Phone OTP can be re-enabled later when an SMS provider is configured.

Courier accounts are **not self-service**. Eveider or a company submits a dossier; admin reviews it; then an invite is sent. The courier only signs in on mobile. Web `/inscription` has no Coursier tab. Mobile `POST /api/auth/onboard` accepts `customer` only.

Password reset: `Mot de passe oublié` on the auth screen sends a Supabase recovery email. Add these redirect URLs in Supabase Auth:

- `eveider://reset-password`

The native app exchanges the recovery (or invite) URL for a session, then opens the set-password screen. Courier invites use the same mobile password-set deep link — not the web team-invite page.

Deleted customers keep parcel history; email/phone stay reserved (Auth user is banned, not hard-deleted). Deactivated couriers cannot log in until the contractor reactivates them. Blocked (`is_blocked`) remains a separate disciplinary status.

## Surfaces

| App | Login | Register | Allowed roles | Auth |
|-----|-------|----------|---------------|------|
| `web-manager` | `/connexion` | `/inscription` | `admin`, `business` | Email + password |
| `mobile-tenant` | Auth screen | Auth screen (customer) | `customer`, `courier` (login) | Email + password |

## Supabase configuration

**Authentication → Providers → Email**

- Enable Email provider
- **Disable “Confirm email”** for dev (otherwise sign-up won't return a session immediately)

**Authentication → Providers → Phone**

- Optional — only needed when switching mobile back to SMS OTP

## First admin user

Admin accounts are not self-service:

1. Create user in Supabase Auth (email + password) or sign up via dashboard
2. Insert profile:

```sql
INSERT INTO users (id, auth_id, role, email, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '<SUPABASE_AUTH_USER_UUID>',
  'admin',
  'admin@eveider.cd',
  NOW(),
  NOW()
);
```

## Mobile environment

Expo reads env from the **repo root** `.env` (not `apps/mobile-tenant/`). Copy from `.env.example` and set:

```
EXPO_PUBLIC_SUPABASE_URL=https://clgcdbgnqqiosnijdbns.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable key>
EXPO_PUBLIC_AUTH_API_URL=http://localhost:3000
```

**Physical device (Expo Go on phone):** `localhost` points at the phone, not your Mac. Set `EXPO_PUBLIC_AUTH_API_URL` to your computer's LAN IP (same network as the phone), e.g. `http://172.20.10.6:3000`. Find it in the Expo terminal (`Metro waiting on exp://…`) or run `ipconfig getifaddr en0` on macOS. Restart Expo after changing `.env`.

**The web manager must be running** on port 3000 — mobile calls `/api/auth/me` and customer/courier APIs there.

The dev script binds to **`0.0.0.0`** so your phone can reach the Mac over Wi‑Fi. If it still fails:

1. Mac and phone on the **same Wi‑Fi** (not guest network)
2. Test from phone browser: `http://<MAC-IP>:3000` — should load a page
3. macOS **Firewall** may block Node — allow incoming for Node/Terminal if prompted
4. Restart Expo after any `.env` change (`dev:clear`)

Start mobile with:

```bash
pnpm dev:mobile
# or clear Metro cache:
pnpm --filter @eveider/mobile-tenant dev:clear
# web browser (same machine — use localhost in EXPO_PUBLIC_AUTH_API_URL):
pnpm --filter @eveider/mobile-tenant dev:web
```

`app.config.js` and `metro.config.js` load `EXPO_PUBLIC_*` from the repo root `.env` automatically (no `dotenv-cli` needed).

### Web browser testing (Expo web)

When testing in the browser instead of Expo Go on a phone:

1. Set `EXPO_PUBLIC_AUTH_API_URL=http://localhost:3000` in root `.env`
2. Start **web manager**: `pnpm dev` (or `pnpm --filter @eveider/web-manager dev`)
3. Start **mobile web**: `pnpm --filter @eveider/mobile-tenant dev:web`
4. Open the URL shown in the terminal (usually `http://localhost:8081`)

Use the **project** Expo CLI (`pnpm --filter @eveider/mobile-tenant dev:web`), not the deprecated global `expo-cli`.

## Customer mobile testing (Step 9)

1. Start **web manager** (`:3000`) — web + mobile API host
2. Start **mobile**: `pnpm dev:mobile`
3. Register as **CLIENT** with email + password; use the **same phone** as parcel `recipientPhone` (e.g. `+243800000000`)
4. On the portal, sign in as a **business** user and create a parcel with that **same recipient phone**
5. Sign in as **admin** and advance parcel status to **PRÊT POUR RETRAIT** — a 6-digit PIN is created automatically
6. In the mobile app, open the parcel → **VOIR LE CODE DE RETRAIT**

Parcels are matched by `customerId` or `recipientPhone` on the customer profile.

### Inscription incomplète (auth sans profil)

Si l’utilisateur apparaît dans **Authentication → Users** mais pas dans `public.users`, l’appel `POST /api/auth/onboard` a échoué (souvent `EXPO_PUBLIC_AUTH_API_URL` incorrect). **Connexion** avec le même email affiche alors **Compléter le profil** pour finaliser sans recréer le compte Supabase.
