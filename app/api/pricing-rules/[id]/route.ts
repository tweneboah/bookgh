import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import { updatePricingRuleSchema } from "@/validations/room";
import {
  getPricingRuleModelForDepartment,
  normalizePricingDepartment,
} from "@/lib/department-pricing";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePricingDepartment(
      _req.nextUrl.searchParams.get("department")
    );
    const PricingRuleModel = getPricingRuleModelForDepartment(department);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pricing rule");
    }

    const pricingRule = await PricingRuleModel.findById(id)
      .populate("roomCategoryId")
      .lean();

    if (
      !pricingRule ||
      String(pricingRule.tenantId) !== tenantId ||
      String(pricingRule.branchId) !== branchId
    ) {
      throw new NotFoundError("Pricing rule");
    }

    return successResponse(pricingRule);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePricingDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PricingRuleModel = getPricingRuleModelForDepartment(department);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pricing rule");
    }

    const body = await req.json();
    const data = updatePricingRuleSchema.parse(body);

    const existingForUpdate = await PricingRuleModel.findById(id)
      .select("tenantId branchId")
      .lean();
    if (
      !existingForUpdate ||
      String(existingForUpdate.tenantId) !== tenantId ||
      String(existingForUpdate.branchId) !== branchId
    ) {
      throw new NotFoundError("Pricing rule");
    }

    const pricingRule = await PricingRuleModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate("roomCategoryId")
      .lean();

    return successResponse(pricingRule!);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePricingDepartment(
      _req.nextUrl.searchParams.get("department")
    );
    const PricingRuleModel = getPricingRuleModelForDepartment(department);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pricing rule");
    }

    const existingForDelete = await PricingRuleModel.findById(id)
      .select("tenantId branchId")
      .lean();
    if (
      !existingForDelete ||
      String(existingForDelete.tenantId) !== tenantId ||
      String(existingForDelete.branchId) !== branchId
    ) {
      throw new NotFoundError("Pricing rule");
    }

    await PricingRuleModel.findByIdAndDelete(id);
    return noContentResponse();
  },
  { auth: true }
);
