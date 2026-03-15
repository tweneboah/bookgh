import mongoose, { type Model } from "mongoose";
import { DEPARTMENT, type Department } from "@/constants";
import InventoryItem, { type IInventoryItem } from "@/models/pos/InventoryItem";
import InventoryMovement, {
  type IInventoryMovement,
} from "@/models/pos/InventoryMovement";

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizeInventoryDepartment(
  input?: string | null,
  fallback: Department = DEPARTMENT.INVENTORY_PROCUREMENT
): Department {
  const raw = input === "accomodation" ? "accommodation" : input;
  const valid = Object.values(DEPARTMENT);
  return (valid.includes(raw as Department) ? raw : fallback) as Department;
}

export function getInventoryItemModelForDepartment(
  input?: string | null
): Model<IInventoryItem> {
  const department = normalizeInventoryDepartment(input);
  const modelName = `InventoryItem${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IInventoryItem> | undefined;
  if (existing) return existing;
  return mongoose.model<IInventoryItem>(
    modelName,
    InventoryItem.schema.clone(),
    `inventory_items_${department}`
  );
}

export function getInventoryMovementModelForDepartment(
  input?: string | null
): Model<IInventoryMovement> {
  const department = normalizeInventoryDepartment(input);
  const modelName = `InventoryMovement${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IInventoryMovement> | undefined;
  if (existing) return existing;
  return mongoose.model<IInventoryMovement>(
    modelName,
    InventoryMovement.schema.clone(),
    `inventory_movements_${department}`
  );
}

export function getInventoryItemModelsForQuery(input?: string | null) {
  if (!input) {
    return Object.values(DEPARTMENT).map((dept) =>
      getInventoryItemModelForDepartment(dept)
    );
  }
  const scoped = getInventoryItemModelForDepartment(input);
  return [scoped];
}
