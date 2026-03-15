import mongoose from "mongoose";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import RoomCharge from "@/models/booking/RoomCharge";
import { getPosMenuItemModelForDepartment } from "@/lib/department-pos";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
  normalizeInventoryDepartment,
} from "@/lib/department-inventory";
import { getRecipeModelForDepartment } from "@/lib/department-restaurant";
import { convertToBaseUnitQuantity } from "@/lib/unit-conversion";
import {
  DEPARTMENT,
  BOOKING_STATUS,
  INVOICE_STATUS,
  INVENTORY_MOVEMENT_TYPE,
  MODIFIER_TYPE,
  ROOM_CHARGE_TYPE,
} from "@/constants";
import { getPricingRuleModelForDepartment } from "@/lib/department-pricing";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";

type OrderItemInput = {
  menuItemId: string | mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

function isRuleActiveForDate(rule: {
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[];
}) {
  const now = new Date();
  if (rule.startDate && now < new Date(rule.startDate)) return false;
  if (rule.endDate && now > new Date(rule.endDate)) return false;
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    return rule.daysOfWeek.includes(now.getDay());
  }
  return true;
}

function applyModifier(amount: number, rule: { modifierType: string; modifierValue: number }) {
  if (rule.modifierType === MODIFIER_TYPE.PERCENTAGE) {
    return amount - amount * (rule.modifierValue / 100);
  }
  return amount - rule.modifierValue;
}

export async function resolveBarOrderPricing(input: {
  tenantId: string;
  branchId: string;
  items: OrderItemInput[];
  department?: string | null;
}) {
  const PricingRuleModel = getPricingRuleModelForDepartment(input.department);
  const activeRules = await PricingRuleModel.find({
    tenantId: input.tenantId,
    branchId: input.branchId,
    isActive: true,
  } as any)
    .sort({ priority: -1 })
    .lean();

  const appliedRule = activeRules.find(
    (rule: any) =>
      rule.type === "special" &&
      typeof rule.name === "string" &&
      isRuleActiveForDate(rule)
  ) as
    | {
        _id: mongoose.Types.ObjectId;
        name: string;
        modifierType: string;
        modifierValue: number;
      }
    | undefined;

  const pricedItems = input.items.map((item) => {
    const baseAmount = item.quantity * item.unitPrice;
    if (!appliedRule) {
      return {
        ...item,
        amount: Number(baseAmount.toFixed(2)),
      };
    }
    const discounted = Math.max(0, applyModifier(baseAmount, appliedRule));
    return {
      ...item,
      amount: Number(discounted.toFixed(2)),
    };
  });

  const subtotal = Number(
    pricedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
  );
  const tax = 0;
  const totalAmount = Number(subtotal.toFixed(2));

  return {
    items: pricedItems,
    subtotal,
    tax,
    totalAmount,
    appliedRule: appliedRule
      ? { id: String(appliedRule._id), name: appliedRule.name }
      : null,
  };
}

