# Verify kingdomroyalpalacehotel.com is set correctly

## 1. Code check ✅

The app is set up correctly for custom domains:

- **Middleware** (`middleware.ts`): For any host that is not `www.bookgh.com`, it calls the tenant-by-domain API and rewrites `/` and `/hotels` to `/hotels/[slug]`.
- **API** (`/api/public/tenant-by-domain`): Accepts `?domain=<host>`, normalizes it (lowercase, no protocol), finds a **Tenant** with `customDomain` = that value and `status: "active"`, then returns the branch slug (or tenant slug) so the middleware can rewrite.
- **Tenant model**: `customDomain` is stored lowercase and must match the request **host** exactly (e.g. `www.kingdomroyalpalacehotel.com` or `kingdomroyalpalacehotel.com`).

So **kingdomroyalpalacehotel.com** is supported; it only needs to be set correctly in the database and DNS.

---

## 2. What must be true in the database

For **www.kingdomroyalpalacehotel.com** (or **kingdomroyalpalacehotel.com**) to work:

| Requirement | Where to check |
|-------------|----------------|
| A **Tenant** exists for Kingdom Royal Palace Hotel | Platform → Tenants |
| That tenant’s **Custom domain** is exactly **`www.kingdomroyalpalacehotel.com`** (or **`kingdomroyalpalacehotel.com`** if you use root) | Platform → Tenants → Edit tenant → Custom domain |
| Tenant **Status** is **Active** | Platform → Tenants (Status column) |
| That tenant has at least one **Branch** with **status: active** and **published** | Branches / hotel setup |
| That branch has a **slug** (e.g. `royal-palace`) | Used for rewrite to `/hotels/[slug]` |

The **Custom domain** value must match the host the user types in the browser (with or without `www`). You can only store one custom domain per tenant; use the one you actually use in DNS (e.g. `www.kingdomroyalpalacehotel.com`).

---

## 3. Quick API test (no auth)

From a browser or curl, call the tenant-by-domain API with the same host you use in production:

**If you use www:**

```
https://www.bookgh.com/api/public/tenant-by-domain?domain=www.kingdomroyalpalacehotel.com
```

**If you use root only:**

```
https://www.bookgh.com/api/public/tenant-by-domain?domain=kingdomroyalpalacehotel.com
```

(Use your real production URL instead of `www.bookgh.com` if different.)

- **200 OK** with JSON like `{ data: { slug: "royal-palace", name: "...", ... } }` → tenant is set correctly; middleware will rewrite that domain to `/hotels/royal-palace`.
- **404** or error → no tenant found for that domain. Then:
  - Confirm in **Platform → Tenants → Edit** that **Custom domain** is exactly `www.kingdomroyalpalacehotel.com` (or `kingdomroyalpalacehotel.com`), no `https://`, no path, no typo.
  - Confirm tenant status is **Active** and that it has a published branch with a slug.

---

## 4. Checklist

- [ ] **Platform → Tenants**: Tenant “Kingdom Royal Palace Hotel” (or equivalent) has **Custom domain** = `www.kingdomroyalpalacehotel.com` (or `kingdomroyalpalacehotel.com`).
- [ ] **Platform → Tenants**: Same tenant **Status** = **Active**.
- [ ] Tenant has at least one **Branch**, **active** and **published**, with a **slug** (e.g. `royal-palace`).
- [ ] **Env**: `NEXT_PUBLIC_APP_URL` = `https://www.bookgh.com` (so middleware treats that as platform and everything else as custom domain).
- [ ] **API test**: `GET /api/public/tenant-by-domain?domain=www.kingdomroyalpalacehotel.com` returns **200** and a `slug` in the response.

If all of the above are true, **kingdomroyalpalacehotel.com** is set correctly in the app; any remaining issues are DNS or propagation.
