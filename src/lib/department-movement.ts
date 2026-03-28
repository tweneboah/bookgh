import mongoose, { type Model } from "mongoose";
import { DEPARTMENT, type Department } from "@/constants";
import LocationStock, { type ILocationStock } from "@/models/restaurant/LocationStock";
import StationTransfer, { type IStationTransfer } from "@/models/restaurant/StationTransfer";
import KitchenUsage, { type IKitchenUsage } from "@/models/restaurant/KitchenUsage";
import StationMovement, { type IStationMovement } from "@/models/restaurant/StationMovement";

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizeMovementDepartment(
  input?: string | null,
  fallback: Department = DEPARTMENT.RESTAURANT
): Department {
  const raw = input === "accomodation" ? "accommodation" : input;
  const valid = Object.values(DEPARTMENT);
  return (valid.includes(raw as Department) ? raw : fallback) as Department;
}

export function getLocationStockModelForDepartment(
  input?: string | null
): Model<ILocationStock> {
  const department = normalizeMovementDepartment(input);
  const modelName = `LocationStock${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<ILocationStock> | undefined;
  if (existing) return existing;
  return mongoose.model<ILocationStock>(
    modelName,
    LocationStock.schema.clone(),
    `location_stock_${department}`
  );
}

export function getStationTransferModelForDepartment(
  input?: string | null
): Model<IStationTransfer> {
  const department = normalizeMovementDepartment(input);
  const modelName = `StationTransfer${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IStationTransfer> | undefined;
  if (existing) return existing;
  return mongoose.model<IStationTransfer>(
    modelName,
    StationTransfer.schema.clone(),
    `station_transfers_${department}`
  );
}

export function getKitchenUsageModelForDepartment(
  input?: string | null
): Model<IKitchenUsage> {
  const department = normalizeMovementDepartment(input);
  const modelName = `KitchenUsage${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IKitchenUsage> | undefined;
  if (existing) return existing;
  return mongoose.model<IKitchenUsage>(
    modelName,
    KitchenUsage.schema.clone(),
    `kitchen_usage_${department}`
  );
}

export function getStationMovementModelForDepartment(
  input?: string | null
): Model<IStationMovement> {
  const department = normalizeMovementDepartment(input);
  const modelName = `StationMovement${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IStationMovement> | undefined;
  if (existing) return existing;
  return mongoose.model<IStationMovement>(
    modelName,
    StationMovement.schema.clone(),
    `station_movements_${department}`
  );
}
