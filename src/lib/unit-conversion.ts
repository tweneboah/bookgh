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
