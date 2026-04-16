/**
 * Restaurant stock flow (by design):
 * - Main store ↔ Kitchen ↔ Front house: updated only by transfers (and kitchen usage for prep).
 * - POS orders (served/completed): deduct ingredients only from Front house, so "what was used
 *   at service" is visible at that location. Kitchen and main are unchanged by sales.
 */
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { STOCK_LOCATION } from "@/constants";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";
import { getLocationStockModelForDepartment } from "@/lib/department-movement";

export type RestaurantCascadeBreakdown = {
  frontHouse: number;
  kitchen: number;
  mainStore: number;
};

export async function getRestaurantStockBuckets(params: {
  tenantId: string;
  branchId: string;
  department: string;
  inventoryItemId: string;
}): Promise<{
  mainStore: number;
  kitchen: number;
  frontHouse: number;
  total: number;
}> {
  const InventoryItemModel = getInventoryItemModelForDepartment(params.department);
  const LocationStockModel = getLocationStockModelForDepartment(params.department);

  const item = await InventoryItemModel.findOne({
    _id: params.inventoryItemId,
    tenantId: params.tenantId,
    branchId: params.branchId,
  } as Record<string, unknown>).lean();
  if (!item) throw new NotFoundError(`Inventory item ${params.inventoryItemId}`);

  const mainStore = Number((item as { currentStock?: number }).currentStock ?? 0);

  const [fhDoc, kitDoc] = await Promise.all([
    LocationStockModel.findOne({
      inventoryItemId: params.inventoryItemId,
      location: STOCK_LOCATION.FRONT_HOUSE,
      tenantId: params.tenantId,
      branchId: params.branchId,
      department: params.department,
    } as Record<string, unknown>).lean(),
    LocationStockModel.findOne({
      inventoryItemId: params.inventoryItemId,
      location: STOCK_LOCATION.KITCHEN,
      tenantId: params.tenantId,
      branchId: params.branchId,
      department: params.department,
    } as Record<string, unknown>).lean(),
  ]);

  const frontHouse = fhDoc ? Number((fhDoc as { quantity?: number }).quantity ?? 0) : 0;
  const kitchen = kitDoc ? Number((kitDoc as { quantity?: number }).quantity ?? 0) : 0;

  return {
    mainStore,
    kitchen,
    frontHouse,
    total: Number((mainStore + kitchen + frontHouse).toFixed(4)),
  };
}

/**
 * POS sale: deduct only from Front house. Main store and kitchen are not changed by orders.
 */
export async function applyRestaurantCascadeSale(params: {
  tenantId: string;
  branchId: string;
  department: string;
  inventoryItemId: string;
  requiredQty: number;
  unit: string;
}): Promise<{
  breakdown: RestaurantCascadeBreakdown;
  /** Front house qty before this sale (for movement rows) */
  frontHouseBefore: number;
  /** Front house qty after this sale */
  frontHouseAfter: number;
  totalBefore: number;
  totalAfter: number;
  inventoryAfterMain: number;
}> {
  const InventoryItemModel = getInventoryItemModelForDepartment(params.department);
  const LocationStockModel = getLocationStockModelForDepartment(params.department);

  const inventory = await InventoryItemModel.findOne({
    _id: params.inventoryItemId,
    tenantId: params.tenantId,
    branchId: params.branchId,
  } as Record<string, unknown>);
  if (!inventory) throw new NotFoundError(`Inventory item ${params.inventoryItemId}`);

  const beforeBuckets = await getRestaurantStockBuckets({
    tenantId: params.tenantId,
    branchId: params.branchId,
    department: params.department,
    inventoryItemId: params.inventoryItemId,
  });
  const fhBefore = beforeBuckets.frontHouse;
  const required = params.requiredQty;

  if (fhBefore < required - 0.0001) {
    throw new BadRequestError(
      `Insufficient stock at Front House for ${inventory.name}. Required ${required} ${params.unit}, available ${fhBefore} ${params.unit}. Move stock from Kitchen to Front House (Movement flow) before serving.`
    );
  }

  const fhDoc = await LocationStockModel.findOne({
    inventoryItemId: params.inventoryItemId,
    location: STOCK_LOCATION.FRONT_HOUSE,
    tenantId: params.tenantId,
    branchId: params.branchId,
    department: params.department,
  } as Record<string, unknown>);

  if (!fhDoc) {
    throw new BadRequestError(
      `No Front House stock row for ${inventory.name}. Transfer from Kitchen to Front House first.`
    );
  }

  const fhAfter = Number((fhBefore - required).toFixed(4));
  (fhDoc as { quantity?: number }).quantity = Math.max(0, fhAfter);
  await fhDoc.save();

  const breakdown: RestaurantCascadeBreakdown = {
    frontHouse: required,
    kitchen: 0,
    mainStore: 0,
  };

  const afterBuckets = await getRestaurantStockBuckets({
    tenantId: params.tenantId,
    branchId: params.branchId,
    department: params.department,
    inventoryItemId: params.inventoryItemId,
  });

  return {
    breakdown,
    frontHouseBefore: fhBefore,
    frontHouseAfter: afterBuckets.frontHouse,
    totalBefore: beforeBuckets.total,
    totalAfter: afterBuckets.total,
    inventoryAfterMain: afterBuckets.mainStore,
  };
}

/** Add stock back (void order) — inverse of a recorded breakdown (legacy rows may include kitchen/main). */
export async function addBackRestaurantCascade(params: {
  tenantId: string;
  branchId: string;
  department: string;
  inventoryItemId: string;
  breakdown: RestaurantCascadeBreakdown;
}): Promise<void> {
  const InventoryItemModel = getInventoryItemModelForDepartment(params.department);
  const LocationStockModel = getLocationStockModelForDepartment(params.department);
  const { breakdown } = params;

  const inventory = await InventoryItemModel.findOne({
    _id: params.inventoryItemId,
    tenantId: params.tenantId,
    branchId: params.branchId,
  } as Record<string, unknown>);
  if (!inventory) throw new NotFoundError(`Inventory item ${params.inventoryItemId}`);

  const unit =
    String((inventory as { unit?: string }).unit ?? "unit").trim() || "unit";

  if (breakdown.mainStore > 0) {
    inventory.currentStock = Number(
      (Number(inventory.currentStock ?? 0) + breakdown.mainStore).toFixed(4)
    );
    await inventory.save();
  }

  async function addToLocation(
    location: typeof STOCK_LOCATION.FRONT_HOUSE | typeof STOCK_LOCATION.KITCHEN,
    qty: number
  ) {
    if (qty <= 0) return;
    let doc = await LocationStockModel.findOne({
      inventoryItemId: params.inventoryItemId,
      location,
      tenantId: params.tenantId,
      branchId: params.branchId,
      department: params.department,
    } as Record<string, unknown>);
    if (!doc) {
      await LocationStockModel.create({
        tenantId: params.tenantId,
        branchId: params.branchId,
        department: params.department,
        inventoryItemId: params.inventoryItemId,
        location,
        quantity: qty,
        unit,
      } as Record<string, unknown>);
    } else {
      (doc as { quantity?: number }).quantity = Number(
        ((doc as { quantity?: number }).quantity ?? 0) + qty
      );
      await doc.save();
    }
  }

  await addToLocation(STOCK_LOCATION.FRONT_HOUSE, breakdown.frontHouse);
  await addToLocation(STOCK_LOCATION.KITCHEN, breakdown.kitchen);
}
