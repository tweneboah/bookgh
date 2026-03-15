import mongoose, { type Model } from "mongoose";
import { DEPARTMENT, type Department } from "@/constants";
import Supplier, { type ISupplier } from "@/models/procurement/Supplier";
import PurchaseOrder, { type IPurchaseOrder } from "@/models/procurement/PurchaseOrder";
import StockTransfer, { type IStockTransfer } from "@/models/procurement/StockTransfer";

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizeProcurementDepartment(
  input?: string | null,
  fallback: Department = DEPARTMENT.INVENTORY_PROCUREMENT
): Department {
  const raw = input === "accomodation" ? "accommodation" : input;
  const valid = Object.values(DEPARTMENT);
  return (valid.includes(raw as Department) ? raw : fallback) as Department;
}

export function getSupplierModelForDepartment(input?: string | null): Model<ISupplier> {
  const department = normalizeProcurementDepartment(input);
  const modelName = `Supplier${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<ISupplier> | undefined;
  if (existing) return existing;
  return mongoose.model<ISupplier>(
    modelName,
    Supplier.schema.clone(),
    `suppliers_${department}`
  );
}

export function getPurchaseOrderModelForDepartment(
  input?: string | null
): Model<IPurchaseOrder> {
  const department = normalizeProcurementDepartment(input);
  const modelName = `PurchaseOrder${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IPurchaseOrder> | undefined;
  if (existing) return existing;
  return mongoose.model<IPurchaseOrder>(
    modelName,
    PurchaseOrder.schema.clone(),
    `purchase_orders_${department}`
  );
}

export function getStockTransferModelForDepartment(
  input?: string | null
): Model<IStockTransfer> {
  const department = normalizeProcurementDepartment(input);
  const modelName = `StockTransfer${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IStockTransfer> | undefined;
  if (existing) return existing;
  return mongoose.model<IStockTransfer>(
    modelName,
    StockTransfer.schema.clone(),
    `stock_transfers_${department}`
  );
}
