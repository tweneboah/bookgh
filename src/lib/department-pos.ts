import mongoose, { type Model } from "mongoose";
import { DEPARTMENT } from "@/constants";
import POSMenuItem, { type IPOSMenuItem } from "@/models/pos/POSMenuItem";
import POSTable, { type IPOSTable } from "@/models/pos/POSTable";
import POSOrder, { type IPOSOrder } from "@/models/pos/POSOrder";

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizePosDepartment(input?: string | null) {
  if (!input) return "";
  const raw = input === "accomodation" ? "accommodation" : input;
  const departments = new Set(Object.values(DEPARTMENT));
  return departments.has(raw as (typeof DEPARTMENT)[keyof typeof DEPARTMENT])
    ? raw
    : "";
}

function resolveIsolatedPosDepartment(input?: string | null) {
  const department = normalizePosDepartment(input);
  if (department === DEPARTMENT.RESTAURANT) return DEPARTMENT.RESTAURANT;
  if (department === DEPARTMENT.BAR) return DEPARTMENT.BAR;
  return "";
}

export function getPosMenuItemModelForDepartment(
  input?: string | null
): Model<IPOSMenuItem> {
  const isolatedDepartment = resolveIsolatedPosDepartment(input);
  if (!isolatedDepartment) return POSMenuItem;
  const modelName = `PosMenuItem${pascalCase(isolatedDepartment)}`;
  const existing = mongoose.models[modelName] as Model<IPOSMenuItem> | undefined;
  if (existing) return existing;
  return mongoose.model<IPOSMenuItem>(
    modelName,
    POSMenuItem.schema.clone(),
    isolatedDepartment === DEPARTMENT.RESTAURANT
      ? "restaurant_menu_items"
      : "bar_menu_items"
  );
}

export function getPosTableModelForDepartment(
  input?: string | null
): Model<IPOSTable> {
  const isolatedDepartment = resolveIsolatedPosDepartment(input);
  if (!isolatedDepartment) return POSTable;
  const modelName = `PosTable${pascalCase(isolatedDepartment)}`;
  const existing = mongoose.models[modelName] as Model<IPOSTable> | undefined;
  if (existing) return existing;
  return mongoose.model<IPOSTable>(
    modelName,
    POSTable.schema.clone(),
    isolatedDepartment === DEPARTMENT.RESTAURANT
      ? "restaurant_tables"
      : "bar_tables"
  );
}

export function getPosOrderModelForDepartment(
  input?: string | null
): Model<IPOSOrder> {
  const isolatedDepartment = resolveIsolatedPosDepartment(input);
  if (!isolatedDepartment) return POSOrder;
  const modelName = `PosOrder${pascalCase(isolatedDepartment)}`;
  const existing = mongoose.models[modelName] as Model<IPOSOrder> | undefined;
  if (existing) return existing;
  const schema = POSOrder.schema.clone();
  if (!schema.path("appliedRule")) {
    schema.add({
      appliedRule: {
        id: { type: String },
        name: { type: String },
      },
    });
  }
  return mongoose.model<IPOSOrder>(
    modelName,
    schema,
    isolatedDepartment === DEPARTMENT.RESTAURANT
      ? "restaurant_orders"
      : "bar_orders"
  );
}
