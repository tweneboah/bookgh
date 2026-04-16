# Platform Owner (Super Admin) Login

The platform supports a **platform owner** role (`superAdmin`) that can log in and manage all tenants (hotels) without belonging to any single tenant.

## How it works

- **Login**: Use the same login page (`/login`) with email and password. Any user in the database with `role: "superAdmin"` can sign in.
- **Session**: The JWT includes `role`, and optionally `tenantId` / `branchId`. Platform owners typically have **no** `tenantId` (or it is unset).
- **Sidebar**: When the logged-in user is `superAdmin` and has no `tenantId`, the sidebar shows only:
  - **Overview** (Dashboard)
  - **Platform** (Tenants, Subscription Plans)
  - **Settings** (Profile, Notifications, Activity Logs)
- **APIs**: Platform routes (`/api/platform/tenants`, `/api/platform/subscription-plans`) require only the `superAdmin` role and do **not** require a tenant. All other APIs require tenant (and often branch) context, so they are not used when acting as platform-only.

## Quick start: sample platform owner (recommended)

From the `hotel-hub` project root, with MongoDB running and `MONGODB_URI` set in `.env` or `.env.local`:

```bash
npm run seed:platform-owner
```

Defaults:

| Field | Default |
|--------|---------|
| Email | `platform.owner@example.com` |
| Password | `ChangeMe!Platform1` |

Override with environment variables:

```bash
PLATFORM_OWNER_EMAIL=you@yourcompany.com \
PLATFORM_OWNER_PASSWORD='YourSecurePassword' \
npm run seed:platform-owner
```

Then open **`http://localhost:3000/login`** (or your dev port, e.g. `3001`) and sign in with that email and password. You can manage tenants at **`/platform/tenants`** and subscription plans at **`/platform/subscription-plans`**.

If the email already exists, the script **promotes** that user to `superAdmin`, updates the password, and clears `tenantId` / `branchId` so the account is platform-only.

## Creating the first platform owner (manual)

There is no self-service or in-app flow to create a `superAdmin`. Use one of these:

### Option A – Promote an existing user in MongoDB

1. Ensure you have at least one user (e.g. create a customer via `/register` or a hotel owner via `/register-hotel`).
2. In MongoDB, find the user by `email` and update:
   - `role: "superAdmin"`
   - Optionally set `tenantId` and `branchId` to `null` or remove them so the user is platform-only.

### Option B – Insert a new user in MongoDB

Insert a user document with:

- `firstName`, `lastName`, `email`
- `password`: bcrypt hash of the chosen password (e.g. use the same hashing as in `register` or `register-hotel`).
- `role: "superAdmin"`
- `isActive: true`
- Do **not** set `tenantId` or `branchId` (or set them to `null`) for a platform-only owner.

After that, the user can log in at `/login` and will see only Dashboard, Platform (Tenants, Subscription Plans), and Settings.
