import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  PRICING_RULE_TYPE,
  MODIFIER_TYPE,
  type PricingRuleType,
  type ModifierType,
} from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IPricingRule extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  roomCategoryId?: Schema.Types.ObjectId;
  name: string;
  type: PricingRuleType;
  startDate?: Date;
  endDate?: Date;
  daysOfWeek: number[];
  modifierType: ModifierType;
  modifierValue: number;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pricingRuleSchema = new Schema<IPricingRule>(
  {
    roomCategoryId: { type: Schema.Types.ObjectId, ref: "RoomCategory" },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: enumValues(PRICING_RULE_TYPE),
      required: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    modifierType: {
      type: String,
      enum: enumValues(MODIFIER_TYPE),
      required: true,
    },
    modifierValue: { type: Number, required: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pricingRuleSchema.plugin(tenantPlugin);
pricingRuleSchema.plugin(branchPlugin);

pricingRuleSchema.index({ tenantId: 1, branchId: 1 });
pricingRuleSchema.index({ tenantId: 1, branchId: 1, startDate: 1, endDate: 1 });

const PricingRule: Model<IPricingRule> =
  mongoose.models.PricingRule ||
  mongoose.model<IPricingRule>("PricingRule", pricingRuleSchema);

export default PricingRule;
