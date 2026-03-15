# Connect tenant domain: kingdomroyalpalacehotel.com

Steps to connect **kingdomroyalpalacehotel.com** (and **www**) to your Bookgh app so the tenant’s custom domain shows their hotel site.

---

## 1. Add the domain in Vercel (you do this first)

1. Open your **Bookgh** project in Vercel.
2. Go to **Settings** → **Domains**.
3. Click **Add** and enter:
   - `www.kingdomroyalpalacehotel.com`
   - Then add `kingdomroyalpalacehotel.com` as well.
4. Vercel will show the **DNS records** needed (CNAME for `www`, and either A record or CNAME for `@`).  
   **Note the exact Value(s)** it shows (e.g. `cname.vercel-dns.com` or something like `xxxx.vercel-dns-017.com` for `www`, and the A record IP for `@` if shown).

You’ll use these values in Namecheap in the next step.

---

## 2. Update DNS in Namecheap

In **Namecheap** → **Domain List** → **kingdomroyalpalacehotel.com** → **Manage** → **Advanced DNS**.

### 2.1 Point `www` to Vercel

- Find the **CNAME** row where **Host** = `www`.
- **Edit** it:
  - **Host:** `www`
  - **Value:** use the value Vercel shows for **www** (e.g. `cname.vercel-dns.com.` or `xxxx.vercel-dns-017.com.`).  
    Replace the current `parkingpage.namecheap.com.` with this.  
    Keep a trailing dot if Namecheap expects it for external targets.
  - **TTL:** Automatic (or 30 min)
- Save.

### 2.2 Point root `@` to Vercel

- **Remove** the **URL Redirect Record** for **Host** `@` (the one to `http://www.kingdomroyalpalacehotel.com/`).
- **Add** an **A Record**:
  - **Type:** A Record
  - **Host:** `@`
  - **Value:** the IP Vercel shows for `@` (e.g. `76.76.21.21` or `216.198.79.1` – use what Vercel displays for this project).
  - **TTL:** Automatic (or 30 min)
- Save.

### 2.3 (Optional) Redirect root to www

If you want **kingdomroyalpalacehotel.com** to redirect to **www.kingdomroyalpalacehotel.com**:

- Add a **URL Redirect Record**:
  - **Host:** `@`
  - **Value:** `https://www.kingdomroyalpalacehotel.com`
  - **Redirect type:** Permanent (301), Unmasked.

---

## 3. Set the custom domain in Bookgh

1. Log in as **platform owner (super admin)**.
2. Go to **Platform** → **Tenants**.
3. Find the tenant for this hotel (e.g. Royal Palace / Kingdom Royal Palace Hotel) and click **Edit**.
4. In **Custom domain**, enter the **exact** host visitors will use:
   - If you use **www**: `www.kingdomroyalpalacehotel.com`
   - If you use **root only**: `kingdomroyalpalacehotel.com`  
   No `https://`, no path, no trailing slash.
5. Click **Update**.

Middleware will use this value to show this tenant’s site when someone visits that domain.

---

## 4. Checklist

- [ ] Vercel: **www.kingdomroyalpalacehotel.com** and **kingdomroyalpalacehotel.com** added to the Bookgh project.
- [ ] Namecheap: CNAME **www** → Vercel’s CNAME target (not parkingpage.namecheap.com).
- [ ] Namecheap: URL Redirect for **@** removed; A record **@** → Vercel’s IP added.
- [ ] (Optional) Namecheap: URL Redirect **@** → `https://www.kingdomroyalpalacehotel.com`.
- [ ] Bookgh: **Platform → Tenants → Edit** → **Custom domain** = `www.kingdomroyalpalacehotel.com` (or `kingdomroyalpalacehotel.com`).
- [ ] Wait for DNS to propagate (minutes to 24–48 hours).
- [ ] Visit **https://www.kingdomroyalpalacehotel.com** (or the root) and confirm the tenant’s hotel page loads.

---

## 5. If the tenant slug is different

The **Custom domain** field is only the domain. The tenant is matched by that domain; the app then loads the correct hotel by the tenant’s **branch slug** (from the first published branch). If you have a tenant “Kingdom Royal Palace Hotel” with slug e.g. `royal-palace`, that’s already linked – you don’t type the slug in the Custom domain field. Just set **Custom domain** to the domain (e.g. `www.kingdomroyalpalacehotel.com`) and save.
