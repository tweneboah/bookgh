# Fix www.kingdomroyalpalacehotel.com using Cloudflare DNS

Namecheap DNS for this domain isn’t resolving for you. Use **Cloudflare** (free) as the DNS provider so the domain resolves reliably.

---

## Step 1: Add the domain in Cloudflare

1. Go to **[cloudflare.com](https://www.cloudflare.com)** and sign up or log in (free plan is enough).
2. Click **“Add a site”** (or **Websites** → **Add a site**).
3. Enter: **kingdomroyalpalacehotel.com** (no `www`).
4. Choose the **Free** plan → **Continue**.
5. Cloudflare will show a list of records it detected. You can keep or remove them; we’ll set the right ones in Step 3. Click **Continue**.
6. On the **Nameservers** screen, Cloudflare shows **two nameservers**, for example:
   - `ada.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`  
   **Copy these** (your values may differ). You’ll paste them in Namecheap in Step 2.

---

## Step 2: Point the domain to Cloudflare in Namecheap

1. Log in to **Namecheap**.
2. **Domain List** → **Manage** next to **kingdomroyalpalacehotel.com**.
3. Open **Nameservers** (or **Domain** tab → Nameservers).
4. Select **Custom DNS**.
5. Enter Cloudflare’s two nameservers, e.g.:
   - **Nameserver 1:** `ada.ns.cloudflare.com`
   - **Nameserver 2:** `bob.ns.cloudflare.com`  
   (Use the exact two Cloudflare gave you.)
6. Save (green checkmark or **Save**).

---

## Step 3: Add DNS records in Cloudflare

1. In **Cloudflare**, open the **kingdomroyalpalacehotel.com** site (Dashboard).
2. Go to **DNS** → **Records**.
3. Remove any records that conflict (e.g. existing CNAME for `www` or A for `@`).
4. Add these records:

   | Type  | Name | Content / Target                         | Proxy status |
   |-------|------|------------------------------------------|--------------|
   | CNAME | www  | `7b9c7f4de7124d9e.vercel-dns-017.com`    | DNS only (grey cloud) |
   | A     | @    | `76.76.21.21`                            | DNS only (grey cloud) |

   **Notes:**
   - **Name:** `www` for the CNAME, `@` for the A (root).
   - **Content for A:** Vercel often uses `76.76.21.21` for root. If your Vercel dashboard shows a different IP for `kingdomroyalpalacehotel.com`, use that instead.
   - Leave **Proxy status** as **DNS only** (grey cloud) so Cloudflare doesn’t proxy; Vercel will serve the site and handle SSL.

5. Save each record.

---

## Step 4: Wait for nameservers to update

- Nameserver change can take **15–30 minutes** (sometimes up to 24–48 hours).
- Check at **[whatsmydns.net](https://www.whatsmydns.net)**:
  - Query **NS** for **kingdomroyalpalacehotel.com** → you should see Cloudflare’s nameservers (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
  - Query **CNAME** for **www.kingdomroyalpalacehotel.com** → should show `7b9c7f4de7124d9e.vercel-dns-017.com`.

---

## Step 5: Test the site

- Open **https://www.kingdomroyalpalacehotel.com** (in a new incognito window or after flushing DNS).
- If it still fails, try from **mobile data** or another network to rule out local cache.

---

## Summary

| Step | Where        | Action |
|------|-------------|--------|
| 1    | Cloudflare  | Add site kingdomroyalpalacehotel.com, copy the 2 nameservers. |
| 2    | Namecheap   | Nameservers → Custom DNS → paste Cloudflare’s 2 nameservers → Save. |
| 3    | Cloudflare  | DNS → Add CNAME `www` → `7b9c7f4de7124d9e.vercel-dns-017.com`, A `@` → `76.76.21.21`, both DNS only. |
| 4    | Wait        | 15–30 min, check whatsmydns.net for NS and CNAME. |
| 5    | Browser     | Visit https://www.kingdomroyalpalacehotel.com. |

After this, **only** kingdomroyalpalacehotel.com uses Cloudflare DNS. **bookgh.com** stays on Namecheap; no change needed there.
