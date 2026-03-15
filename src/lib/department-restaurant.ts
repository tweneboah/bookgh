import mongoose, { type Model } from "mongoose";
import { DEPARTMENT, type Department } from "@/constants";
import Recipe, { type IRecipe } from "@/models/restaurant/Recipe";
import ProductionBatch, {
  type IProductionBatch,
} from "@/models/restaurant/ProductionBatch";

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizeRestaurantDepartment(
  input?: string | null,
  fallback: Department = DEPARTMENT.RESTAURANT
): Department {
  const raw = input === "accomodation" ? "accommodation" : input;
  const valid = Object.values(DEPARTMENT);
  return (valid.includes(raw as Department) ? raw : fallback) as Department;
}

export function getRecipeModelForDepartment(input?: string | null): Model<IRecipe> {
  const department = normalizeRestaurantDepartment(input);
  const modelName = `Recipe${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IRecipe> | undefined;
  if (existing) return existing;
  return mongoose.model<IRecipe>(
    modelName,
    Recipe.schema.clone(),
    `recipes_${department}`
  );
}

export function getProductionBatchModelForDepartment(
  input?: string | null
): Model<IProductionBatch> {
  const department = normalizeRestaurantDepartment(input);
  const modelName = `ProductionBatch${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IProductionBatch> | undefined;
  if (existing) return existing;
  return mongoose.model<IProductionBatch>(
    modelName,
    ProductionBatch.schema.clone(),
    `production_batches_${department}`
  );
}
