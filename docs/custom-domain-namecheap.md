# Custom domain setup (Namecheap + Bookgh)

This guide explains how tenants can use a **custom domain** (e.g. `royalpalace.com`) so that when guests visit their site, they see the tenant’s branded hotel page and “Admin login” that goes to the Bookgh dashboard.

## How it works

1. **Platform** is hosted at a main URL (e.g. `https://yourplatform.com`). You set `NEXT_PUBLIC_APP_URL` to this URL.
2. **Tenant** gets a **custom domain** (e.g. `www.royalpalace.com` or `royalpalace.com`) and points it to the **same** hosting (e.g. Vercel) as the platform.
3. **Middleware** in Bookgh sees the request host. If it’s not the platform host, it calls the API to resolve the tenant by `customDomain`, then rewrites the request to `/hotels/[slug]`. The browser URL stays the tenant’s domain.
4. **Tenant’s page** loads with their branding (logo, primary/accent colors) and an “Admin login” link that goes to the platform login and then the dashboard.

---

## 1. Platform setup (you)

### 1.1 Environment variable

In your deployment (e.g. Vercel), set:

- **`NEXT_PUBLIC_APP_URL`** = your main platform URL, e.g. `https://yourplatform.com` (no trailing slash).

Middleware uses this to know which host is the “platform” and which are custom domains.

### 1.2 Add the tenant’s domain in your host (e.g. Vercel)

1. In **Vercel** (or your host): Project → **Settings** → **Domains**.
2. Add the tenant’s domain, e.g. `www.royalpalace.com` or `royalpalace.com`.
3. Vercel will show the **target** the tenant must point their domain to (e.g. `cname.vercel-dns.com` for CNAME, or an A record target).

You’ll give this target to the tenant (or they give you the domain and you add it).

---

## 2. Tenant setup (Namecheap)

The tenant points their Namecheap domain to your hosting. Two common cases:

- **Root domain** (`royalpalace.com`)  
- **Subdomain** (`www.royalpalace.com`)

### 2.1 Option A: Use `www` (recommended)

**In Namecheap:**

1. Log in → **Domain List** → select the domain → **Manage**.
2. Go to **Advanced DNS**.
3. Add or edit:
   - **Type:** CNAME  
   - **Host:** `www`  
   - **Value:** the target from your host (e.g. `cname.vercel-dns.com` for Vercel).  
   - TTL: Automatic (or 300).
4. (Optional) Redirect root to www:
   - **Redirect Domain**: add a **URL Redirect** for `@` (or `royalpalace.com`) → `https://www.royalpalace.com` (Permanent 301).

Then in your platform (and in Vercel Domains), use **`www.royalpalace.com`** as the custom domain for that tenant.

### 2.2 Option B: Root domain only (`royalpalace.com`)

**In Namecheap:**

1. **Advanced DNS** for the domain.
2. Add an **A record**:
   - **Host:** `@`  
   - **Value:** the IP your host gives for root domains (e.g. Vercel’s A record IP, often `76.76.21.21`).  
   - TTL: Automatic (or 300).
3. If your host supports CNAME flattening (e.g. Vercel), they may instead give you a CNAME target for `@`; in that case you can use a CNAME for **Host** `@` and **Value** that target.

In your platform and in Vercel Domains, use **`royalpalace.com`** (no `www`) as the custom domain.

### 2.3 SSL (HTTPS)

Once the domain is added in Vercel (or your host) and DNS is correct, the host will issue an SSL certificate. Namecheap does not need extra SSL settings for this; the host handles HTTPS.

---

## 3. Bookgh: set the tenant’s custom domain

1. Log in as **platform owner** (superAdmin).
2. Go to **Platform** → **Tenants**.
3. **Edit** the tenant.
4. Set **Custom domain** to the exact host the tenant will use, e.g. `www.royalpalace.com` or `royalpalace.com` (no `https://`, no path).
5. Optionally set **Primary color** and **Accent color** (e.g. `#5a189a`, `#ff6d00`) for their branding.
6. Save.

After DNS has propagated, visiting `https://www.royalpalace.com` (or whatever you set) will show that tenant’s hotel page with their branding and “Admin login”.

---

## 4. Checklist (tenant on Namecheap)

- [ ] Domain added in your host (e.g. Vercel Domains).
- [ ] In Namecheap **Advanced DNS**:
  - **www** → CNAME → your host’s CNAME target, **or**
  - **@** → A (or CNAME) → your host’s root target.
- [ ] In Bookgh: tenant **Custom domain** = that host exactly (e.g. `www.royalpalace.com`).
- [ ] `NEXT_PUBLIC_APP_URL` set to your main platform URL.
- [ ] Wait for DNS propagation (up to 24–48 hours; often minutes).
- [ ] Visit the custom domain; you should see the tenant’s page and “Admin login”.

---

## 5. Troubleshooting

- **“Tenant not found” or wrong site**  
  - Confirm **Custom domain** in Bookgh matches the request host exactly (no `https://`, no trailing slash, correct `www` vs non-`www`).
- **DNS / not loading**  
  - Use `dig www.royalpalace.com` or [whatsmydns.net](https://www.whatsmydns.net) to confirm the CNAME or A record points to your host.
- **SSL errors**  
  - Ensure the domain is added in your host’s Domains and that DNS is correct; the host will then issue the certificate.
