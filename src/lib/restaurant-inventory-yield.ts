import type { Types } from "mongoose";

/**
 * Restaurant purchase/yield fields on inventory are optional: define conversions
 * on Restaurant → Units → Yield mappings after creating the item, or fill the
 * optional fields here for a simple 1 purchase → N yield link.
 *
 * Kept as a no-op hook so call sites (POST/PATCH inventory) stay stable.
 */
export async function assertRestaurantYieldFieldsWhenUnitsExist(
  _tenantId: Types.ObjectId | string,
  _branchId: Types.ObjectId | string,
  _department: string,
  _merged: {
    purchaseUnitId?: unknown;
    yieldUnitId?: unknown;
    yieldPerPurchaseUnit?: unknown;
  }
): Promise<void> {
  /* intentionally no validation */
}
