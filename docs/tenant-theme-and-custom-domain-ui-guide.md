# Tenant theme & custom domain — UI links and flow

This guide lists **all UI links** for the tenant theme and custom-domain features and explains **where to click** and **in what order**.

Use your app’s base URL in place of `http://localhost:3000` (e.g. `https://yourplatform.com`).

**Phased approach:** Use **slug** first (`yourplatform.com/hotels/[slug]`); add **custom domain** after deployment. See [tenant-site-phases.md](./tenant-site-phases.md).

---

## Quick reference: all links

| Who | Link | What it is |
|-----|------|------------|
| **Anyone** | `/` | Discovery homepage (search hotels) |
| **Anyone** | `/hotels/[slug]` | Single hotel’s public page (e.g. `/hotels/royal-kingdom-palace`) |
| **Tenant on custom domain** | `https://www.royalpalace.com` (example) | Same content as `/hotels/[slug]` but on their domain, with “Admin login” |
| **Guest / Staff** | `/login` | Login page |
| **Staff after login** | `/dashboard` | Bookgh dashboard home |
| **Platform owner** | `/platform/tenants` | List and manage tenants (add custom domain & theme here) |
| **Platform owner** | `/platform/tenants` → **Edit** a tenant | Modal: Custom domain, Primary color, Accent color |
| **Public API** | `/api/public/tenant-by-domain?domain=www.royalpalace.com` | Resolves tenant by domain (used by middleware; no UI) |

---

## Flow 1: Platform owner — set a tenant’s custom domain and theme

**Goal:** Give a hotel (tenant) its own domain and branding (logo/colors).

1. **Log in as platform owner (superAdmin).**
   - Open: **`/login`**
   - Use an account with role `superAdmin`.

2. **Go to Tenants.**
   - In the sidebar, click **Platform** → **Tenants**  
   - Or open: **`/platform/tenants`**

3. **Edit the tenant.**
   - In the table, find the hotel (tenant) and click **Edit** (pencil).
   - The **Edit Tenant** modal opens.

4. **Set custom domain and theme.**
   - **Custom domain** — e.g. `www.royalpalace.com` (no `https://`, no path).
   - **Primary color** — e.g. `#5a189a` (used for nav accent, links).
   - **Accent color** — e.g. `#ff6d00` (used for buttons, highlights).
   - Click **Update**.

5. **Add the domain in your host (e.g. Vercel).**
   - In Vercel: Project → **Settings** → **Domains** → add `www.royalpalace.com`.
   - Tenant points that domain to your host (see [custom-domain-namecheap.md](./custom-domain-namecheap.md)).

**Links used:**  
`/login` → `/dashboard` → sidebar **Platform** → **Tenants** → **Edit** (per tenant).

---

## Flow 2: Guest — find a hotel and open its page (platform URL)

**Goal:** See a hotel’s public page with branding (theme) on the main platform.

1. **Open the discovery page.**  
   - **`/`**  
   - Search or browse hotels.

2. **Open a hotel.**  
   - Click a hotel card.  
   - You go to **`/hotels/[slug]`** (e.g. `/hotels/royal-kingdom-palace`).

3. **What you see.**
   - Tenant’s name and logo in the navbar (if set).
   - Nav bar strip and buttons use tenant **primary** and **accent** colors (if set).
   - “Back to hotels” (to return to discovery).
   - “Login” / “Sign up” (platform auth).
   - Rooms, events, “Book now”, etc.

**Links used:**  
`/` → click hotel → `/hotels/[slug]`.

---

## Flow 3: Tenant staff — visit “their” site on the platform (by slug)

**Goal:** Open the hotel’s public page from the main platform, then go to the dashboard.

1. **Open the hotel page by slug.**  
   - **`/hotels/[their-branch-slug]`**  
   - Example: **`/hotels/royal-kingdom-palace`**  
   - (You can get the slug from **Branches** in the dashboard, or from the discovery list.)

2. **What they see.**
   - Their hotel’s branding (name, logo, colors).
   - “Back to hotels” (they’re on the platform).
   - If not logged in: “Login” / “Sign up”.
   - If logged in: “Dashboard” and (for customers) “My Bookings”.

