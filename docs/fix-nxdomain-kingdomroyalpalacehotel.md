# Fix DNS_PROBE_FINISHED_NXDOMAIN for www.kingdomroyalpalacehotel.com

**NXDOMAIN** = the DNS server says "this domain name does not exist." So the problem is **DNS only** (nothing wrong with your app or Vercel project).

---

## Step 1: See what the world actually sees

1. Go to **[whatsmydns.net](https://www.whatsmydns.net)**.
2. Enter: **www.kingdomroyalpalacehotel.com**
3. Check **A** and **CNAME** (and optionally **NS**).

**What to look for:**

- **NS (nameservers):** Who is the DNS provider?
  - If you see **Namecheap** (e.g. `dns1.namecheap.com`, `dns2.namecheap.com`) → your Advanced DNS (A/CNAME) should apply. If CNAME is missing or wrong, fix it in Namecheap.
  - If you see **Vercel** (e.g. `ns1.vercel-dns.com`) → Vercel is the DNS. Then the domain must be fully set up in Vercel Domains and the zone active.
  - If you see something else or "not found" → nameservers may be wrong or not propagated.

- **CNAME for www:** Should point to something like `7b9c7f4de7124d9e.vercel-dns-017.com` or `cname.vercel-dns.com`. If there is **no CNAME** or it points to `parkingpage.namecheap.com`, that’s why you get NXDOMAIN or wrong result.

- **A for www:** Sometimes an A record is used instead of CNAME; it should point to Vercel’s IP if Vercel told you to use A.

---

## Step 2: If you’re on **Namecheap** DNS (BasicDNS)

1. **Namecheap** → **Domain List** → **kingdomroyalpalacehotel.com** → **Manage** → **Nameservers**.
   - Must be **Namecheap BasicDNS** (or PremiumDNS). If it’s "Namecheap Park" or "Domain Redirect" or another host, switch to **BasicDNS** and save.

2. **Advanced DNS** for **kingdomroyalpalacehotel.com**:
   - **CNAME:** Host = `www`, Value = **exactly** what Vercel shows for this domain (e.g. `7b9c7f4de7124d9e.vercel-dns-017.com.` with trailing dot).  
   - Remove any CNAME that points `www` to `parkingpage.namecheap.com`.
   - **A record:** Host = `@`, Value = `216.198.79.1` (so root domain works if you use it).
   - Save.

3. **Domain Redirect / Parking:** In the **Domain** tab, turn **off** any "Domain Redirect" or "Parking" for this domain so it doesn’t override DNS.

4. Wait **15–30 minutes** (up to 24–48 h), then check [whatsmydns.net](https://www.whatsmydns.net) again for **www.kingdomroyalpalacehotel.com** (CNAME).

---

## Step 3: If you switched to **Vercel** custom nameservers

1. **Vercel** → Project → **Settings** → **Domains**.
   - Ensure **www.kingdomroyalpalacehotel.com** (and **kingdomroyalpalacehotel.com** if you use it) are **added** and show as valid/configured.
   - If there’s a step like "Point your nameservers to Vercel", that must be done in Namecheap (Custom DNS = Vercel’s NS).

2. **Namecheap** → **Nameservers** for **kingdomroyalpalacehotel.com**:
   - **Custom DNS** with the **exact** nameservers Vercel gave (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`). No typos.
   - Save.

3. Propagation can take up to 24–48 hours. Check **NS** at [whatsmydns.net](https://www.whatsmydns.net) for **kingdomroyalpalacehotel.com** until you see Vercel’s nameservers globally.

---

## Step 4: Try **Cloudflare** (free) if Namecheap keeps failing

Sometimes using Cloudflare as DNS is more reliable:

1. Create a free account at **[cloudflare.com](https://www.cloudflare.com)**.
2. **Add a site** → enter **kingdomroyalpalacehotel.com**.
3. Cloudflare will show **two nameservers** (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
4. In **Namecheap** → **Nameservers** for **kingdomroyalpalacehotel.com** → **Custom DNS** → enter Cloudflare’s two nameservers → Save.
5. In **Cloudflare** → **DNS** for the zone:
   - Add **CNAME**: Name = `www`, Target = `7b9c7f4de7124d9e.vercel-dns-017.com` (or the exact target Vercel shows), Proxy status = **DNS only** (grey cloud) at first.
   - Add **A**: Name = `@`, Content = `216.198.79.1` (or Vercel’s A record), Proxy = DNS only.
6. Wait for NS propagation; then test **www.kingdomroyalpalacehotel.com** again.

(After it works, you can turn Cloudflare proxy on for the orange cloud if you want.)

---

## Step 5: Confirm the domain name

Make sure there are no typos:

- Correct: **kingdomroyalpalacehotel.com** (no hyphens, one word).
- **www.kingdomroyalpalacehotel.com** = same, with `www`.

---

## Checklist

- [ ] [whatsmydns.net](https://www.whatsmydns.net) for **www.kingdomroyalpalacehotel.com** (CNAME) and **kingdomroyalpalacehotel.com** (NS).
- [ ] Namecheap: Nameservers = **BasicDNS** (or Vercel/Cloudflare if you chose that).
- [ ] Namecheap Advanced DNS: CNAME **www** → Vercel target (no parking page).
- [ ] No Domain Redirect/Parking overriding the domain.
- [ ] Wait for propagation; retry in incognito or another network.

If CNAME and nameservers are correct globally on whatsmydns.net but the browser still shows NXDOMAIN, try another device/network and flush DNS (`ipconfig /flushdns` on Windows, or restart router).
