import mongoose from "mongoose";
import { STOCK_LOCATION } from "@/constants";
import { BadRequestError } from "@/lib/errors";
import {
  getLocationStockModelForDepartment,
  getStationMovementModelForDepartment,
} from "@/lib/department-movement";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";

function lineInvId(line: { inventoryItemId?: unknown }) {
  const raw =
    (line.inventoryItemId as { _id?: unknown } | undefined)?._id ?? line.inventoryItemId;
  if (raw instanceof mongoose.Types.ObjectId) return raw;
  if (raw == null) return null;
  try {
    return new mongoose.Types.ObjectId(String(raw));
  } catch {
    return null;
  }
}

/** Apply kitchen usage lines: deduct kitchen, add front house + main store, write ledger rows. */
export async function applyKitchenUsageStockEffects({
  doc,
  tenantId,
  branchId,
  department,
  userId,
}: {
  doc: { _id: mongoose.Types.ObjectId; lines?: unknown[] };
  tenantId: unknown;
  branchId: unknown;
  department: string;
  userId: unknown;
}) {
  const LocationStockModel = getLocationStockModelForDepartment(department);
  const InventoryItemModel = getInventoryItemModelForDepartment(department);
  const StationMovementModel = getStationMovementModelForDepartment(department);

  for (const line of (doc.lines ?? []) as any[]) {
    const invId = lineInvId(line);
    const usedQty = Number(line.usedQty ?? 0);
    const leftoverQty = Number(line.leftoverQty ?? 0);
    const unit = String(line.unit ?? "unit").trim();
    const itemName = String(line.itemName ?? "").trim();
    const totalDeduct = usedQty + leftoverQty;
    if (!invId || totalDeduct <= 0) continue;

    const locStock = await LocationStockModel.findOne({
      inventoryItemId: invId,
      location: STOCK_LOCATION.KITCHEN,
      tenantId,
      branchId,
      department,
    } as any);
    const kitchenPrev = locStock ? Number(locStock.quantity ?? 0) : 0;
    if (kitchenPrev < totalDeduct) {
      throw new BadRequestError(
        `Insufficient kitchen stock for ${itemName}. Available: ${kitchenPrev}, needed: ${totalDeduct}`
      );
    }
    if (locStock) {
      locStock.quantity = Math.max(0, kitchenPrev - totalDeduct);
      await locStock.save();
    }

    if (usedQty > 0) {
      let fh = await LocationStockModel.findOne({
        inventoryItemId: invId,
        location: STOCK_LOCATION.FRONT_HOUSE,
        tenantId,
        branchId,
        department,
      } as any);
      if (!fh) {
        fh = await LocationStockModel.create({
          tenantId,
          branchId,
          department,
          inventoryItemId: invId,
          location: STOCK_LOCATION.FRONT_HOUSE,
          quantity: usedQty,
          unit,
        } as any);
      } else {
        fh.quantity = Number(fh.quantity ?? 0) + usedQty;
        await fh.save();
      }
      await StationMovementModel.create({
        tenantId,
        branchId,
        department,
        kitchenUsageId: doc._id,
        inventoryItemId: invId,
        itemName,
        fromLocation: STOCK_LOCATION.KITCHEN,
        toLocation: STOCK_LOCATION.FRONT_HOUSE,
        quantity: usedQty,
        unit,
        usedQty,
        reason: `Kitchen usage: used in prep`,
        createdBy: userId,
      } as any);
    }

    if (leftoverQty > 0) {
      const item = await InventoryItemModel.findOne({
        _id: invId,
        tenantId,
        branchId,
      } as any);
      if (item) {
        item.currentStock = Number(item.currentStock ?? 0) + leftoverQty;
        await item.save();
      }
      await StationMovementModel.create({
        tenantId,
        branchId,
        department,
        kitchenUsageId: doc._id,
        inventoryItemId: invId,
        itemName,
        fromLocation: STOCK_LOCATION.KITCHEN,
        toLocation: STOCK_LOCATION.MAIN_STORE,
        quantity: leftoverQty,
        unit,
        leftoverQty,
        reason: `Kitchen usage: leftover returned`,
        createdBy: userId,
      } as any);
    }
  }
}

/** Undo stock + delete ledger rows for this kitchen usage (before delete or before re-applying on update). */
export async function reverseKitchenUsageStockEffects({
  doc,
  tenantId,
  branchId,
  department,
}: {
  doc: { _id: mongoose.Types.ObjectId; lines?: unknown[] };
  tenantId: unknown;
  branchId: unknown;
  department: string;
}) {
  const LocationStockModel = getLocationStockModelForDepartment(department);
  const InventoryItemModel = getInventoryItemModelForDepartment(department);
  const StationMovementModel = getStationMovementModelForDepartment(department);

  for (const line of (doc.lines ?? []) as any[]) {
    const invId = lineInvId(line);
    const usedQty = Number(line.usedQty ?? 0);
    const leftoverQty = Number(line.leftoverQty ?? 0);
    const unit = String(line.unit ?? "unit").trim();
    const itemName = String(line.itemName ?? "").trim();
    const totalReturn = usedQty + leftoverQty;
    if (!invId) continue;

    if (totalReturn > 0) {
      let locStock = await LocationStockModel.findOne({
        inventoryItemId: invId,
        location: STOCK_LOCATION.KITCHEN,
        tenantId,
        branchId,
        department,
      } as any);
      if (!locStock) {
        locStock = await LocationStockModel.create({
          tenantId,
          branchId,
          department,
          inventoryItemId: invId,
          location: STOCK_LOCATION.KITCHEN,
          quantity: totalReturn,
          unit,
        } as any);
      } else {
        locStock.quantity = Number(locStock.quantity ?? 0) + totalReturn;
        await locStock.save();
      }
    }

    if (usedQty > 0) {
      const fh = await LocationStockModel.findOne({
        inventoryItemId: invId,
        location: STOCK_LOCATION.FRONT_HOUSE,
        tenantId,
        branchId,
        department,
      } as any);
      const prev = fh ? Number(fh.quantity ?? 0) : 0;
      // Clamp only: "used" may already have left front house (e.g. sold). Reversing must not
      // block recipe edits/deletes; kitchen return above still restores the kitchen deduction.
      const next = Math.max(0, prev - usedQty);
      if (fh) {
        fh.quantity = next;
        await fh.save();
      }
    }

    if (leftoverQty > 0) {
      const item = await InventoryItemModel.findOne({
        _id: invId,
        tenantId,
        branchId,
      } as any);
      if (!item) {
        throw new BadRequestError(`Cannot reverse kitchen usage: inventory item missing for ${itemName}`);
      }
      const prev = Number(item.currentStock ?? 0);
      // Leftover return may already have been issued; clamp so reverses don't block.
      item.currentStock = Math.max(0, prev - leftoverQty);
      await item.save();
    }
  }

  await StationMovementModel.deleteMany({
    tenantId,
    branchId,
    department,
    kitchenUsageId: doc._id,
  } as any);
}
