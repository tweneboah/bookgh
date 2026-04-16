import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { updateRestaurantUnitSchema } from "@/validations/restaurant";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import RestaurantUnit from "@/models/restaurant/RestaurantUnit";
import ItemYield from "@/models/restaurant/ItemYield";
import { normalizeInventoryDepartment } from "@/lib/department-inventory";
import { DEPARTMENT } from "@/constants";

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const department = normalizeInventoryDepartment(
      req.nextUrl.searchParams.get("department"),
      DEPARTMENT.RESTAURANT
    );
    const body = await req.json();
    const data = updateRestaurantUnitSchema.parse(body);

    const doc = await RestaurantUnit.findOneAndUpdate(
      { _id: id, tenantId, branchId, department },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!doc) throw new NotFoundError("Restaurant unit");

    return successResponse(doc.toObject());
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const department = normalizeInventoryDepartment(
      req.nextUrl.searchParams.get("department"),
      DEPARTMENT.RESTAURANT
    );

    const usedInYield = await ItemYield.countDocuments({
      tenantId,
      branchId,
      department,
      $or: [{ fromUnitId: id }, { toUnitId: id }],
    });
    if (usedInYield > 0) {
      throw new BadRequestError(
        "Cannot delete this unit — it is used in yield mappings. Deactivate it instead."
      );
    }

    const doc = await RestaurantUnit.findOneAndDelete({
      _id: id,
      tenantId,
      branchId,
      department,
    });
    if (!doc) throw new NotFoundError("Restaurant unit");

    return successResponse({ deleted: true });
  },
  { auth: true }
);
