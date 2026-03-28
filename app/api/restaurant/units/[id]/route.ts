import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { updateRestaurantUnitSchema } from "@/validations/restaurant";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import RestaurantUnit from "@/models/restaurant/RestaurantUnit";
import ItemYield from "@/models/restaurant/ItemYield";

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const body = await req.json();
    const data = updateRestaurantUnitSchema.parse(body);

    const doc = await RestaurantUnit.findOneAndUpdate(
      { _id: id, tenantId, branchId },
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

    const usedInYield = await ItemYield.countDocuments({
      tenantId,
      branchId,
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
    });
    if (!doc) throw new NotFoundError("Restaurant unit");

    return successResponse({ deleted: true });
  },
  { auth: true }
);
