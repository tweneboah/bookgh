import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  SHIFT_TYPE,
  SHIFT_STATUS,
  type ShiftType,
  type ShiftStatus,
} from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IStaffShift extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  shiftDate: Date;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  status: ShiftStatus;
  swappedWith?: Schema.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffShiftSchema = new Schema<IStaffShift>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shiftDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    shiftType: {
      type: String,
      enum: enumValues(SHIFT_TYPE),
      required: true,
    },
    status: {
      type: String,
      enum: enumValues(SHIFT_STATUS),
      default: SHIFT_STATUS.SCHEDULED,
    },
    swappedWith: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

staffShiftSchema.plugin(tenantPlugin);
staffShiftSchema.plugin(branchPlugin);

staffShiftSchema.index({ tenantId: 1, branchId: 1, userId: 1 });
staffShiftSchema.index({ tenantId: 1, branchId: 1, shiftDate: 1 });

const StaffShift: Model<IStaffShift> =
  mongoose.models.StaffShift ||
  mongoose.model<IStaffShift>("StaffShift", staffShiftSchema);

export default StaffShift;