async function buildRecipeRequirementMap(input: {
  tenantId: string;
  branchId: string;
  items: OrderItemInput[];
  department?: string | null;
}) {
  const department = normalizeInventoryDepartment(
    input.department,
    DEPARTMENT.BAR
  );
  const MenuItemModel = getPosMenuItemModelForDepartment(department);
  const RecipeModel = getRecipeModelForDepartment(department);
  const menuIds = input.items.map((item) => String(item.menuItemId));
  const menuItems = await MenuItemModel.find({
    _id: { $in: menuIds },
    tenantId: input.tenantId,
    branchId: input.branchId,
  } as any).lean();
  const recipeDocs = await RecipeModel.find({
    tenantId: input.tenantId,
    branchId: input.branchId,
    menuItemId: { $in: menuIds },
  } as any)
    .select("menuItemId ingredients")
    .lean();

  const menuMap = new Map(menuItems.map((item: any) => [String(item._id), item]));
  const recipeMap = new Map(
    recipeDocs.map((recipe: any) => [String(recipe.menuItemId), recipe])
  );
  const rawRequirementMap = new Map<string, { requiredQty: number; unit: string }>();

  for (const item of input.items) {
    const menuItem = menuMap.get(String(item.menuItemId));
    if (!menuItem) {
      throw new NotFoundError(`Menu item ${String(item.menuItemId)}`);
    }
    const activeRecipe =
      Array.isArray(menuItem.recipe) && menuItem.recipe.length > 0
        ? menuItem.recipe
        : recipeMap.get(String(menuItem._id))?.ingredients ?? [];
    if (!Array.isArray(activeRecipe) || activeRecipe.length === 0) continue;

    for (const ingredient of activeRecipe) {
      const key = String(ingredient.inventoryItemId);
      const existing = rawRequirementMap.get(key);
      const ingredientRequired = Number(ingredient.quantity) * Number(item.quantity);
      rawRequirementMap.set(key, {
        requiredQty: Number(
          ((existing?.requiredQty ?? 0) + ingredientRequired).toFixed(4)
        ),
        unit: String(ingredient.unit ?? "unit"),
      });
    }
  }

  const inventoryIds = Array.from(rawRequirementMap.keys());
  if (!inventoryIds.length) return rawRequirementMap;
  const InventoryItemModel = getInventoryItemModelForDepartment(department);
  const inventoryItems = await InventoryItemModel.find({
    _id: { $in: inventoryIds },
    tenantId: input.tenantId,
    branchId: input.branchId,
  } as any).lean();
  const inventoryMap = new Map(inventoryItems.map((row: any) => [String(row._id), row]));
  const normalizedRequirementMap = new Map<string, { requiredQty: number; unit: string }>();

  for (const [inventoryId, requirement] of rawRequirementMap.entries()) {
    const item = inventoryMap.get(inventoryId);
    if (!item) throw new NotFoundError(`Inventory item ${inventoryId}`);
    const converted = convertToBaseUnitQuantity({
      item,
      quantity: requirement.requiredQty,
      enteredUnit: requirement.unit,
    });
    if (!converted) {
      const hint =
        item.unit === "unit" && requirement.unit === "ml" && !(item as any).volumeMl
          ? " For items tracked in 'unit', add Volume (ml) on the inventory item to allow ml in recipes, or use unit in the recipe."
          : ` Use the inventory item's base unit (${item.unit}) in the menu recipe.`;
      throw new BadRequestError(
        `Unit '${requirement.unit}' is not configured for ${item.name}. Base unit is ${item.unit}.${hint}`
      );
    }
    normalizedRequirementMap.set(inventoryId, {
      requiredQty: converted.baseQuantity,
      unit: String(item.unit ?? "unit"),
    });
  }

  return normalizedRequirementMap;
}

export async function ensureSufficientBarStock(input: {
  tenantId: string;
  branchId: string;
  items: OrderItemInput[];
  department?: string | null;
}) {
  const requirementMap = await buildRecipeRequirementMap(input);
  const inventoryIds = Array.from(requirementMap.keys());
  if (inventoryIds.length === 0) return;
  const department = normalizeInventoryDepartment(
    input.department,
    DEPARTMENT.BAR
  );
  const InventoryItemModel = getInventoryItemModelForDepartment(department);

  const inventory = await InventoryItemModel.find({
    _id: { $in: inventoryIds },
    tenantId: input.tenantId,
    branchId: input.branchId,
  } as any).lean();
  const inventoryMap = new Map(inventory.map((item: any) => [String(item._id), item]));

  for (const [inventoryId, requirement] of requirementMap.entries()) {
    const item = inventoryMap.get(inventoryId);
    if (!item) throw new NotFoundError(`Inventory item ${inventoryId}`);
    if (Number(item.currentStock ?? 0) < requirement.requiredQty) {
      throw new BadRequestError(
        `Insufficient stock for ${item.name}. Required ${requirement.requiredQty}, available ${item.currentStock}.`
      );
    }
  }
}

export async function applyInventoryMovementsForOrder(input: {
  tenantId: string;
  branchId: string;
  department?: string | null;
  userId: string;
  orderId: string;
  shiftId?: string;
  items: OrderItemInput[];
  movementType: "sale" | "reversal";
  reason?: string;
  allowNegativeStock?: boolean;
}) {
  const requirementMap = await buildRecipeRequirementMap({
    tenantId: input.tenantId,
    branchId: input.branchId,
    items: input.items,
    department: input.department,
  });
  const department = normalizeInventoryDepartment(
    input.department,
    DEPARTMENT.BAR
  );
  const InventoryItemModel = getInventoryItemModelForDepartment(department);
  const InventoryMovementModel = getInventoryMovementModelForDepartment(department);

  for (const [inventoryItemId, requirement] of requirementMap.entries()) {
    const inventory = await InventoryItemModel.findOne({
      _id: inventoryItemId,
      tenantId: input.tenantId,
      branchId: input.branchId,
    } as any);
    if (!inventory) throw new NotFoundError(`Inventory item ${inventoryItemId}`);

    const previousStock = Number(inventory.currentStock ?? 0);
    let resultingStock = previousStock;

    if (input.movementType === "sale") {
      resultingStock = Number((previousStock - requirement.requiredQty).toFixed(4));
      if (resultingStock < 0 && !input.allowNegativeStock) {
        throw new BadRequestError(
          `Stock cannot go negative for ${inventory.name}. Required ${requirement.requiredQty}, available ${previousStock}.`
        );
      }
    } else {
      resultingStock = Number((previousStock + requirement.requiredQty).toFixed(4));
    }

    inventory.currentStock = resultingStock;
    await inventory.save();

    await InventoryMovementModel.create({
      tenantId: input.tenantId,
      branchId: input.branchId,
      inventoryItemId,
      orderId: input.orderId,
      shiftId: input.shiftId,
      movementType:
        input.movementType === "sale"
          ? INVENTORY_MOVEMENT_TYPE.SALE
          : INVENTORY_MOVEMENT_TYPE.REVERSAL,
      quantity: requirement.requiredQty,
      unit: requirement.unit,
      previousStock,
      resultingStock,
      reason: input.reason,
      createdBy: input.userId,
      metadata: {
        source: `${department}-order`,
      },
    } as any);
  }
}

