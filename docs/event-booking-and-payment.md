# Event Booking & Payment – How It Works

This guide explains how event bookings and payments work in Bookgh: the lifecycle of a booking, how pricing is set, and how the system knows how much the client has paid and how much is still owed.

---

## 1. Event booking lifecycle

An event booking moves through **statuses** as you progress with the client:

| Status       | Meaning |
|-------------|---------|
| **Inquiry** | Client is interested; no quote yet. |
| **Quoted**  | You have sent a price (quoted price) to the client. |
| **Confirmed** | Client agreed; you may lock in an agreed price. |
| **Deposit paid** | Client has paid the deposit. |
| **Ongoing** | Event is in progress. |
| **Completed** | Event is done. |
| **Cancelled** | Booking was cancelled. |

You create a booking with **venue** (event hall), **client**, **dates**, and optionally **quoted price** and **installments**. As the client pays and the event happens, you update **deposit paid**, **final settlement paid**, and optionally **installment** statuses.

---

## 2. How pricing works – “How much to pay”

### Main price fields

- **Quoted price**  
  The amount you send to the client (e.g. in a proposal). You can type this manually or base it on the **event hall’s pricing** (hourly/daily/weekend rates shown when you select the hall). The system does **not** auto-calculate from hall rates; you enter the total you are quoting.

- **Agreed price**  
  Optional. If you negotiate and the final deal is different from the quote, set the agreed price. When present, it is used as the main “total” for the event (see below).

- **Total revenue** (used in the backend)  
  The system treats this as “how much the client is supposed to pay in total”. It is derived in this order:
  1. Sum of **billing line items** (if you use itemised billing), or  
  2. Sum of **charges** (hall rental, catering, equipment, etc.), or  
  3. **Agreed price**, or  
  4. **Quoted price**.

So: **how much to pay (total)** = that total revenue. The client is expected to pay this amount (often in deposit + final settlement, and/or installments).

---

## 3. How payment is tracked – “How much has been paid” and “How much is left”

Payment is tracked with two simple totals plus an optional schedule:

### Deposit and final settlement

- **Deposit required**  
  Optional. The amount you ask for as a deposit (for display/reminder only; the system does not auto-enforce it).

- **Deposit paid**  
  The amount the client has actually paid as deposit. You update this when they pay.

- **Final settlement paid**  
  The amount the client has paid to settle the rest (after the deposit). You update this when they pay the balance.

**Outstanding (how much is left to pay)** is calculated as:

```text
Outstanding = Total revenue − (Deposit paid + Final settlement paid)
```

So:

- **How much to pay in total** = **Total revenue** (from quoted/agreed or from line items/charges).
- **How much they have paid** = **Deposit paid** + **Final settlement paid**.
- **How much they still owe** = **Outstanding**.

When you change **deposit paid** or **final settlement paid** on the booking, the API recalculates **outstanding amount** automatically.

### Installments (optional)

- **Installment schedule**  
  You can add rows: **due date**, **amount**, and **status** (e.g. Pending / Paid). This is a **schedule of planned payments** (e.g. “50% on signing, 50% one week before”).  

- Each installment can be linked to a **payment** (e.g. `paymentId`) and marked **paid** with a **paid date**.  

- The **main** numbers the system uses for “how much is left” are still **deposit paid** and **final settlement paid**; installments are for tracking **when** and **how** the client pays, not for recalculating the total owed. So you keep **deposit paid** and **final settlement paid** in sync with what the client has actually paid.

---

## 4. Summary

| Concept | Where it comes from |
|--------|----------------------|
| **How much the event costs (total)** | Quoted price (or agreed price, or sum of billing line items / charges). |
| **How much the client has paid** | Deposit paid + Final settlement paid. |
| **How much is left to pay** | Outstanding = Total revenue − (Deposit paid + Final settlement paid). |
| **When to pay (schedule)** | Optional installment schedule (due date + amount per row). |

When you **create** a booking, you set **quoted price** (and optionally installments). The system sets **total revenue**, **net profit**, and **outstanding** from the quoted price. When you **edit** the booking, you can set **deposit paid**, **final settlement paid**, **agreed price**, and line items; the API recomputes **total revenue**, **outstanding**, and **net profit** so you always know how much to pay and how much is left.
