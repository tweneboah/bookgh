# Namecheap + Vercel setup for bookgh.com

Use these steps so **bookgh.com** and **www.bookgh.com** point to your Bookgh app on Vercel.

---

## 1. Fix DNS in Namecheap

In **Namecheap** → **Domain List** → **bookgh.com** → **Manage** → **Advanced DNS**.

### 1.1 Fix `www` (required)

- Find the **CNAME** row where **Host** = `www`.
- **Edit** it:
  - **Host:** `www` (unchanged)
  - **Value:** `7b9c7f4de7124d9e.vercel-dns-017.com.`  
    (Replace `parkingpage.namecheap.com.` with this Vercel value. Keep the trailing dot.)
  - **TTL:** Automatic (or 30 min)
- Save.

### 1.2 Fix root `@` (so bookgh.com works)

- **Remove** the **URL Redirect Record** for **Host** `@` (the one pointing to `http://www.bookgh.com/`).  
  You’ll add it back later if you want redirect; first we need the A record for Vercel.
- **Add** an **A Record**:
  - **Type:** A Record  
  - **Host:** `@`  
  - **Value:** `216.198.79.1`  
  - **TTL:** Automatic (or 30 min)
- Save.

### 1.3 (Optional) Redirect root to www

If you want **bookgh.com** to redirect to **www.bookgh.com**:

- Add a **URL Redirect Record**:
  - **Host:** `@`
  - **Value:** `https://www.bookgh.com`  
  - **Redirect type:** Permanent (301), Unmasked or Masked (Unmasked is fine).

Note: With redirect, visitors to `bookgh.com` go to `www.bookgh.com`. Your app and env should use one canonical host (see below).

---

## 2. Vercel

- In **Vercel** → your project → **Settings** → **Domains**:
  - Add **www.bookgh.com** (CNAME will verify after DNS propagates).
  - Add **bookgh.com** (A record will verify after DNS propagates).
- Wait until both show as verified (no “Invalid Configuration”).  
  DNS can take a few minutes up to 24–48 hours.

---

## 3. Environment variable (Bookgh app)

Set the **canonical** platform URL so middleware and links use the right host.

**Option A – Use www (recommended)**  
In Vercel → Project → **Settings** → **Environment Variables** (and in `.env.local` for local):

```env
NEXT_PUBLIC_APP_URL=https://www.bookgh.com
```

**Option B – Use root only**  
If you don’t redirect and want root as main URL:

```env
NEXT_PUBLIC_APP_URL=https://bookgh.com
```

Use the same value in **Production** (and optionally Preview) and redeploy.

---

## 4. Checklist

- [ ] Namecheap: CNAME **www** → `7b9c7f4de7124d9e.vercel-dns-017.com.`
- [ ] Namecheap: A record **@** → `216.198.79.1` (URL Redirect for @ removed first)
- [ ] (Optional) Namecheap: URL Redirect **@** → `https://www.bookgh.com`
- [ ] Vercel: Domains **www.bookgh.com** and **bookgh.com** added and verified
- [ ] Vercel (and `.env.local`): `NEXT_PUBLIC_APP_URL` = `https://www.bookgh.com` (or `https://bookgh.com`)
- [ ] Redeploy if you changed env vars

---

## 5. After DNS propagates

- **https://www.bookgh.com** → Bookgh platform.
- **https://bookgh.com** → Same (or redirects to www if you set the redirect).

Tenant custom domains (e.g. **www.royalpalace.com**) are configured separately in **Platform → Tenants → Edit → Custom domain** and in Vercel Domains; see [custom-domain-namecheap.md](./custom-domain-namecheap.md).
