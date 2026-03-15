# Restaurant Management – Step-by-Step Guide

This guide walks you through the **Bookgh** restaurant module in order. Complete each step and give the green light before moving to the next.

---

## Table of contents (all steps)

| Step | Topic |
|------|--------|
| 1 | [Restaurant → Suppliers](#step-1-restaurant--suppliers) |
| 2 | [Restaurant → Purchase Orders](#step-2-restaurant--purchase-orders) |
| 3 | [Restaurant → Transfers](#step-3-restaurant--transfers) |
| 4 | [Restaurant → Stock Control](#step-4-restaurant--stock-control) |
| 5 | [Restaurant → Inventory](#step-5-restaurant--inventory) |
| 6 | [Restaurant → Recipe Engine](#step-6-restaurant--recipe-engine) |
| 7 | Production Batches |
| 8 | [Restaurant → Menu Items](#step-8-restaurant--menu-items) |
| 9 | Tables |
| 10 | Orders |
| 11 | KDS Workflow |
| 12 | Barcode Scan |
| 13 | Restaurant Reports |
| 14 | Consolidated Reports |
| 15 | Payments |
| 16 | Expenses |
| 17 | Accounting |

---

## Step 1: Restaurant → Suppliers

### Where to find it

1. Log in to Bookgh and open the **dashboard** (main app after login).
2. In the **left sidebar**, find the section titled **"Restaurant"** (purple/orange theme).
3. If the section is collapsed, click the **"Restaurant"** header to expand it.
4. Click **"Suppliers"** (first item under Restaurant).

**Direct URL (for Restaurant department):**  
`/inventory-procurement/suppliers?department=restaurant`

---

### What is a Supplier (in one sentence)?

A **supplier** is any company or person who sells you ingredients or goods for your restaurant (e.g. vegetables, meat, dairy, dry goods). You create one record per supplier so you can later attach them to **Purchase Orders** when you buy stock.

---

### Why do this first?

- **Purchase Orders** (Step 2) require you to choose a **supplier**. No suppliers → you can’t create proper POs.
- **When:** Set up suppliers as soon as you know who you’ll buy from (before you start recording orders).
- **Importance:** Keeps procurement organized, improves reporting, and makes reordering and payments easier later.

---

### What to create (sample data)

Create **one sample supplier** so you see how the form works. Example:

| Field (see below) | Sample value |
|-------------------|--------------|
| Name | FreshFarm Produce Ltd |
| Contact person | Ama Boateng |
| Email | procurement@freshfarm.test |
| Phone | +233 24 000 0101 |
| Status | Active |
| Notes | Main veg & fruit supplier; delivery Tue/Thu. |
| Images | Optional – you can skip or add 1 photo later. |

---

### Field-by-field explanation

| Field | Required? | Meaning in simple terms |
|-------|-----------|--------------------------|
| **Name** | Yes | Company or business name (e.g. “FreshFarm Produce Ltd”). This is how you’ll recognize the supplier in lists and on purchase orders. |
| **Contact person** | No | Name of the person you usually talk to (e.g. “Ama Boateng”). Helps when calling or emailing. |
| **Email** | No | Supplier’s email address. Used for sending orders or invoices. |
| **Phone** | No | Supplier’s phone number. Use for quick orders or delivery coordination. |
| **Status** | No (default: Active) | **Active** = you currently buy from them. **Inactive** = temporarily not ordering. **Blacklisted** = you no longer want to use them. Filter the list by status later. |
| **Notes** | No | Any extra info: delivery days, payment terms, minimum order, special instructions. |
| **Supplier images** | No | Optional photos (e.g. logo or product). Up to 10 files; each can have a caption. |

---

### Step-by-step: where to click

1. **Go to Restaurant → Suppliers**  
   Sidebar → **Restaurant** → **Suppliers**.

2. **Open the “Add supplier” form**  
   Top right: click the orange **“Add supplier”** button.

3. **Fill the form**  
   - **Name:** `FreshFarm Produce Ltd` (required).  
   - **Contact person:** `Ama Boateng`.  
   - **Email:** `procurement@freshfarm.test`.  
   - **Phone:** `+233 24 000 0101`.  
   - **Status:** leave **Active** (or choose from dropdown).  
   - **Notes:** `Main veg & fruit supplier; delivery Tue/Thu.`  
   - **Supplier images:** skip or add one image.

4. **Save**  
   Click **“Create”** (orange button at bottom of modal). You should see a success message and the new supplier on the page.

5. **Check the list**  
   The new supplier appears as a card with name, contact, email, phone, and status. You can use **Edit** (pencil) or **Delete** (trash) on each card.

6. **Filter (optional)**  
   Use the **“Filter by status”** dropdown to show only Active, Inactive, or All.

---

## Step 2: Restaurant → Purchase Orders

### Where to find it

1. In the **left sidebar**, under **Restaurant**, click **“Purchase Orders”** (second item).
2. Make sure you’re on the **Restaurant** Purchase Orders page (URL should include `?department=restaurant`).

**Direct URL:**  
`/inventory-procurement/purchase-orders?department=restaurant`

---

### What is a Purchase Order (PO)?

A **purchase order** is a formal order you send to a supplier for ingredients or goods. It lists **what** you’re buying, **how much**, and **at what price**. When the delivery arrives, you “receive” the PO (done in **Stock Control** later), which updates your restaurant inventory.

---

### Why do this step?

- **Suppliers** (Step 1) give you who to buy from; **Purchase Orders** record each buying transaction.
- **When:** Create a PO when you decide to order from a supplier (before or when you place the order).
- **Importance:** Tracks what you ordered, costs, and expected delivery. Receiving POs later is what increases your stock in **Stock Control** and **Inventory**.

---

### Prerequisites

- At least **one Restaurant supplier** (from Step 1).  
- Optional: **Restaurant inventory items** (Step 5). You can still create a PO using **“This item is new”** and typing the item name and unit; you don’t have to have inventory items set up first.

---

### What to create (sample data)

Create **one sample purchase order** with **one line**:

| Field | Sample value |
|-------|--------------|
| **PO Number** | Leave as auto-filled (e.g. `PO-123456`) or type e.g. `PO-001` |
| **Supplier** | Select **FreshFarm Produce Ltd** (from Step 1) |
| **Order date** | Today’s date |
| **Expected date** | A few days from today (optional) |
| **Inventory item** | Leave empty and tick **“This item is new”** |
| **Item name** (when new) | `Tomatoes` |
| **Unit** (when new) | `kg` |
| **Quantity** | `20` |
| **Unit cost** | `5.00` |
| **Status** | **Draft** (or leave default) |

**Line total:** 20 × 5 = **100 GHS** (shown automatically when you save).

---

### Field-by-field explanation

| Field | Required? | Meaning in simple terms |
|-------|-----------|--------------------------|
| **PO Number** | Yes | Unique reference for this order (e.g. PO-001). You can use the auto-generated one or your own. |
| **Supplier** | Yes | Who you’re buying from. Must be a supplier you created under Restaurant → Suppliers. |
| **Order date** | Yes | Date you placed (or are placing) the order. |
| **Expected date** | No | When you expect the delivery. Helps with planning and follow-up. |
| **Receive to department** | — | For Restaurant, this is fixed to Restaurant (field is hidden). |
| **Inventory item** | Depends | If the product already exists in Restaurant Inventory, select it here. Otherwise tick **“This item is new”**. |
| **This item is new (not yet in inventory)** | — | Tick this to type **Item name** and **Unit** instead of selecting from inventory. Use this when the product isn’t in your list yet. |
| **Item name** | Yes (if new) | Name of the product (e.g. Tomatoes, Vegetable Oil). |
| **Unit** | Yes (if new) | How you measure it: e.g. `kg`, `litre`, `pcs`, `unit`. |
| **Quantity** | Yes | How many units you’re ordering (e.g. 20 kg). Must be &gt; 0. |
| **Unit cost** | Yes | Price per one unit from the supplier (e.g. 5.00 GHS per kg). Used to calculate line total (quantity × unit cost). |
| **Status** | No | **Draft** = not sent. **Pending approval** / **Approved** / **Ordered** = workflow. **Partially received** / **Received** = delivery progress. **Cancelled** = order cancelled. Start with Draft. |

---

### Step-by-step: where to click

1. **Go to Restaurant → Purchase Orders**  
   Sidebar → **Restaurant** → **Purchase Orders**.

2. **Open the create form**  
   Top right: click the orange **“Add purchase order”** button.

3. **Header:**  
   - **PO Number:** leave as is (e.g. `PO-123456`) or enter `PO-001`.  
   - **Supplier:** open dropdown → select **FreshFarm Produce Ltd**.  
   - **Order date:** pick today.  
   - **Expected date:** pick a date a few days ahead (optional).

4. **Line item (one item for this sample):**  
   - Leave **Inventory item** as “Select item…”.  
   - Tick **“This item is new (not yet in inventory)”**.  
   - **Item name:** `Tomatoes`.  
   - **Unit:** `kg`.  
   - **Quantity:** `20`.  
   - **Unit cost:** `5.00`.  
   - **Status:** leave **Draft**.

5. **Save**  
   Click **“Create”** (orange button). You should see a success message and the new PO on the list (PO number, supplier, date, total 100 GHS).

6. **Check the list**  
   Each PO appears as a card with PO number, status, supplier, order date, and total amount. Use **Edit** (pencil) or **Delete** (trash) if needed.

7. **Filter (optional)**  
   Use **“Filter by status”** to show only Draft, Received, etc.

---

### Note

This form adds **one line per PO** when you create. To add more lines to an existing PO, edit that PO and add another line (if the app supports multiple lines on edit), or create a second PO. For this guide, one PO with one line is enough to understand the flow. Later, you’ll **receive** this PO in **Stock Control** to increase stock.

---

## Step 3: Restaurant → Transfers

### Where to find it

1. In the **left sidebar**, under **Restaurant**, click **“Transfers”** (third item).
2. Ensure the URL includes `?department=restaurant`.

**Direct URL:**  
`/inventory-procurement/transfers?department=restaurant`

---

### What is a Transfer?

A **transfer** is moving stock **from one branch to another** (e.g. from Main Kitchen to Beach Branch). It’s not buying from a supplier—it’s moving inventory you already have between your own locations. Each transfer has a “from” branch, a “to” branch, and one or more items with quantities.

---

### Why do this step?

- When you have **multiple branches**, you need a way to record and track stock moved between them.
- **When:** Create a transfer when you decide to send stock from one branch to another (e.g. to balance stock or support another location).
- **Importance:** Keeps branch-level stock accurate and gives an audit trail of what was sent where and when.

---

### Prerequisites

- **At least two branches** (Sidebar → **Hotel** → **Branches**). The form requires **From branch** and **To branch** to be different.
- **At least one Restaurant inventory item** (Restaurant → **Inventory**, i.e. POS Inventory with `department=restaurant`). The transfer line needs an item from the dropdown.  
  If you haven’t set up Inventory yet (Step 5), you can **read this section** to understand transfers and **create one later** after adding branches and inventory items.

**If you only have one branch:** You can’t create a real transfer yet (from and to must differ). Read the section, then continue to Step 4 (Stock Control) and come back to Transfers when you have multiple branches.

---

### What to create (sample data)

Once you have **2 branches** and **at least one Restaurant inventory item**:

| Field | Sample value |
|-------|--------------|
| **Transfer number** | Leave auto-filled (e.g. `TRF-123456`) or type `TRF-001` |
| **From branch** | e.g. **Main Branch** |
| **To branch** | e.g. **Beach Branch** (must be different from From) |
| **Transfer date** | Today |
| **Expected arrival** | Tomorrow or in 2 days (optional) |
| **Inventory item** | Select one item (e.g. Tomatoes) from Restaurant inventory |
| **Quantity** | e.g. `10` (in that item’s unit) |
| **Status** | **Pending** (default) |

---

### Field-by-field explanation

| Field | Required? | Meaning in simple terms |
|-------|-----------|--------------------------|
| **Transfer number** | Yes | Unique reference for this transfer (e.g. TRF-001). Auto-generated or your own. |
| **From branch** | Yes | Branch that is **sending** the stock. |
| **To branch** | Yes | Branch that is **receiving** the stock. Must be different from From. |
| **Transfer date** | Yes | Date the transfer is initiated / sent. |
| **Expected arrival** | No | When the receiving branch should get the stock. |
| **Inventory item** | Yes | The product being transferred. Must be a **Restaurant** inventory item (same department). |
| **Quantity** | Yes | How many units (in the item’s unit) are being transferred. Must be &gt; 0. |
| **Status** | No | **Pending** = requested. **Approved** = approved. **In transit** = on the way. **Completed** = received. **Rejected** = cancelled. |

---

### Step-by-step: where to click

1. **Go to Restaurant → Transfers**  
   Sidebar → **Restaurant** → **Transfers**.

2. **Open the create form**  
   Top right: click the orange **“Add transfer”** button.

3. **Header:**  
   - **Transfer number:** leave as is or enter e.g. `TRF-001`.  
   - **From branch:** select the sending branch.  
   - **To branch:** select the receiving branch (must differ from From).  
   - **Transfer date:** pick today.  
   - **Expected arrival:** optional.

4. **Line (one item):**  
   - **Inventory item:** select one Restaurant inventory item.  
   - **Quantity:** e.g. `10`.  
   - **Status:** leave **Pending**.

5. **Save**  
   Click **“Create”**. The new transfer appears in the list (transfer number, From → To, item × quantity, date, status).

6. **Filter (optional)**  
   Use **“Filter by status”** to show only Pending, Completed, etc.

---

## Step 4: Restaurant → Stock Control

### Where to find it

1. In the **left sidebar**, under **Restaurant**, click **“Stock Control”** (fourth item).
2. No URL parameter needed; this page is restaurant-specific.

**Direct URL:**  
`/restaurant/stock-control`

---

### What is Stock Control?

**Stock Control** is where you:

1. **Receive Purchase Orders** – When a supplier delivers goods, you “receive” the PO here. That adds the received quantity to your restaurant inventory (and can create inventory items if they didn’t exist).
2. **Record stock movements** – Log restock (add), wastage/loss (reduce), adjustments (correct errors), or reversals (undo a previous entry) for ingredients.
3. **Physical stock count** – Record what you actually counted in the storeroom. The system compares it to “book” stock and can show variances; you use this to reconcile and fix discrepancies.
4. **View and export the movement ledger** – See all movements (receipts, wastage, counts, etc.) and export to CSV.

---

### Why do this step?

- **Receive PO:** Until you receive a PO here, the ordered stock does **not** increase your inventory. Receiving is what updates stock levels.
- **Movements:** Wastage, breakage, and corrections need to be logged so your on-hand stock stays accurate.
- **Stock count:** Periodic counts keep “system” stock in line with reality and help spot theft, loss, or data errors.
- **When:** Receive POs when delivery arrives; log wastage as it happens; run stock counts on a schedule (e.g. weekly or monthly).

---

### Prerequisites

- At least one **Restaurant Purchase Order** in status **Approved**, **Ordered**, or **Partially received** (so it appears in “Receive Purchase Orders”). If your sample PO is still **Draft**, edit it in Restaurant → Purchase Orders and set status to **Approved** or **Ordered**.
- For **Record Stock Movement** and **Physical Stock Count**: at least one **Restaurant inventory item**. You get that either by (a) adding items in Restaurant → **Inventory** (Step 5), or (b) receiving a PO that creates/updates inventory (e.g. when the PO line is linked to an item or the system auto-creates).

---

### What to do (in order)

**A. Receive your sample PO**

1. Go to **Restaurant** → **Stock Control**.
2. Scroll to the section **“Receive Purchase Orders To Restaurant”**.
3. Find your PO (e.g. PO-001 or the auto-generated number). If the table says “No purchase orders to receive”, edit that PO in Restaurant → Purchase Orders and set **Status** to **Approved** or **Ordered**, then return here.
4. Click **“Receive Full”** for that PO (or click the PO number to open the partial-receive panel, enter quantities and optional **Delivery note number** / **Receipt note**, then **“Receive Partial To Restaurant”**).
5. After receiving, the PO’s stock is added to restaurant inventory. You can use **“Print GRN”** to print a Goods Received Note.

**B. Record one stock movement (optional)**

1. In **“Record Stock Movement”** (top of page), select an **Ingredient** (must exist in Restaurant inventory).
2. **Movement type:** e.g. **Wastage / Loss** (to reduce stock) or **Restock** (to add).
3. **Quantity** and **Unit** (e.g. `2`, `kg`).
4. **Reason:** e.g. `Kitchen wastage` or `Received from PO`.
5. Click **“Save Movement”**.

**C. Run a physical stock count (optional)**

1. In **“Physical Stock Count”**, set **Count date** and optional **Count notes**.
2. **Add at least one line:** choose **Ingredient**, enter **Physical stock** (quantity you counted), optional **Line note**.
3. Click **“Save Stock Count”**. The system compares physical vs book stock and shows variances; you can **Export Count CSV** for records.

**D. View and export the ledger**

- Use the **Stock movement ledger** table and filters (date range, **Movement type**, **Ingredient**) to see all movements.
- Use **Export ledger CSV** to download the data.

---

### Field-by-field (short reference)

| Area | Field | Meaning |
|------|--------|--------|
| **Movement** | Ingredient | Restaurant inventory item this movement applies to. |
| | Movement type | **Restock** = add stock. **Wastage/Loss** = reduce (spill, expiry). **Adjustment** = correct errors. **Reversal** = undo a previous entry. |
| | Quantity / Unit | Amount and unit (e.g. kg, litre). Must match the ingredient’s unit. |
| | Reason | Short reason (e.g. kitchen wastage, received from PO). |
| **Stock count** | Count date | When the physical count was done. |
| | Count notes | Optional notes for the whole count. |
| | Ingredient / Physical stock / Line note | Per line: which item, what you counted, optional note. |
| **Receive PO** | Receive Full | Receive 100% of all remaining quantities for that PO. |
| | Receive Partial | Select PO, then per line: **Receive qty**, optional **Map to inventory**. Optional **Delivery note number** and **Receipt note**. |
| | Map to inventory | Which restaurant inventory item to add stock to; “Auto-create at receive if missing” lets the system create it from the PO line. |

---

## Step 5: Restaurant → Inventory

### Where to find it

1. In the **left sidebar**, under **Restaurant**, click **“Inventory”** (fifth item).
2. The URL should include `?department=restaurant` so you see **Restaurant Inventory** (not general POS or other department).

**Direct URL:**  
`/pos/inventory?department=restaurant`

---

### What is Restaurant Inventory?

**Inventory** is your list of **ingredients and products** the restaurant uses. Each item has a **name**, **unit** (e.g. kg, litre, pcs), **current stock**, **cost**, **min/reorder levels**, and optional **category** and **supplier**. This list is used in:

- **Stock Control** – movements and counts are per inventory item.
- **Transfers** – you select which inventory item is being transferred.
- **Recipe Engine** – recipes use these items as ingredients.
- **Purchase Orders** – you can link PO lines to inventory items (or add new items when receiving).

---

### Why do this step?

- **Stock Control, Transfers, Recipes** all depend on having inventory items defined.
- **When:** Add items as soon as you know what you stock (you can also create items when receiving a PO or via Stock Control).
- **Importance:** One master list of products with units and costs keeps costing, reordering, and reporting consistent.

---

### Prerequisites

- None. You can create inventory items from scratch here. If you added **Restaurant suppliers** (Step 1), the **Add Inventory Item** form will show a **Supplier** dropdown with those suppliers so you can pick one. Optionally you may already have some items from **receiving a PO** in Stock Control.

---

### What to create (sample data)

Use **different items** from any you already have (e.g. if Tomatoes came from a purchase order, add these as new items). Example:

**First item – Rice**

| Section | Field | Sample value |
|--------|--------|----------------|
| Basic info | Name | Rice |
| Basic info | Category | Staples |
| Unit & conversions | Unit | kg |
| Unit & conversions | Unit Conversions | g=0.001 |
| Cost & stock levels | Unit Cost (GHS) | 8.50 |
| Cost & stock levels | Current Stock | 0 |
| Cost & stock levels | Minimum Stock | 10 |
| Cost & stock levels | Reorder Level | 20 |
| Supplier | Supplier | Select **FreshFarm Produce Ltd** (or your supplier) from the dropdown |
| Item images | (optional) | — |

**Second item (optional)** – **Vegetable Oil**, **Category:** Staples, **Unit:** litre, **Unit Conversions:** (leave empty or e.g. ml=0.001), **Unit Cost:** 25.00, **Current / Min / Reorder:** 0, 2, 5, **Supplier:** select from dropdown.

---

### Add Inventory Item form – what each part is for

The modal title is **“Add Inventory Item”** and the banner says: **“Restaurant stock — name, unit, cost and stock levels”**. The form is split into sections as below.

---

#### Banner: “Restaurant stock — name, unit, cost and stock levels”

This reminds you that each inventory item is defined by: a **name**, a **unit** of measure, **cost** (and optionally **stock levels**). Everything you enter flows into stock tracking, recipes, and reports.

---

#### Basic info

| Field | Required? | Explanation |
|-------|-----------|-------------|
| **Name** | Yes | Display name for the product (e.g. Rice, Vegetable Oil). This is what you see in lists, Stock Control, Transfers, and Recipe Engine. Use a clear, consistent name. |
| **Category** | Yes | **Dropdown** with a comprehensive list so you don’t type manually. Pick one that fits the product. The list includes: Bakery & Pastry, Beverages (Alcoholic), Beverages (Non-Alcoholic), Canned & Preserved, Cleaning & Sanitation, Condiments & Sauces, Dairy & Eggs, Dry Goods & Pulses, Frozen, Fruits, Grains & Rice, Meat & Poultry, Oils & Fats, Paper & Disposables, Seafood, Spices & Seasonings, Staples, Vegetables, and **Other**. If you choose **Other**, a field appears to specify the category name. Any category already used on existing items also appears in the list when editing. |

---

#### Unit & conversions

| Field | Required? | Explanation |
|-------|-----------|-------------|
| **Unit** | Yes | The **base unit** you use to track stock: e.g. kg, litre, pcs, unit, bunch. All stock quantities and min/reorder levels are in this unit. |
| **Unit Conversions** | No | Optional: other units that convert to the base unit. **Format:** `unit=factor` (one per entry, comma-separated). The factor is “how many base units equal one of this unit”. Examples: if base unit is **kg**, use `g=0.001` (1 g = 0.001 kg); if base is **litre**, use `ml=0.001`. The hint under the field says: *“Format: unit=factor to base unit. If base unit is kg, use g=0.001.”* |

---

#### Cost & stock levels

| Field | Required? | Explanation |
|-------|-----------|-------------|
| **Unit Cost (GHS)** | No | Cost you pay per **one unit** of this product in Ghana Cedis. Used for costing and reports. Enter 0 or leave blank if you don’t know yet. |
| **Current Stock** | No | How much you have **right now**, in the base unit. Set to 0 if you haven’t received stock yet. This updates when you receive POs or log movements in Stock Control. |
| **Minimum Stock** | No | Don’t let stock go below this. Used for **low-stock alerts** (the list page shows how many items are low stock). Same unit as Current Stock. |
| **Reorder Level** | No | When stock reaches this level, you should consider reordering. Same unit as Current Stock. |

---

#### Supplier

| Field | Required? | Explanation |
|-------|-----------|-------------|
| **Supplier** | No | The supplier you typically buy this item from. **On Restaurant Inventory**, this is a **dropdown**: it shows all suppliers you created under **Restaurant → Suppliers**. Pick one (e.g. FreshFarm Produce Ltd) or leave “Select supplier (optional)”. If you have no suppliers yet, the field may show a text placeholder; add suppliers in **Restaurant → Suppliers** first, then they will appear here. The chosen value is stored for reference and shown in the inventory table. |

---

#### Item images

Optional product images (e.g. photo or label). You can add up to 10 files with optional captions.

---

### Step-by-step: where to click

1. **Go to Restaurant → Inventory**  
   Sidebar → **Restaurant** → **Inventory** (URL: `http://localhost:3000/pos/inventory?department=restaurant` or equivalent with `?department=restaurant`).

2. **Open the form**  
   Top right: click the orange **“Add Item”** button. The **“Add Inventory Item”** modal opens with the banner **“Restaurant stock — name, unit, cost and stock levels”**.

3. **Basic info**  
   - **Name:** e.g. `Rice` (required).  
   - **Category:** e.g. `Staples` (required).

4. **Unit & conversions**  
   - **Unit:** e.g. `kg` (required).  
   - **Unit Conversions:** e.g. `g=0.001` or leave empty. Remember: format is unit=factor to base unit.

5. **Cost & stock levels**  
   - **Unit Cost (GHS):** e.g. `8.50`.  
   - **Current Stock:** `0`.  
   - **Minimum Stock:** e.g. `10`.  
   - **Reorder Level:** e.g. `20`.

6. **Supplier**  
   Open the **Supplier** dropdown. Your **Restaurant suppliers** (from Step 1) appear here. Select one (e.g. FreshFarm Produce Ltd) or leave optional. If the list is empty, add suppliers under **Restaurant → Suppliers** first.

7. **Item images**  
   Optional; skip or add images.

8. **Save**  
   Click **Create** (or **Update** when editing). The new item appears in the table with Name, Category, Unit, Stock, Min, Reorder, Unit Cost, and **Supplier** (the value you selected).

9. **List and filter**  
   The table shows all items; low-stock items are highlighted. Use the **Category** filter to show only e.g. Staples.

---

---

## Step 6: Restaurant → Recipe Engine

### Where to find it

1. In the **left sidebar**, under **Restaurant**, click **“Recipe Engine”** (sixth item).
2. No URL parameter; this page is restaurant-specific.

**Direct URL:**  
`/restaurant/recipes`

---

### What is the Recipe Engine?

A **recipe** links a **menu item** (a dish you sell) to the **ingredients** and quantities needed to make one portion. It also stores **selling price**, **overhead cost**, and **production time**. The system uses this to:

- Calculate **cost per portion** (ingredient costs) and **gross margin** (selling price vs cost).
- Support **Production Batches** (Step 7): when you produce a batch, the recipe says what to deduct from inventory.
- Improve **reporting** and menu costing.

---

### Why do this step?

- **Menu Items** (Step 8) define what you sell; **recipes** define what goes into each dish and at what cost.
- **When:** After you have inventory items and at least one menu item. You can create a simple menu item first (Step 8), then come back to add its recipe here.
- **Importance:** Without recipes, you can’t run production batches properly or see accurate cost and margin per dish.

---

### Prerequisites

- **Restaurant inventory items** (Step 5) – so you can pick ingredients in the recipe.
- **At least one Restaurant menu item** – recipes are attached to a menu item. If the **Menu Item** dropdown is empty, go to **Restaurant → Menu Items**, add one dish (e.g. “Jollof Rice”), then return here.

---

### What to create (sample data)

Create **one sample recipe** for a dish you already have as a menu item. Example:

| Field | Sample value |
|-------|--------------|
| **Menu Item** | Select e.g. **Jollof Rice** (or the menu item you created) |
| **Selling Price** | 25.00 |
| **Overhead Cost** | 2.00 (optional – labour, packaging, etc.) |
| **Production Time (mins)** | 15 (optional) |
| **Ingredients** | One or more lines, e.g.: Rice 0.2 kg, Tomatoes 0.5 kg (pick from inventory, enter quantity and unit) |
| **Preparation Instructions** | Optional text (e.g. “Fry onions, add rice…”) |

---

### Field-by-field explanation

| Field | Required? | Meaning in simple terms |
|-------|-----------|--------------------------|
| **Menu Item** | Yes | The dish this recipe is for. Must be a **Restaurant** menu item (from Restaurant → Menu Items). Selecting it can pre-fill selling price from the menu item. |
| **Selling Price** | No | Price you charge for one portion (GHS). Used with cost to show **gross margin %**. |
| **Overhead Cost** | No | Extra cost per portion (labour, packaging, etc.) in GHS. Can be added to ingredient cost for full cost. |
| **Production Time (mins)** | No | How many minutes to make one portion. Useful for kitchen planning and reports. |
| **Ingredients** | At least one line | Each line: **Ingredient** (Restaurant inventory item), **Quantity**, **Unit**. Unit and unit cost often come from the selected ingredient. The system shows **Cost/unit** and **Line** cost (quantity × unit cost). Add multiple lines with **Add Ingredient**; use **Remove** to delete a line. |
| **Preparation Instructions** | No | Free-text steps (e.g. for staff or production notes). |

---

### Step-by-step: where to click

1. **Go to Restaurant → Recipe Engine**  
   Sidebar → **Restaurant** → **Recipe Engine**.

2. **Open the create form**  
   Click the orange **“Add Recipe”** button (top right).

3. **Menu item and pricing**  
   - **Menu Item:** Select a dish from the dropdown (e.g. Jollof Rice). If the list is empty, go to **Restaurant → Menu Items**, add one item, then return.  
   - **Selling Price:** e.g. `25.00`.  
   - **Overhead Cost:** e.g. `2.00` or leave blank.  
   - **Production Time (mins):** e.g. `15` or leave blank.

4. **Ingredients**  
   - For each line: choose **Ingredient** (inventory item), enter **Qty** (e.g. `0.2`), and **Unit** (e.g. `kg`; often filled from the ingredient).  
   - Use **Add Ingredient** to add more lines.  
   - Check the **Cost/unit** and **Line** cost shown per line.  
   - Use **Remove** to delete a line.

5. **Preparation Instructions**  
   Optional; add text if you want.

6. **Save**  
   Click **“Create Recipe”** (or **Update Recipe** when editing). The recipe appears on the page with **Cost/portion**, **Selling price**, and **Gross margin %**.

7. **List and search**  
   Use the search box to find recipes by name. Each card shows menu item name, cost per portion, selling price, and margin; use **Edit** or **Delete** as needed.

---

## Step 8: Restaurant → Menu Items

### Where to find it

1. In the **left sidebar**, under **Restaurant**, click **“Menu Items”** (eighth item).
2. The page must be loaded with the **Restaurant** department so you see restaurant menu items only.

**Direct URL (use this to open the page):**  
**`http://localhost:3000/pos/menu-items?department=restaurant`**

---

### What are Menu Items?

**Menu items** are the **dishes and drinks you sell** in the restaurant. Each has a **name**, **category** (e.g. Main Course, Beverages), **price**, optional description, image, prep time, and allergens. This list is what:

- **Recipe Engine** (Step 6) uses – each recipe is linked to a menu item.
- **Orders** and **POS** use – staff pick from these items when taking orders.
- **KDS** and **reports** use – to show what was sold and at what price.

---

### Why do this step?

- You need at least one **menu item** before you can add a **recipe** (Recipe Engine links a dish to ingredients). Many users create a few menu items first, then add recipes.
- **When:** Before or after Recipe Engine; at least one menu item is needed for recipes.
- **Importance:** Defines what’s on your menu and at what price; everything from ordering to costing flows from here.

---

### Prerequisites

- None. You can create menu items from scratch. No inventory or suppliers required for this step.

---

### What to create (sample data)

Create **one or two sample menu items** so you see the form and list. Example:

| Field | Sample value |
|-------|----------------|
| **Name** | Jollof Rice |
| **Description** | Classic West African one-pot rice with tomatoes and spices. (optional) |
| **Category** | Main Course (select from dropdown) |
| **Price (GHS)** | 25.00 |
| **Image** | Optional – upload one image |
| **Preparation Time (minutes)** | 15 (optional) |
| **Allergens** | e.g. (optional) or leave blank |
| **Available** | Checked (Yes) – so it appears as sellable |

Second example: **Chicken Soup**, **Category:** Soups, **Price:** 12.00, **Prep:** 10, **Available:** Yes.

---

### Field-by-field explanation

| Field | Required? | Meaning in simple terms |
|-------|-----------|--------------------------|
| **Name** | Yes | Display name of the dish or drink (e.g. Jollof Rice, Chicken Soup). Shown on the menu and in orders. |
| **Description** | No | Short text for customers (e.g. ingredients, style). Optional. |
| **Category** | Yes | **Dropdown** – type of item for grouping and filters. The list includes: Starters & Appetizers, Soups, Salads, Main Course, Grills & BBQ, Seafood, Poultry, Vegetarian & Vegan, Sides, Rice & Grains, Pasta & Noodles, Bread & Bakery, Desserts, Cakes & Pastries, Ice Cream & Frozen, Breakfast, Brunch, Snacks & Light Bites, Kids Menu, Beverages, Soft Drinks, Juices & Smoothies, Hot Drinks, Coffee, Tea, Alcoholic Beverages, Beer, Wine, Spirits & Cocktails, Local & Craft, Specials, Combos & Bundles, Other. |
| **Price (GHS)** | Yes | Selling price for one portion in Ghana Cedis. Must be ≥ 0. |
| **Image** | No | One image for the dish (e.g. photo). Optional. |
| **Preparation Time (minutes)** | No | How many minutes to prepare. Shown in POS/reports. Optional. |
| **Allergens (comma-separated)** | No | Allergen list for safety (e.g. nuts, dairy, gluten). Optional. |
| **Available** | No (default Yes) | Checkbox – if unchecked, the item is hidden or marked unavailable so staff don’t sell it (e.g. out of stock). |

---

### Step-by-step: where to click

1. **Go to Restaurant → Menu Items**  
   Either: **Sidebar** → **Restaurant** → **Menu Items**  
   Or open in the browser: **`http://localhost:3000/pos/menu-items?department=restaurant`**

2. **Open the create form**  
   Top right: click the orange **“Add Item”** button. The **“Add Menu Item”** modal opens.

3. **Fill the form**  
   - **Name:** e.g. `Jollof Rice` (required).  
   - **Description:** optional (e.g. “Classic West African one-pot rice…”).  
   - **Category:** open dropdown → select e.g. **Main Course** (required).  
   - **Price (GHS):** e.g. `25.00` (required).  
   - **Image:** optional – upload one image.  
   - **Preparation Time (minutes):** e.g. `15` or leave blank.  
   - **Allergens:** e.g. leave blank or type `nuts, dairy`.  
   - **Available:** leave checked so the item can be sold.

4. **Save**  
   Click **“Create”** (or **Update** when editing). The new item appears in the table with image (or placeholder), name, category, price, Available, and Prep time.

5. **List and filter**  
   The table shows all restaurant menu items. Use the **Category** dropdown (top left) to filter by category (e.g. Main Course only). Use **Edit** or **Delete** on each row as needed.

---

### Quick reference: navigation order for full guide

1. ~~Suppliers~~
2. ~~Purchase Orders~~
3. ~~Transfers~~
4. ~~Stock Control~~
5. ~~Inventory~~
6. ~~Recipe Engine~~
7. Production Batches  
8. ~~Menu Items~~ ← **demonstrated** (`/pos/menu-items?department=restaurant`)
9. Tables  
10. Orders  
11. KDS Workflow  
12. Barcode Scan  
13. Restaurant Reports  
14. Consolidated Reports  
15. Payments  
16. Expenses  
17. Accounting  

---

**Next in the guide:** Step 7 (Production Batches) or continue with Tables, Orders, etc. Say which step you want next.
