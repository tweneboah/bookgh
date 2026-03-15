# Switch Namecheap to custom nameservers (Vercel DNS)

Use **custom nameservers** in Namecheap so **Vercel** is the DNS provider. Then you manage DNS in Vercel instead of Namecheap Advanced DNS.

---

## 1. Get Vercel’s nameservers

1. Open your **Vercel** project (Bookgh).
2. Go to **Settings** → **Domains**.
3. Click the domain you want to use with Vercel DNS (e.g. **bookgh.com** or **kingdomroyalpalacehotel.com**).
4. Look for an option such as **“Use Vercel DNS”**, **“Transfer to Vercel”**, or **“Configure with Vercel nameservers”**.
5. Vercel will show **two (or more) nameserver hostnames**, for example:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`  
   *(Use the exact values Vercel shows in your dashboard.)*
6. Copy these nameservers; you’ll enter them in Namecheap in the next step.

---

## 2. Set custom nameservers in Namecheap

Do this for **each** domain (e.g. **bookgh.com** and **kingdomroyalpalacehotel.com**).

1. Log in to **Namecheap**.
2. **Domain List** → click **Manage** next to the domain.
3. Open the **Nameservers** section (or **Domain** tab → Nameservers).
4. Change from **Namecheap BasicDNS** (or current) to **Custom DNS**.
5. Enter the **two nameservers** from Vercel, e.g.:
   - **Nameserver 1:** `ns1.vercel-dns.com`
   - **Nameserver 2:** `ns2.vercel-dns.com`  
   *(Replace with the exact hostnames Vercel gave you.)*
6. Save (often a green checkmark or **Save** button).

---

## 3. In Vercel

- Ensure the domain is **added** to the project (Settings → Domains).
- If you switched to Vercel DNS, Vercel will manage A/CNAME for that domain; you don’t need to recreate the same records in Namecheap Advanced DNS (they’re ignored once the domain uses Vercel’s nameservers).

---

## 4. Wait for propagation

- Nameserver changes can take **15–30 minutes** up to **24–48 hours**.
- Check propagation at [whatsmydns.net](https://www.whatsmydns.net) (choose **NS** and your domain) to see when the new nameservers are visible globally.

---

## 5. Per domain

| Domain | Do once |
|--------|--------|
| **bookgh.com** | Get nameservers from Vercel for bookgh.com → Namecheap → Custom DNS → paste both → Save. |
| **kingdomroyalpalacehotel.com** | Get nameservers from Vercel for kingdomroyalpalacehotel.com → Namecheap → Custom DNS → paste both → Save. |

Use the **exact** nameserver hostnames shown in Vercel for each domain.

---

## 6. After switching

- **Namecheap Advanced DNS** (A, CNAME, etc.) is **no longer used** for that domain; Vercel’s DNS is.
- You can leave or remove the old A/CNAME in Namecheap; they have no effect once the domain points to Vercel’s nameservers.
- **TXT** (e.g. “Locked by Domain Redirect”) and email-related records were on Namecheap; if you use email for that domain, you may need to reconfigure MX/email at your email provider or in Vercel if they support it.

---

## Summary

1. In **Vercel** → Domains → select domain → get the **nameserver** hostnames (e.g. ns1.vercel-dns.com, ns2.vercel-dns.com).
2. In **Namecheap** → Manage domain → **Nameservers** → **Custom DNS** → enter those two nameservers → Save.
3. Wait for propagation; then the domain is served and resolved by Vercel.

Use the exact nameserver values from your Vercel dashboard for each domain.
