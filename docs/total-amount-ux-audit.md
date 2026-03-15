# Total Amount (Optional) UX – App-wide Audit

This document lists every place in the app where **quantity × unit price/cost** is used, and whether we added the **“Total amount (optional)”** convenience so users can enter the total they paid (or the line total) and have the system derive unit price/cost.

## Feature behavior

- **Total amount (optional):** User can enter the total for the line (e.g. “I paid 1000 for 25 units”). The system sets **unit price/cost = total ÷ quantity**.
- **Line total:** Always shown so users see quantity × unit price/cost.
- **Sync:** Changing quantity while “Total” is set recalculates unit price; changing unit price clears the optional total.

---

## Where the feature is implemented

| Location | Route / context | Notes |
|----------|-----------------|--------|
| **Restaurant purchase orders** | `/inventory-procurement/purchase-orders?department=restaurant` | Add/Edit PO: Quantity, Unit cost, **Total amount (optional)**, Line total. **Order details** modal on PO number click. |
| **Bar purchase orders** | `/bar/purchase-orders` | Same: Total amount (optional), Line total, **Order details** modal on PO number click. |
| **Invoices** | `/invoices` → Create Invoice | Per line: Qty, Unit price, **Total (optional)**, **Line total**. |
| **Event resources** | `/event-resources` | Add/Edit resource: Quantity, Unit price, **Total amount (optional)**, **Line total**. |
| **Bookings – Add room charge** | `/bookings` → View booking → Add Room Charge | Type, Description, Unit price, Qty, **Total (optional)**, **Line total**. |
| **Pool bookings – Add-ons** | `/pool/bookings` → Add/Edit booking | Per add-on: Name, Qty, Unit price, **Total (opt.)**, **Line total**. |

---

## Where we did not add it (and why)

| Location | Reason |
|----------|--------|
| **POS orders** (`/pos/orders`) | Unit price comes from menu item; staff rarely enter “total for line”. Could be added later if needed. |
| **Bar orders** (`/bar/orders`) | Same as POS – price from menu. |
| **Transfers** (`/inventory-procurement/transfers`) | Only quantity and item; no unit cost on the form. |
| **Restaurant recipes** | Ingredient cost comes from inventory; “total for this ingredient” is not a common input. |
| **Stock control (movements)** | Quantity-only movements; no pricing. |
| **Expenses** | Single amount per expense; no quantity × unit price. |
| **Event BEO** | Read-only/print view; line items are edited in the event booking flow (proposal/edit). |

---

## Optional future additions

- **POS / Bar order lines:** If staff often charge a round total per line (e.g. “50 GHS for 2 drinks”), a per-line “Total (optional)” could be added.
- **Event booking proposal/BEO edit:** If that flow has user-editable line items with quantity and unit price, the same pattern can be applied there.

---

*Last updated: audit and implementations completed for consistent UX across quantity×price forms.*
