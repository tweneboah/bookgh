import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { updateItemYieldSchema } from "@/validations/restaurant";
import { NotFoundError } from "@/lib/errors";
import ItemYield from "@/models/restaurant/ItemYield";
import "@/models/restaurant/RestaurantUnit";
import {
  getInventoryItemModelForDepartment,
  normalizeInventoryDepartment,
} from "@/lib/department-inventory";
import { DEPARTMENT } from "@/constants";

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const body = await req.json();
    console.log("[ITEM-YIELDS][PATCH] id:", id, "body:", body);
    const data = updateItemYieldSchema.parse(body);
    const requestedDepartment = normalizeInventoryDepartment(
      (data as any).department ?? req.nextUrl.searchParams.get("department"),
      DEPARTMENT.RESTAURANT
    );

    const existing = await ItemYield.findOne({
      _id: id,
      tenantId,
      branchId,
      department: requestedDepartment,
    }).lean();
    if (!existing) throw new NotFoundError("Item yield mapping");

    const mergedFromQty = data.fromQty ?? Number((existing as any).fromQty ?? 0);
    const mergedBaseUnitQty = data.baseUnitQty ?? Number((existing as any).baseUnitQty ?? 0);
    const mergedFromUnitId = String(data.fromUnitId ?? (existing as any).fromUnitId ?? "");
    const mergedInventoryItemId = String(
      data.inventoryItemId ?? (existing as any).inventoryItemId ?? ""
    );

    const update: Record<string, unknown> = { ...data };
    if (data.effectiveFrom) update.effectiveFrom = new Date(data.effectiveFrom);
    if (data.effectiveTo) update.effectiveTo = new Date(data.effectiveTo);

    const scopedDepartment = String((existing as any).department ?? DEPARTMENT.RESTAURANT);
    const DepartmentInventory = getInventoryItemModelForDepartment(scopedDepartment);
    const doc = await ItemYield.findOneAndUpdate(
      { _id: id, tenantId, branchId, department: scopedDepartment },
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate("fromUnitId", "name abbreviation type")
      .populate("toUnitId", "name abbreviation type")
      .populate({
        path: "inventoryItemId",
        select: "name unit category",
        model: DepartmentInventory,
      });

    if (!doc) throw new NotFoundError("Item yield mapping");
    console.log("[ITEM-YIELDS][PATCH] saved:", {
      id: String(doc._id),
      fromQty: (doc as any).fromQty,
      baseUnitQty: (doc as any).baseUnitQty,
      toQty: (doc as any).toQty,
    });

    // Keep inventory unitConversions in sync for durable future chef-unit conversions.
    if (mergedFromQty > 0 && mergedBaseUnitQty > 0) {
      const [inventoryItem, fromUnitDoc] = await Promise.all([
        DepartmentInventory.findOne({
          _id: mergedInventoryItemId,
          tenantId,
          branchId,
        } as any),
        (await import("@/models/restaurant/RestaurantUnit")).default
          .findById(mergedFromUnitId)
          .lean(),
      ]);

      if (inventoryItem && fromUnitDoc) {
        const factor = Number((mergedBaseUnitQty / mergedFromQty).toFixed(8));
        const aliases = [
          String((fromUnitDoc as any).name ?? "").trim(),
          String((fromUnitDoc as any).abbreviation ?? "").trim(),
        ]
          .map((v) => v.toLowerCase())
          .filter(Boolean);
        const existingConversions = Array.isArray((inventoryItem as any).unitConversions)
          ? (inventoryItem as any).unitConversions
          : [];
        const filtered = existingConversions.filter(
          (c: any) => !aliases.includes(String(c?.unit ?? "").trim().toLowerCase())
        );
        (inventoryItem as any).unitConversions = [
          ...filtered,
          ...aliases.map((alias) => ({ unit: alias, factor })),
        ];
        await inventoryItem.save();
      }
    }

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

    const doc = await ItemYield.findOneAndDelete({
      _id: id,
      tenantId,
      branchId,
      department,
    });
    if (!doc) throw new NotFoundError("Item yield mapping");

    return successResponse({ deleted: true });
  },
  { auth: true }
);
