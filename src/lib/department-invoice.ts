import mongoose, { type Model } from "mongoose";
import { DEPARTMENT, type Department } from "@/constants";
import Invoice, { type IInvoice } from "@/models/billing/Invoice";

type QueryFilter = Record<string, unknown>;

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function normalizeDepartment(input?: string | null): Department {
  const raw = input === "accomodation" ? "accommodation" : input;
  const valid = Object.values(DEPARTMENT);
  return (valid.includes(raw as Department) ? raw : DEPARTMENT.ACCOMMODATION) as Department;
}

export function getInvoiceModelForDepartment(input?: string | null): Model<IInvoice> {
  const department = normalizeDepartment(input);
  const modelName = `Invoice${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IInvoice> | undefined;
  if (existing) return existing;
  return mongoose.model<IInvoice>(
    modelName,
    Invoice.schema.clone(),
    `invoices_${department}`
  );
}

export function getInvoiceModelsForQuery(department?: string | null): Model<IInvoice>[] {
  if (department) return [getInvoiceModelForDepartment(department)];
  return Object.values(DEPARTMENT).map((dept) => getInvoiceModelForDepartment(dept));
}

export async function findInvoiceOneAcross(
  filter: QueryFilter,
  department?: string | null
) {
  const models = getInvoiceModelsForQuery(department);
  for (const model of models) {
    const doc = await model.findOne(filter as any).lean();
    if (doc) return doc;
  }
  return null;
}

export async function findInvoiceOneAndUpdateAcross(
  filter: QueryFilter,
  update: QueryFilter,
  department?: string | null
) {
  const models = getInvoiceModelsForQuery(department);
  for (const model of models) {
    const doc = await model
      .findOneAndUpdate(filter as any, update as any, {
        new: true,
        runValidators: true,
      })
      .lean();
    if (doc) return doc;
  }
  return null;
}

export async function findInvoiceOneAndDeleteAcross(
  filter: QueryFilter,
  department?: string | null
) {
  const models = getInvoiceModelsForQuery(department);
  for (const model of models) {
    const doc = await model.findOneAndDelete(filter as any).lean();
    if (doc) return doc;
  }
  return null;
}
