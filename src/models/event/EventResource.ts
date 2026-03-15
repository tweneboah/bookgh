import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  EVENT_RESOURCE_TYPE,
  RESOURCE_CONDITION,
  RESOURCE_PRICE_UNIT,
  type EventResourceType,
  type ResourceCondition,
  type ResourcePriceUnit,
} from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IEventResource extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  type: EventResourceType;
  description?: string;
  quantity: number;
  unitPrice?: number;
  /** How unitPrice is applied: perUnit (per item), perHour, or perDay */
  priceUnit?: ResourcePriceUnit;
  isAvailable: boolean;
  condition: ResourceCondition;
  createdAt: Date;
  updatedAt: Date;
}

const eventResourceSchema = new Schema<IEventResource>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: enumValues(EVENT_RESOURCE_TYPE),
      required: true,
    },
    description: { type: String },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number },
    priceUnit: {
      type: String,
      enum: enumValues(RESOURCE_PRICE_UNIT),
      default: RESOURCE_PRICE_UNIT.PER_HOUR,
    },
    isAvailable: { type: Boolean, default: true },
    condition: {
      type: String,
      enum: enumValues(RESOURCE_CONDITION),
      default: RESOURCE_CONDITION.GOOD,
    },
  },
  { timestamps: true }
);

eventResourceSchema.plugin(tenantPlugin);
eventResourceSchema.plugin(branchPlugin);

eventResourceSchema.index({ tenantId: 1, branchId: 1 });
eventResourceSchema.index({ tenantId: 1, branchId: 1, type: 1 });

const EventResource: Model<IEventResource> =
  mongoose.models.EventResource ||
  mongoose.model<IEventResource>("EventResource", eventResourceSchema);

export default EventResource;
