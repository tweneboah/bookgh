# Domain setup verification — bookgh.com + kingdomroyalpalacehotel.com

One Vercel project serves **both** domains. Here’s how it fits together and what to check.

---

## 1. How it works (one app, two domains)

| Domain | Purpose | Who decides? |
|--------|--------|---------------|
| **www.bookgh.com** | Main Bookgh platform (login, dashboard, browse hotels) | `NEXT_PUBLIC_APP_URL` = main platform host |
| **www.kingdomroyalpalacehotel.com** | Tenant’s hotel site (same app, tenant branding) | Middleware looks up tenant by this host and rewrites to `/hotels/[slug]` |

- **Vercel:** One project, multiple domains added. All hit the same app.
- **Bookgh:** Reads the request **host**. If host = `www.bookgh.com` → main platform. If host = `www.kingdomroyalpalacehotel.com` → API resolves tenant by `customDomain`, then serves that tenant’s hotel page.

---

## 2. Your current setup — verified

### Vercel (one project)

- **bookgh.com** — Valid, 307  
- **www.bookgh.com** — Valid, Production  
- **kingdomroyalpalacehotel.com** — Valid, 307  
- **www.kingdomroyalpalacehotel.com** — Valid, Production  
- **bookgh.vercel.app** — Valid, Production  

All pointing at the same project is correct.

### Namecheap — bookgh.com

| Type | Host | Value | Status |
|------|------|--------|--------|
| A | @ | 216.198.79.1 | ✅ Correct (root → Vercel) |
| CNAME | www | 7b9c7f4de7124d9e.vercel-dns-017.com. | ✅ Correct (www → Vercel) |
| TXT | @ | v=spf1... | ℹ️ For email; “Locked by Domain Redirect” is for that feature, not your web DNS. A/CNAME are what matter for the site. |

### Namecheap — kingdomroyalpalacehotel.com

| Type | Host | Value | Status |
|------|------|--------|--------|
| A | @ | 216.198.79.1 | ✅ Correct |
| CNAME | www | 7b9c7f4de7124d9e.vercel-dns-017.com. | ✅ Correct |
| TXT | @ | v=spf1... | ℹ️ Same as above; doesn’t block the site. |

So: **DNS for both domains is correct.** No need to change nameservers to “custom” for this to work.

---

## 3. What you must have in the Bookgh app

### 3.1 Environment variable (Vercel + .env.local)

Set the **main platform** URL (canonical host):

```env
NEXT_PUBLIC_APP_URL=https://www.bookgh.com
```

- In **Vercel:** Project → Settings → Environment Variables → add for Production (and Preview if you want).
- In **.env.local** for local dev.

Middleware uses this to know the “main” host; every other host is treated as a tenant custom domain.

### 3.2 Tenant custom domain in Bookgh

1. Log in as **super admin**.
2. **Platform** → **Tenants**.
3. **Edit** the tenant for Kingdom Royal Palace Hotel.
4. **Custom domain** must be exactly the host visitors use:
   - `www.kingdomroyalpalacehotel.com`  
   or  
   - `kingdomroyalpalacehotel.com`  
   (no `https://`, no path, no trailing slash.)
5. Save.

If this doesn’t match the request host (e.g. you set `kingdomroyalpalacehotel.com` but people go to `www.kingdomroyalpalacehotel.com`), the tenant won’t be found. Use the **exact** host you want the site to work on.

---

## 4. Redirects in Vercel (optional)

For **www.bookgh.com** you have:

- **Redirect to Another Domain:** 307 Temporary Redirect / No Redirect  

- If you want **bookgh.com** → **www.bookgh.com**: use the 307 redirect for **bookgh.com** to `https://www.bookgh.com`.
- For **www.bookgh.com** you can leave “No Redirect” so it serves the app.

Same idea for **kingdomroyalpalacehotel.com** → **www.kingdomroyalpalacehotel.com** if you want root to always go to www.

---

## 5. Checklist

- [ ] **Vercel:** All 4 domains (bookgh.com, www.bookgh.com, kingdomroyalpalacehotel.com, www.kingdomroyalpalacehotel.com) added and Valid.
- [ ] **Namecheap (both domains):** A @ → 216.198.79.1, CNAME www → 7b9c7f4de7124d9e.vercel-dns-017.com. (done).
- [ ] **Bookgh:** `NEXT_PUBLIC_APP_URL=https://www.bookgh.com` in Vercel (and .env.local).
- [ ] **Bookgh:** Tenant “Kingdom Royal Palace Hotel” has **Custom domain** = `www.kingdomroyalpalacehotel.com` (or `kingdomroyalpalacehotel.com` if you use root).
- [ ] **Nameservers:** Both domains use **Namecheap BasicDNS** (default). No need for custom nameservers unless you prefer Vercel DNS.
- [ ] **TXT “Locked by Domain Redirect”:** Ignore for the website; it’s for email. Your A and CNAME are what Vercel uses.

---

## 6. If www.kingdomroyalpalacehotel.com still doesn’t load

1. **Propagation:** Wait 15–30 min (or up to 24–48 h) and try again. Check [whatsmydns.net](https://www.whatsmydns.net) for **www.kingdomroyalpalacehotel.com** (CNAME should show the Vercel hostname).
2. **Nameservers:** Confirm both domains use **Namecheap BasicDNS** (not a different DNS host) so the A/CNAME records are used.
3. **App:** Confirm the tenant has **Custom domain** set and that you’ve redeployed after setting `NEXT_PUBLIC_APP_URL`.

Your configuration is correct; the rest is propagation and app settings.