function generateInvoiceNumber(): string {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function postBarOrderToRoomBill(input: {
  tenantId: string;
  branchId: string;
  department?: string;
  userId: string;
  order: {
    _id: mongoose.Types.ObjectId | string;
    orderNumber: string;
    bookingId?: mongoose.Types.ObjectId | string;
    guestId?: mongoose.Types.ObjectId | string;
    totalAmount: number;
  };
}) {
  if (!input.order.bookingId) {
    throw new BadRequestError("Booking is required to post BAR order to room bill");
  }

  const department = input.department ?? "bar";
  const departmentLabel = String(department).toUpperCase();
  const InvoiceModel = getInvoiceModelForDepartment(department);

  const booking = await Booking.findOne({
    _id: input.order.bookingId,
    tenantId: input.tenantId,
    branchId: input.branchId,
  } as any).lean();

  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== BOOKING_STATUS.CHECKED_IN) {
    throw new BadRequestError("Only checked-in bookings can receive room charges");
  }

  const charge = await RoomCharge.create({
    tenantId: input.tenantId,
    branchId: input.branchId,
    bookingId: booking._id,
    guestId: booking.guestId,
    chargeType: ROOM_CHARGE_TYPE.OTHER,
    description: `${departmentLabel} order ${input.order.orderNumber}`,
    unitPrice: Number(input.order.totalAmount),
    quantity: 1,
    totalAmount: Number(input.order.totalAmount),
    addedBy: input.userId,
  } as any);

  const lineItem = {
    description: `${departmentLabel} order ${input.order.orderNumber}`,
    category: `roomCharge:${String(charge._id)}`,
    quantity: 1,
    unitPrice: Number(input.order.totalAmount),
    amount: Number(input.order.totalAmount),
  };

  let invoice = await InvoiceModel.findOne({
    tenantId: input.tenantId,
    branchId: input.branchId,
    bookingId: booking._id,
    status: INVOICE_STATUS.DRAFT,
    notes: "Auto-updated from room charges",
  } as any);

  if (!invoice) {
    let invoiceNumber = generateInvoiceNumber();
    let exists = await InvoiceModel.exists({
      tenantId: input.tenantId,
      branchId: input.branchId,
      invoiceNumber,
    } as any);
    while (exists) {
      invoiceNumber = generateInvoiceNumber();
      exists = await InvoiceModel.exists({
        tenantId: input.tenantId,
        branchId: input.branchId,
        invoiceNumber,
      } as any);
    }

    invoice = await InvoiceModel.create({
      tenantId: input.tenantId,
      branchId: input.branchId,
      department,
      bookingId: booking._id,
      guestId: booking.guestId,
      invoiceNumber,
      items: [lineItem],
      subtotal: Number(input.order.totalAmount),
      totalAmount: Number(input.order.totalAmount),
      paidAmount: 0,
      status: INVOICE_STATUS.DRAFT,
      notes: "Auto-updated from room charges",
      createdBy: input.userId,
    } as any);
  } else {
    const items = [...(invoice.items ?? []), lineItem as any];
    const subtotal = Number(
      items.reduce((sum, item: any) => sum + (item.amount ?? 0), 0).toFixed(2)
    );
    invoice.items = items as any;
    invoice.subtotal = subtotal;
    invoice.totalAmount = subtotal;
    await invoice.save();
  }

  return { chargeId: String(charge._id), invoiceId: String(invoice._id) };
}
