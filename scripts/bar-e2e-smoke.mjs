#!/usr/bin/env node
/**
 * BAR end-to-end smoke flow:
 * 1) Open shift
 * 2) Create order
 * 3) Mark order served (stock deduction)
 * 4) Fetch bar report
 * 5) Close shift
 *
 * Required env:
 * - BASE_URL (e.g. http://localhost:3000/api)
 * - ACCESS_TOKEN (JWT with BAR permissions)
 * - MENU_ITEM_ID
 */

const BASE_URL = process.env.BASE_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const MENU_ITEM_ID = process.env.MENU_ITEM_ID;

if (!BASE_URL || !ACCESS_TOKEN || !MENU_ITEM_ID) {
  console.error(
    "Missing required env vars. Set BASE_URL, ACCESS_TOKEN, MENU_ITEM_ID."
  );
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status} ${path}: ${JSON.stringify(body)}`
    );
  }
  return body;
}

async function run() {
  const shift = await request("/bar/shifts", {
    method: "POST",
    body: JSON.stringify({
      shiftName: `Smoke-${Date.now()}`,
      openingCash: 100,
      openingStockSnapshot: [],
    }),
  });
  const shiftId = shift?.data?._id;
  if (!shiftId) throw new Error("Shift open returned no shift id");

  const order = await request("/pos/orders", {
    method: "POST",
    body: JSON.stringify({
      shiftId,
      items: [
        {
          menuItemId: MENU_ITEM_ID,
          name: "Smoke Drink",
          quantity: 1,
          unitPrice: 50,
          amount: 50,
        },
      ],
      subtotal: 50,
      tax: 2.5,
      totalAmount: 52.5,
      addToRoomBill: false,
    }),
  });
  const orderId = order?.data?._id;
  if (!orderId) throw new Error("Order create returned no order id");

  await request(`/pos/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "served",
      shiftId,
    }),
  });

  await request("/reports/bar");

  await request(`/bar/shifts/${shiftId}`, {
    method: "PATCH",
    body: JSON.stringify({
      closingCash: 120,
      closingStockSnapshot: [],
      varianceNotes: "Smoke test close",
    }),
  });

  console.log("BAR smoke flow passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
