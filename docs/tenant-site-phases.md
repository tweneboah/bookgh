# Tenant site: slug first, custom domain after deployment

Use **slug-based URLs** now. Add **custom domains** after you deploy and are ready to connect tenant DNS.

---

## Phase 1: Use slug (now)

**Tenant’s public site = your platform + slug.**

- **URL:** `https://yourplatform.com/hotels/[branch-slug]`  
  Example: `https://yourplatform.com/hotels/royal-kingdom-palace`
- **No DNS or custom domain needed.** Works as soon as the app is deployed.
- **Theme (logo, primary/accent colors)** already works: set in Platform → Tenants → Edit (Primary color, Accent color). Same page, slug URL.

**What to do now:**

1. Deploy the app (e.g. Vercel) with your main URL.
2. Ensure each **branch** has a **slug** (Branches → edit branch → Slug). That slug is used in `/hotels/[slug]`.
3. Give tenants their link: **`https://yourplatform.com/hotels/their-branch-slug`**.
4. They open that link → see their branded page → click **Login** (or **Dashboard** if already logged in) to reach the Bookgh dashboard.
5. Optionally set **Primary color** and **Accent color** in Platform → Tenants → Edit so their page uses their branding.

**Summary:** Focus on slug URLs and theme. No custom domain or `NEXT_PUBLIC_APP_URL` required for Phase 1 (but set `NEXT_PUBLIC_APP_URL` in production so “Admin login” and redirects work correctly).

---

## Phase 2: Custom domain (after deployment)

When you’re ready for tenants to use their own domain (e.g. `www.royalpalace.com`):

1. Set **`NEXT_PUBLIC_APP_URL`** to your main platform URL (e.g. `https://yourplatform.com`).
2. In Platform → Tenants → Edit, set **Custom domain** for that tenant (e.g. `www.royalpalace.com`).
3. Add the domain in your host (e.g. Vercel Domains).
4. Tenant points DNS (e.g. Namecheap CNAME) to your host.

Then visits to `https://www.royalpalace.com` show the same tenant page, with “Admin login” in the navbar. See [custom-domain-namecheap.md](./custom-domain-namecheap.md) for DNS steps.

---

## Links (Phase 1 — slug only)

| What | URL |
|------|-----|
| Discovery (search hotels) | `https://yourplatform.com/` |
| Tenant’s public page | `https://yourplatform.com/hotels/[branch-slug]` |
| Login | `https://yourplatform.com/login` |
| Dashboard (after login) | `https://yourplatform.com/dashboard` |
| Manage tenants (platform owner) | `https://yourplatform.com/platform/tenants` |

Tenants share their link: **`https://yourplatform.com/hotels/[their-branch-slug]`**.
