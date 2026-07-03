# Auth Setup

Eveider uses **Supabase Auth** + **Prisma user profiles**.

## Unified web portal

All web roles share one app (`apps/web-admin`, port **3000**):

| URL | Purpose |
|-----|---------|
| `/` | Public landing page |
| `/connexion` | Shared login (all web roles) |
| `/inscription` | Business self-registration |
| `/tableau-de-bord/*` | Admin dashboard (role: `admin`) |
| `/entreprise/tableau-de-bord/*` | Business dashboard (role: `business`) |

After login, users are redirected automatically based on their role. Customer and courier accounts must use the mobile app.

`apps/web-business` is deprecated — it redirects to the unified portal.

## Web (business + admin)

Email and password only:

- **Sign up** (business): `signUp({ email, password })` → `POST /api/auth/onboard`
- **Sign in**: `signInWithPassword({ email, password })` → `GET /api/auth/me` → redirect by role

## Mobile (customer + courier)

Email and password (same as web — no SMS provider required for dev):

1. `signUp({ email, password })` or `signInWithPassword({ email, password })`
2. `POST /api/auth/onboard` on register (role: `customer` or `courier`)
3. `GET /api/auth/me` on login

Customers should register with the **same phone** used as `recipientPhone` on business parcels so colis appear in the app. Phone OTP can be re-enabled later when an SMS provider is configured.

## Surfaces

| App | Login | Register | Allowed roles | Auth |
|-----|-------|----------|---------------|------|
| `web-admin` (unified portal) | `/connexion` | `/inscription` | `admin`, `business` | Email + password |
| `mobile` | Auth screen | Auth screen + role | `customer`, `courier` | Email + password |

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

Expo reads env from the **repo root** `.env` (not `apps/mobile/`). Copy from `.env.example` and set:

```
EXPO_PUBLIC_SUPABASE_URL=https://clgcdbgnqqiosnijdbns.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable key>
EXPO_PUBLIC_AUTH_API_URL=http://localhost:3000
```

**Physical device (Expo Go on phone):** `localhost` points at the phone, not your Mac. Set `EXPO_PUBLIC_AUTH_API_URL` to your computer's LAN IP (same network as the phone), e.g. `http://172.20.10.6:3000`. Find it in the Expo terminal (`Metro waiting on exp://…`) or run `ipconfig getifaddr en0` on macOS. Restart Expo after changing `.env`.

**The unified portal must be running** on port 3000 — mobile calls `/api/auth/me` and customer/courier APIs there.

The dev script binds to **`0.0.0.0`** so your phone can reach the Mac over Wi‑Fi. If it still fails:

1. Mac and phone on the **same Wi‑Fi** (not guest network)
2. Test from phone browser: `http://<MAC-IP>:3000` — should load a page
3. macOS **Firewall** may block Node — allow incoming for Node/Terminal if prompted
4. Restart Expo after any `.env` change (`dev:clear`)

Start mobile with:

```bash
pnpm --filter @eveider/mobile dev
# or clear Metro cache:
pnpm --filter @eveider/mobile dev:clear
# web browser (same machine — use localhost in EXPO_PUBLIC_AUTH_API_URL):
pnpm --filter @eveider/mobile dev:web
```

`app.config.js` and `metro.config.js` load `EXPO_PUBLIC_*` from the repo root `.env` automatically (no `dotenv-cli` needed).

### Web browser testing (Expo web)

When testing in the browser instead of Expo Go on a phone:

1. Set `EXPO_PUBLIC_AUTH_API_URL=http://localhost:3000` in root `.env`
2. Start **unified portal**: `pnpm --filter @eveider/web-admin dev`
3. Start **mobile web**: `pnpm --filter @eveider/mobile dev:web`
4. Open the URL shown in the terminal (usually `http://localhost:8081`)

Use the **project** Expo CLI (`pnpm --filter @eveider/mobile dev:web`), not the deprecated global `expo-cli`.

## Customer mobile testing (Step 9)

1. Start **unified portal** (`:3000`) — web + mobile API host
2. Start **mobile**: `pnpm --filter @eveider/mobile dev`
3. Register as **CLIENT** with email + password; use the **same phone** as parcel `recipientPhone` (e.g. `+243800000000`)
4. On the portal, sign in as a **business** user and create a parcel with that **same recipient phone**
5. Sign in as **admin** and advance parcel status to **PRÊT POUR RETRAIT** — a 6-digit PIN is created automatically
6. In the mobile app, open the parcel → **VOIR LE CODE DE RETRAIT**

Parcels are matched by `customerId` or `recipientPhone` on the customer profile.

### Inscription incomplète (auth sans profil)

Si l’utilisateur apparaît dans **Authentication → Users** mais pas dans `public.users`, l’appel `POST /api/auth/onboard` a échoué (souvent `EXPO_PUBLIC_AUTH_API_URL` incorrect). **Connexion** avec le même email affiche alors **Compléter le profil** pour finaliser sans recréer le compte Supabase.
