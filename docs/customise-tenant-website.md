# How to customise your tenant website

Two roles can customise the **public hotel site** (the page guests see at `yourplatform.com/hotels/[slug]` or on a custom domain): **platform owner** and **tenant admin**.

---

## Platform owner (superAdmin)

**Who:** Logged-in user with role **superAdmin** (platform owner).

**Where:** **Settings** → in the sidebar go to **Platform** → **Tenants** → open **`/platform/tenants`**.

**What you can change:**

1. In the tenants table, click **Edit** (pencil) on a hotel (tenant).
2. In the **Edit Tenant** modal you can set:
   - **Name** — Hotel/hotel group name (shown in navbar and on the public page).
   - **Slug** — URL slug for the tenant (used in discovery; branch slug is used for `/hotels/[slug]`).
   - **Logo** — Logo URL (shown in navbar on the public page).
   - **Description** — Short text about the hotel (shown in the “About” section).
   - **Contact email / phone** — Shown on the public page.
   - **Star rating** — e.g. 4-star hotel.
   - **Website** — Optional link “Visit website” on the public page.
   - **Custom domain** — Optional. Set after deployment when connecting the tenant’s DNS (e.g. `www.royalpalace.com`).
   - **Primary color** — Brand colour for nav accent and links (e.g. `#5a189a`).
   - **Accent color** — Colour for buttons and highlights (e.g. `#ff6d00`).
   - **Public site layout** (see below) — Hero headline/image, navbar style, footer, and which sections to show.

3. Click **Update** to save.

**Summary:** Platform owner customises any tenant’s website via **Platform** → **Tenants** → **Edit** (that tenant).

---

## Tenant admin (hotel owner / tenantAdmin)

**Who:** Logged-in user with role **tenantAdmin** (and their auth has a tenant).

**Where:** **Settings** → **`/settings`** → scroll to the **“Public site branding”** card.

**What you can change:**

- **Hotel name** — Name shown in the navbar and on the public page.
- **Logo** — Logo image URL (navbar and branding).
- **Description** — “About” text on the public page.
- **Primary color** — Main brand colour (e.g. `#5a189a`).
- **Accent color** — Buttons and highlights (e.g. `#ff6d00`).
- **Website** — Optional “Visit website” link.

**You cannot change (platform only):**

- **Slug** — Set by platform (or in Platform → Tenants).
- **Custom domain** — Only the platform owner can add or change it (after deployment).

**Summary:** Tenant admin customises their own hotel’s public look and copy in **Settings** → **Public site branding**.

---

## If theme colors don’t update on the public page

After changing **Primary color** or **Accent color** in Platform → Tenants (or in Settings → Public site branding), the public hotel page (`/hotels/[slug]` or your custom domain) refetches when you open it. If you still see old colors, do a **hard refresh** (e.g. Ctrl+Shift+R or Cmd+Shift+R) or open the page in a new tab. Ensure you edited the **same** tenant that owns the branch for that slug (e.g. the branch slug “royal-palace” belongs to the tenant you edited).

---

## Website builder (tenant admin)

**Who:** Logged-in user with role **tenantAdmin**.

**Where:** **Settings** → **Website builder** → **`/settings/website-builder`**.

The **website builder** lets you fully customize your public hotel page by adding, reordering, and editing **sections** (blocks):

- **Hero** — Headline, subheadline, and main image (or use branch gallery).
- **Text** — Custom heading and paragraph (e.g. welcome message).
- **Image** — Single image with optional caption.
- **Image gallery** — Multiple images or branch photos.
- **About** — Uses your tenant description.
- **Amenities** — List of amenities from your branch.
- **Rooms** — Room categories with prices and “Book this room.”
- **Event halls** — Event spaces.
- **Contact & hours** — Contact info and check-in/out times.
- **Call to action** — Heading and button (e.g. “Book now”).
- **Footer** — Footer text and optional social links.
- **Nearby hotels** — Other properties nearby.

**How it works:**

1. Add sections in the order you want (e.g. Hero → Text → Rooms → CTA → Footer).
2. Use **up/down** to reorder; **Edit** to change content (headline, button text, etc.); **Remove** to delete a section.
3. Click **Save changes** to publish. Your public page at `yourplatform.com/hotels/[slug]` will then render **only** these sections in that order.
4. If you remove all sections and save, the page falls back to the **default layout** (same as before the builder).

**Preview:** Use **Preview site** to open your public hotel page in a new tab.

---

## Platform owner: customize a client’s website

**Who:** Logged-in user with role **superAdmin** (platform owner).

**Where:** **Platform** → **Tenants** → in the table, click the **layout/sections icon** (Customize site) for the tenant you want to edit.

This opens the **Website builder** for that tenant at **`/platform/tenants/[id]/website-builder`**. You get the same section list as tenant admins: add, reorder, edit, and remove sections (hero, text, rooms, CTA, footer, etc.) and **Save changes**. The tenant’s public page at `yourplatform.com/hotels/[slug]` will show the layout you set.

**Summary:** Platform owners can customize any tenant’s public site via **Platform** → **Tenants** → **Customize site** (layout icon) on that tenant’s row.

---

## Layout, hero, navbar and footer (platform owner)

In **Platform** → **Tenants** → **Edit** (a tenant), scroll to **Public site layout**. You can change:

- **Hero**
  - **Hero headline** — Overrides the default title (hotel name) at the top of the public page. Leave empty to use the hotel name.
  - **Hero subheadline** — Optional tagline under the headline.
  - **Hero image URL** — Optional single image for the hero. If set, it replaces the branch image gallery at the top.

- **Navbar**
  - **Navbar style** — **Default** (white bar with accent strip), **Transparent** (over hero, for full-width hero feel), or **Minimal** (lighter bar).
  - **Logo position** — **Left** or **Center**.

- **Footer**
  - **Show footer** — Turn on to show a footer on the public page.
  - **Footer text** — e.g. copyright or short blurb.
  - **Show social links** — When the footer is shown, display links to the tenant’s Facebook, Instagram, Twitter (set in the same Edit modal or in tenant profile).

- **Sections**
  - Checkboxes to show or hide: **About**, **Amenities**, **Rooms**, **Event halls**, **Contact**, **Nearby hotels**. Uncheck to hide a section on the public page.

**Who can change this:** **Platform owner** (superAdmin) in **Platform** → **Tenants** → **Edit**. Tenant admins can only change branding (name, logo, colors, description) under **Settings** → **Public site branding**; they use the **Website builder** (see below) for sections.

---

## Where changes appear

- **Name, logo, primary/accent colors** → Public page navbar and theme (buttons, accents, links).
- **Description** → “About” section on the public page (if section is enabled).
- **Website** → “Visit website” link (if set).
- **Custom domain** → Only affects how guests reach the site (e.g. `www.royalpalace.com`); content is the same as `yourplatform.com/hotels/[slug]`.
- **Public site layout** → Hero headline/subheadline/image, navbar look and logo position, footer (text + social links), and which sections (About, Amenities, Rooms, Event halls, Contact, Nearby) are visible.

---

## Quick links

| Role            | Where to customise                    | Link                    |
|-----------------|---------------------------------------|-------------------------|
| Platform owner  | Edit any tenant (full)                | `/platform/tenants` → Edit |
| Tenant admin    | Edit own hotel branding only          | `/settings` → Public site branding |