3. **Go to the dashboard.**  
   - Click **Dashboard** in the navbar.  
   - They are sent to **`/dashboard`** (Bookgh dashboard).

**Links used:**  
`/hotels/[slug]` → navbar **Dashboard** → `/dashboard`.

---

## Flow 4: Tenant staff — visit their site on custom domain and use “Admin login”

**Goal:** Tenant opens their own URL (e.g. from Namecheap); they see only their hotel and use “Admin login” to reach the dashboard.

1. **Tenant opens their custom domain.**  
   - Example: **`https://www.royalpalace.com`**  
   - (Domain must be set in Platform → Tenants → Edit and in your host/Vercel; DNS must point to your app.)

2. **What they see.**
   - **No** “Back to hotels” (they’re on “their” site).
   - Tenant name and logo in the navbar.
   - Theme uses their **primary** and **accent** colors.
   - **“Admin login”** in the navbar (instead of the usual “Login” when not on custom domain).

3. **Click “Admin login”.**  
   - They are sent to the **platform** login:  
   - **`https://yourplatform.com/login?returnTo=/dashboard`**  
   - (Replace `yourplatform.com` with your `NEXT_PUBLIC_APP_URL` host.)

4. **Log in.**  
   - Enter credentials on the platform login page.  
   - After success, they are redirected to **`/dashboard`** (Bookgh dashboard).

5. **Use the dashboard.**  
   - They use **`/dashboard`** and the rest of the sidebar (Branches, Bookings, etc.) as normal.

**Links used:**  
`https://www.royalpalace.com` → navbar **Admin login** → `https://yourplatform.com/login?returnTo=/dashboard` → (after login) **`/dashboard`**.

---

## Flow 5: Tenant staff already logged in on custom domain

**Goal:** They’re on their custom domain and already logged in; they want Dashboard or My Bookings.

1. **They’re on** `https://www.royalpalace.com` **and logged in.**

2. **Click “Dashboard” in the navbar.**  
   - They are sent to the platform: **`https://yourplatform.com/dashboard`**.

3. **Click “My Bookings” (if they have customer role).**  
   - They are sent to **`https://yourplatform.com/my-bookings`**.

So from a custom domain, **Dashboard** and **My Bookings** always point to the **platform** URL so everything stays in one app.

---

## Where each link lives in the UI

| What | Where to click |
|------|----------------|
| **Discovery (search hotels)** | Navbar logo “Bookgh” or open **`/`** |
| **A hotel’s public page** | Discovery: click a hotel card → **`/hotels/[slug]`** |
| **Back to discovery** | On `/hotels/[slug]`: navbar **“Back to hotels”** (only when not on custom domain) |
| **Login (platform)** | Navbar **“Login”** (or **“Admin login”** when on custom domain) |
| **Dashboard** | Navbar **“Dashboard”** (after login), or sidebar **Overview → Dashboard** |
| **Platform → Tenants** | Sidebar **Platform** → **Tenants** → **`/platform/tenants`** |
| **Edit tenant (custom domain & theme)** | On **`/platform/tenants`**: table row → **Edit** (pencil) → in modal: **Custom domain**, **Primary color**, **Accent color** → **Update** |

---

## Summary

- **Platform owner:** **`/platform/tenants`** → **Edit** tenant → set **Custom domain**, **Primary color**, **Accent color** → **Update**. Then add the domain in Vercel and have the tenant point DNS (Namecheap) to your host.
- **Guest:** **`/`** → click hotel → **`/hotels/[slug]`** (theme applied).
- **Tenant on platform URL:** **`/hotels/[slug]`** → **Dashboard** → **`/dashboard`**.
- **Tenant on custom domain:** open **`https://www.their-domain.com`** → **Admin login** → platform **`/login?returnTo=/dashboard`** → after login, **`/dashboard`**.

All dashboard and post-login links (Dashboard, My Bookings) from a custom domain use the platform base URL so the app stays consistent.
