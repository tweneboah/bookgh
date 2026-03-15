import mongoose, { type Model } from "mongoose";
import { DEPARTMENT, type Department } from "@/constants";
import Payment, { type IPayment } from "@/models/billing/Payment";
import Expense, { type IExpense } from "@/models/shared/Expense";

type QueryFilter = Record<string, unknown>;
type SortValue = 1 | -1;

function normalizeDepartment(input?: string | null): Department {
  const raw = input === "accomodation" ? "accommodation" : input;
  const valid = Object.values(DEPARTMENT);
  return (valid.includes(raw as Department) ? raw : DEPARTMENT.ACCOMMODATION) as Department;
}

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function getPaymentModelForDepartment(input?: string | null): Model<IPayment> {
  const department = normalizeDepartment(input);
  const modelName = `Payment${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IPayment> | undefined;
  if (existing) return existing;
  return mongoose.model<IPayment>(
    modelName,
    Payment.schema.clone(),
    `payments_${department}`
  );
}

export function getExpenseModelForDepartment(input?: string | null): Model<IExpense> {
  const department = normalizeDepartment(input);
  const modelName = `Expense${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IExpense> | undefined;
  if (existing) return existing;
  return mongoose.model<IExpense>(
    modelName,
    Expense.schema.clone(),
    `expenses_${department}`
  );
}

export function getPaymentModelsForQuery(department?: string | null): Model<IPayment>[] {
  if (department) {
    const scopedModel = getPaymentModelForDepartment(department);
    return [scopedModel];
  }
  return Object.values(DEPARTMENT).map((dept) => getPaymentModelForDepartment(dept));
}

export function getExpenseModelsForQuery(department?: string | null): Model<IExpense>[] {
  if (department) {
    const scopedModel = getExpenseModelForDepartment(department);
    return [scopedModel];
  }
  return Object.values(DEPARTMENT).map((dept) => getExpenseModelForDepartment(dept));
}

function modelSortDirection(sort: QueryFilter, fallbackKey: string): { key: string; direction: SortValue } {
  const key = Object.keys(sort)[0] ?? fallbackKey;
  const raw = sort[key];
  const direction: SortValue = raw === 1 ? 1 : -1;
  return { key, direction };
}

export function sortAndPaginateRows<T extends Record<string, any>>(
  rows: T[],
  page: number,
  limit: number,
  sort: QueryFilter,
  fallbackKey: string
) {
  const { key, direction } = modelSortDirection(sort, fallbackKey);
  const sorted = [...rows].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const left = av instanceof Date ? av.getTime() : av;
    const right = bv instanceof Date ? bv.getTime() : bv;
    if (left > right) return direction === 1 ? 1 : -1;
    if (left < right) return direction === 1 ? -1 : 1;
    return 0;
  });
  const total = sorted.length;
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit;
  const items = sorted.slice(start, start + safeLimit);
  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function findPaymentOneAcross(
  filter: QueryFilter,
  department?: string | null
) {
  const models = getPaymentModelsForQuery(department);
  for (const model of models) {
    const doc = await model.findOne(filter as any).lean();
    if (doc) return doc;
  }
  return null;
}

export async function findExpenseOneAcross(
  filter: QueryFilter,
  department?: string | null
) {
  const models = getExpenseModelsForQuery(department);
  for (const model of models) {
    const doc = await model.findOne(filter as any).lean();
    if (doc) return doc;
  }
  return null;
}

export async function findPaymentOneAndUpdateAcross(
  filter: QueryFilter,
  update: QueryFilter
) {
  const models = getPaymentModelsForQuery();
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

export async function findExpenseOneAndUpdateAcross(
  filter: QueryFilter,
  update: QueryFilter
) {
  const models = getExpenseModelsForQuery();
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

export async function findExpenseOneAndDeleteAcross(filter: QueryFilter) {
  const models = getExpenseModelsForQuery();
  for (const model of models) {
    const doc = await model.findOneAndDelete(filter as any).lean();
    if (doc) return doc;
  }
  return null;
}
