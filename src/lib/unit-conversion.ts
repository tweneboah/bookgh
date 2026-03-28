type UnitConversion = {
  unit: string;
  factor: number;
};

export type ItemWithUnitConversions = {
  unit?: string | null;
  unitConversions?: UnitConversion[] | null;
  /** When base unit is "unit", 1 unit = volumeMl ml. Enables ml → unit conversion. */
  volumeMl?: number | null;
};

function normalizeUnit(unit: string | null | undefined): string {
  return String(unit ?? "")
    .trim()
    .toLowerCase();
}

export function resolveUnitFactor(
  item: ItemWithUnitConversions,
  enteredUnit: string
): number | null {
  const baseUnit = normalizeUnit(item.unit);
  const inputUnit = normalizeUnit(enteredUnit);
  if (!baseUnit || !inputUnit) return null;
  if (baseUnit === inputUnit) return 1;

  const conversions = Array.isArray(item.unitConversions) ? item.unitConversions : [];
  const matched = conversions.find(
    (conversion) => normalizeUnit(conversion.unit) === inputUnit
  );
  if (matched) {
    const factor = Number(matched.factor ?? 0);
    if (Number.isFinite(factor) && factor > 0) return factor;
  }

  // Fallback: base unit "unit" and entered "ml" — use volumeMl (1 unit = volumeMl ml → factor = 1/volumeMl)
  if (baseUnit === "unit" && inputUnit === "ml") {
    const volumeMl = Number(item.volumeMl);
    if (Number.isFinite(volumeMl) && volumeMl > 0) return 1 / volumeMl;
  }
  return null;
}

export function convertToBaseUnitQuantity(input: {
  item: ItemWithUnitConversions;
  quantity: number;
  enteredUnit: string;
}) {
  const factor = resolveUnitFactor(input.item, input.enteredUnit);
  if (factor == null) return null;
  const baseQuantity = Number((Number(input.quantity) * factor).toFixed(6));
  return {
    baseQuantity,
    baseUnit: String(input.item.unit ?? "").trim(),
    factor,
  };
}

// ─── Yield-based conversion (dynamic chef / store units) ──────────
// Used when the restaurant defines conversions like "1 small bag → 20 plates"
// via the ItemYield collection, rather than hardcoded unitConversions arrays.

export type YieldMapping = {
  inventoryItemId: string;
  fromUnitId: string;
  fromUnitName: string;
  fromQty: number;
  /** How many base units (e.g. kg) are in fromQty purchase units. */
  baseUnitQty?: number;
  toUnitId: string;
  toUnitName: string;
  toQty: number;
};

/**
 * Build a lookup from populated ItemYield docs.
 * Call once per request and pass the map to conversion helpers.
 */
export function buildYieldMap(
  yieldDocs: Array<{
    inventoryItemId: any;
    fromUnitId: any;
    fromQty: number;
    baseUnitQty?: number;
    toUnitId: any;
    toQty: number;
  }>
): Map<string, YieldMapping[]> {
  const map = new Map<string, YieldMapping[]>();
  for (const y of yieldDocs) {
    const itemId = String(
      typeof y.inventoryItemId === "object"
        ? y.inventoryItemId._id ?? y.inventoryItemId
        : y.inventoryItemId
    );
    const entry: YieldMapping = {
      inventoryItemId: itemId,
      fromUnitId: String(typeof y.fromUnitId === "object" ? y.fromUnitId._id : y.fromUnitId),
      fromUnitName: normalizeUnit(typeof y.fromUnitId === "object" ? y.fromUnitId.name : ""),
      fromQty: Number(y.fromQty) || 1,
      baseUnitQty: y.baseUnitQty != null ? Number(y.baseUnitQty) : undefined,
      toUnitId: String(typeof y.toUnitId === "object" ? y.toUnitId._id : y.toUnitId),
      toUnitName: normalizeUnit(typeof y.toUnitId === "object" ? y.toUnitId.name : ""),
      toQty: Number(y.toQty) || 0,
    };
    if (!map.has(itemId)) map.set(itemId, []);
    map.get(itemId)!.push(entry);
  }
  return map;
}

/**
 * Convert a chef/yield quantity back to the purchase (from) quantity.
 * e.g. "3 plates of rice" → 0.15 small bags (if 1 bag = 20 plates).
 *
 * Returns null if no matching yield mapping is found.
 */
export function convertYieldToFromUnit(input: {
  inventoryItemId: string;
  yieldQty: number;
  yieldUnitIdOrName: string;
  yieldMap: Map<string, YieldMapping[]>;
}): { fromQty: number; fromUnitName: string; fromUnitId: string } | null {
  const mappings = input.yieldMap.get(input.inventoryItemId);
  if (!mappings || mappings.length === 0) return null;

  const needle = normalizeUnit(input.yieldUnitIdOrName);
  const match = mappings.find(
    (m) => m.toUnitId === input.yieldUnitIdOrName || m.toUnitName === needle
  );
  if (!match || match.toQty <= 0) return null;

  const ratio = match.fromQty / match.toQty;
  return {
    fromQty: Number((input.yieldQty * ratio).toFixed(6)),
    fromUnitName: match.fromUnitName,
    fromUnitId: match.fromUnitId,
  };
}

/**
 * Convert a chef-unit quantity to the inventory item's base unit quantity.
 *
 * Resolution chain (strict):
 *  1. If the yield mapping's fromUnit IS the base unit → direct arithmetic.
 *  2. If the yield mapping has `baseUnitQty` → use it (e.g. 1 bag = 25 kg).
 *
 * Returns base-unit quantity to deduct, or null when no conversion path exists.
 */
export function convertChefQtyToBaseQty(input: {
  inventoryItemId: string;
  chefQty: number;
  chefUnitIdOrName: string;
  item: ItemWithUnitConversions;
  yieldMap: Map<string, YieldMapping[]>;
}): number | null {
  const mappings = input.yieldMap.get(input.inventoryItemId);
  if (!mappings || mappings.length === 0) return null;

  const needle = normalizeUnit(input.chefUnitIdOrName);
  const match = mappings.find(
    (m) => m.toUnitId === input.chefUnitIdOrName || m.toUnitName === needle
  );
  if (!match || match.toQty <= 0) return null;

  const baseUnit = normalizeUnit(input.item.unit);

  // Path 1: fromUnit IS the base unit — simple ratio
  if (normalizeUnit(match.fromUnitName) === baseUnit) {
    const ratio = match.fromQty / match.toQty;
    return Number((input.chefQty * ratio).toFixed(6));
  }

  // Path 2: baseUnitQty is defined on the yield mapping
  // e.g. 1 bag (= 25 kg) → 50 plates  →  1 plate = 25/50 = 0.5 kg
  if (match.baseUnitQty != null && match.baseUnitQty > 0) {
    const basePerYieldUnit = match.baseUnitQty / match.toQty;
    return Number((input.chefQty * basePerYieldUnit).toFixed(6));
  }

  return null;
}
