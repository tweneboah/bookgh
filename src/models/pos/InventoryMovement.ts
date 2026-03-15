import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  INVENTORY_MOVEMENT_TYPE,
  type InventoryMovementType,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IInventoryMovement extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  inventoryItemId: Schema.Types.ObjectId;
  orderId?: Schema.Types.ObjectId;
  shiftId?: Schema.Types.ObjectId;
  movementType: InventoryMovementType;
  quantity: number;
  unit: string;
  previousStock: number;
  resultingStock: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: "POSOrder" },
    shiftId: { type: Schema.Types.ObjectId, ref: "BarShift" },
    movementType: {
      type: String,
      enum: enumValues(INVENTORY_MOVEMENT_TYPE),
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, default: "unit" },
    previousStock: { type: Number, required: true, min: 0 },
    resultingStock: { type: Number, required: true, min: 0 },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

inventoryMovementSchema.plugin(tenantPlugin);
inventoryMovementSchema.plugin(branchPlugin);
inventoryMovementSchema.plugin(createdByPlugin);

inventoryMovementSchema.index({ tenantId: 1, branchId: 1, inventoryItemId: 1 });
inventoryMovementSchema.index({ tenantId: 1, branchId: 1, movementType: 1 });
inventoryMovementSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
inventoryMovementSchema.index({ tenantId: 1, branchId: 1, orderId: 1 });

const InventoryMovement: Model<IInventoryMovement> =
  mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovement>("InventoryMovement", inventoryMovementSchema);

export default InventoryMovement;
