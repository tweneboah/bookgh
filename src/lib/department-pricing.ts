import mongoose, { type Model } from "mongoose";
import { DEPARTMENT, type Department } from "@/constants";
import PricingRule, { type IPricingRule } from "@/models/room/PricingRule";

function pascalCase(value: string): string {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizePricingDepartment(input?: string | null): Department | "" {
  if (!input) return "";
  const raw = input === "accomodation" ? "accommodation" : input;
  const valid = Object.values(DEPARTMENT);
  return (valid.includes(raw as Department) ? raw : "") as Department | "";
}

export function getPricingRuleModelForDepartment(
  input?: string | null
): Model<IPricingRule> {
  const department = normalizePricingDepartment(input);
  if (!department) return PricingRule;
  const modelName = `PricingRule${pascalCase(department)}`;
  const existing = mongoose.models[modelName] as Model<IPricingRule> | undefined;
  if (existing) return existing;
  return mongoose.model<IPricingRule>(
    modelName,
    PricingRule.schema.clone(),
    `pricing_rules_${department}`
  );
}
