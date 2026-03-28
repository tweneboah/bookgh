import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createItemYieldSchema } from "@/validations/restaurant";
import ItemYield from "@/models/restaurant/ItemYield";
import "@/models/restaurant/RestaurantUnit";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";

const SORT_FIELDS = ["createdAt", "fromQty", "toQty"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const inventoryItemId = req.nextUrl.searchParams.get("inventoryItemId");

    getInventoryItemModelForDepartment("restaurant");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (inventoryItemId) filter.inventoryItemId = inventoryItemId;

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = ItemYield.find(filter)
      .populate("fromUnitId", "name abbreviation type")
      .populate("toUnitId", "name abbreviation type")
      .populate({
        path: "inventoryItemId",
        select: "name unit category",
        model: getInventoryItemModelForDepartment("restaurant"),
      })
      .sort(sortObj);
    const countQuery = ItemYield.countDocuments(filter);
    const result = await paginate(query, countQuery, { page, limit, sort });
    console.log(
      "[ITEM-YIELDS][GET] count:",
      result.items.length,
      "sample:",
      result.items.slice(0, 3).map((i: any) => ({
        id: String(i?._id),
        inventoryItemId: String(i?.inventoryItemId?._id ?? i?.inventoryItemId),
        fromQty: i?.fromQty,
        baseUnitQty: i?.baseUnitQty,
        toQty: i?.toQty,
      }))
    );

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    console.log("[ITEM-YIELDS][POST] body:", body);
    const data = createItemYieldSchema.parse(body);
    const RestaurantInventory = getInventoryItemModelForDepartment("restaurant");

    // Keep inventory unitConversions in sync so future chef units always have a base-unit path.
    const [inventoryItem, fromUnitDoc] = await Promise.all([
      RestaurantInventory.findOne({ _id: data.inventoryItemId, tenantId, branchId } as any),
      (await import("@/models/restaurant/RestaurantUnit")).default.findById(data.fromUnitId).lean(),
    ]);

    if (inventoryItem && fromUnitDoc && data.fromQty > 0 && data.baseUnitQty > 0) {
      const factor = Number((data.baseUnitQty / data.fromQty).toFixed(8));
      const aliases = [
        String((fromUnitDoc as any).name ?? "").trim(),
        String((fromUnitDoc as any).abbreviation ?? "").trim(),
      ]
        .map((v) => v.toLowerCase())
        .filter(Boolean);

      const existing = Array.isArray((inventoryItem as any).unitConversions)
        ? (inventoryItem as any).unitConversions
        : [];
      const filtered = existing.filter(
        (c: any) => !aliases.includes(String(c?.unit ?? "").trim().toLowerCase())
      );
      (inventoryItem as any).unitConversions = [
        ...filtered,
        ...aliases.map((alias) => ({ unit: alias, factor })),
      ];
      await inventoryItem.save();
    }

    const doc = await ItemYield.create({
      ...data,
      effectiveFrom: data.effectiveFrom
        ? new Date(data.effectiveFrom)
        : undefined,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    const populated = await ItemYield.findById(doc._id)
      .populate("fromUnitId", "name abbreviation type")
      .populate("toUnitId", "name abbreviation type")
      .populate({
        path: "inventoryItemId",
        select: "name unit category",
        model: getInventoryItemModelForDepartment("restaurant"),
      });

    console.log("[ITEM-YIELDS][POST] saved:", {
      id: String(populated?._id),
      fromQty: (populated as any)?.fromQty,
      baseUnitQty: (populated as any)?.baseUnitQty,
      toQty: (populated as any)?.toQty,
    });
    return createdResponse(populated!.toObject());
  },
  { auth: true }
);
