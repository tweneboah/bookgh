import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  PROCUREMENT_ORDER_STATUS,
  type ProcurementOrderStatus,
  DEPARTMENT,
  type Department,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IPurchaseOrderLine {
  inventoryItemId?: Schema.Types.ObjectId;
  itemName: string;
  quantity: number;
  receivedQuantity?: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface IPurchaseOrder extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  poNumber: string;
  supplierId: Schema.Types.ObjectId;
  orderDate: Date;
  expectedDate?: Date;
  receivedDate?: Date;
  requestedBy: Schema.Types.ObjectId;
  approvedBy?: Schema.Types.ObjectId;
  sourceDepartment: Department;
  lines: IPurchaseOrderLine[];
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  status: ProcurementOrderStatus;
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IPurchaseOrderLine>(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    receivedQuantity: { type: Number, min: 0, default: 0 },
    unit: { type: String, required: true, trim: true },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    orderDate: { type: Date, required: true },
    expectedDate: { type: Date },
    receivedDate: { type: Date },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    sourceDepartment: {
      type: String,
      enum: enumValues(DEPARTMENT),
      default: DEPARTMENT.INVENTORY_PROCUREMENT,
    },
    lines: { type: [lineSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: enumValues(PROCUREMENT_ORDER_STATUS),
      default: PROCUREMENT_ORDER_STATUS.DRAFT,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

purchaseOrderSchema.plugin(tenantPlugin);
purchaseOrderSchema.plugin(branchPlugin);
purchaseOrderSchema.plugin(createdByPlugin);

purchaseOrderSchema.index({ tenantId: 1, branchId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ tenantId: 1, branchId: 1, status: 1 });
purchaseOrderSchema.index({ tenantId: 1, branchId: 1, supplierId: 1 });

const PurchaseOrder: Model<IPurchaseOrder> =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema);

export default PurchaseOrder;
